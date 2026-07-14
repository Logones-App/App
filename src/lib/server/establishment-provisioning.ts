import { p256 } from "@noble/curves/nist.js";

import { signJet } from "@/lib/nf525/sign-jet";
import { generateSlug } from "@/lib/slug";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Provisioning partagé d'un établissement (seeds par défaut + compte tablette).
 * Utilisé par la création admin (`/api/admin/.../establishments`) et la conversion de
 * lead (`/api/leads/[id]/convert`) pour garantir des établissements identiques quel que
 * soit le point d'entrée. La création de la ligne `establishments` reste propre à chaque
 * route (payloads différents) ; tout le reste passe par ici.
 */

type Svc = ReturnType<typeof createServiceClient>;

export type VatRateSeed = { name: string; value: number };

/** Taux de TVA standard FR, seedés au niveau ORG à la création d'une organisation (5,5 / 10 / 20). */
export const DEFAULT_ORG_VAT_RATES: VatRateSeed[] = [
  { name: "TVA 5.5%", value: 5.5 },
  { name: "TVA 10%", value: 10 },
  { name: "TVA 20%", value: 20 },
];

/**
 * Paire de signature NF525 ECDSA P-256 (§6.11.3) : privée = scalaire brut 32 o base64,
 * publique = point compressé 33 o base64. Encodage identique au POS (interop KAT verrouillée).
 */
function generateNf525KeyPair(): { privateKeyBase64: string; publicKeyBase64: string } {
  const priv = p256.utils.randomSecretKey();
  const pub = p256.getPublicKey(priv, true); // compressé 33 o
  return {
    privateKeyBase64: Buffer.from(priv).toString("base64"),
    publicKeyBase64: Buffer.from(pub).toString("base64"),
  };
}

/**
 * Mot de passe tablette : court et lisible (10 caractères, alphabet sans I/l/O/0/1),
 * facile à ressaisir sur une tablette si le QR n'est pas scannable.
 */
export function generateTabletPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet.charAt(b % alphabet.length)).join("");
}

/** Slug unique (base + suffixes numériques, fallback aléatoire). */
export async function generateEstablishmentSlug(svc: Svc, name: string): Promise<string> {
  const base = generateSlug(name);
  const candidates = [base, ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 1}`)];
  const { data } = await svc.from("establishments").select("slug").in("slug", candidates);
  const taken = new Set((data ?? []).map((r) => r.slug).filter(Boolean));
  return candidates.find((c) => !taken.has(c)) ?? `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

async function insertNf525Key(svc: Svc, estId: string, orgId: string): Promise<void> {
  // NF525 §6.11.3 : tout nouvel établissement est signé en ECDSA P-256 (asymétrique).
  // signing_key_base64 laissé NULL (HMAC obsolète, colonne nullable + contrainte material_chk).
  const { privateKeyBase64, publicKeyBase64 } = generateNf525KeyPair();
  const { error } = await svc.from("nf525_signing_keys").insert({
    establishment_id: estId,
    organization_id: orgId,
    algo: "ecdsa-p256",
    private_key_base64: privateKeyBase64,
    public_key_base64: publicKeyBase64,
  });
  if (error) throw error;
}

async function insertDefaultPaymentMethods(svc: Svc, estId: string, orgId: string): Promise<void> {
  const { error } = await svc.from("payment_methods").insert([
    {
      establishment_id: estId,
      organization_id: orgId,
      payment_method_name: "Carte",
      payment_method_type: "card",
      deleted: false,
      is_active: true,
    },
    {
      establishment_id: estId,
      organization_id: orgId,
      payment_method_name: "Espèces",
      payment_method_type: "cash",
      deleted: false,
      is_active: true,
    },
  ]);
  if (error) throw error;
}

async function insertDefaultMenu(svc: Svc, estId: string, orgId: string): Promise<void> {
  const { error } = await svc.from("menus").insert({
    name: "Carte principale",
    establishment_id: estId,
    organization_id: orgId,
    is_active: true,
    is_public: true, // visible sur la carte publique (menu → produits lisibles par anon)
    deleted: false,
    display_order: 1,
  });
  if (error) throw error;
}

/** Une salle « Salle » + une table « Table 1 » de 4 couverts, positionnée pour l'éditeur de plan. */
async function insertDefaultRoomAndTable(svc: Svc, estId: string, orgId: string): Promise<void> {
  const { data: room, error: roomErr } = await svc
    .from("rooms")
    .insert({ name: "Salle", establishment_id: estId, organization_id: orgId, deleted: false })
    .select("id")
    .single();
  if (roomErr) throw roomErr;

  const { error: tableErr } = await svc.from("tables").insert({
    name: "Table 1",
    room_id: room.id,
    establishment_id: estId,
    organization_id: orgId,
    seats: 4,
    deleted: false,
    x: 50,
    y: 100,
    width: 80,
    height: 80,
    rotation: 0,
  });
  if (tableErr) throw tableErr;
}

/**
 * Taux de TVA au niveau ORGANISATION (scope org). Idempotent : ne seede que si l'org n'a pas encore de
 * taux — le 1er établissement d'une org pose le jeu, les suivants n'y touchent pas. Voir
 * PLAN_VAT_ORG_SCOPING.md.
 */
export async function ensureOrgVatRates(svc: Svc, orgId: string, rates: VatRateSeed[]): Promise<void> {
  const { data: existing } = await svc
    .from("vat_rate")
    .select("id")
    .eq("organization_id", orgId)
    .eq("deleted", false)
    .limit(1);
  if (existing && existing.length > 0) return; // l'org a déjà ses taux
  const filtered = rates.filter((r) => r.value > 0);
  if (filtered.length === 0) return;
  const rows = filtered.map((r) => ({ organization_id: orgId, name: r.name, value: r.value }));
  const { error } = await svc.from("vat_rate").insert(rows);
  if (error) throw error;
}

/**
 * Seed HACCP de config par défaut (zones, sondes, surfaces, bains, checklists, documents).
 * Reprend le jeu de démo. Best-effort : une erreur ici ne doit pas bloquer la création
 * de l'établissement (config non critique).
 */
async function insertHaccpDefaults(svc: Svc, estId: string, orgId: string): Promise<void> {
  const base = { organization_id: orgId, establishment_id: estId };

  const zoneNames = ["Cuisine", "Salle", "Plonge", "Réserve", "Chambre froide positive", "Ligne froide"];
  const { data: zones, error: zErr } = await svc
    .from("haccp_zones")
    .insert(zoneNames.map((name, i) => ({ ...base, name, sort_order: i + 1 })))
    .select("id, name");
  if (zErr) throw zErr;
  const zoneId = (name: string) => zones.find((z) => z.name === name)?.id ?? null;

  const { error: pErr } = await svc.from("haccp_temperature_probes").insert([
    {
      ...base,
      zone_id: zoneId("Chambre froide positive"),
      label: "Sonde centrale",
      min_c: 0,
      max_c: 4,
      sort_order: 1,
      frequency: "biquotidien",
    },
    {
      ...base,
      zone_id: zoneId("Ligne froide"),
      label: "Vitrine entrées",
      min_c: 0,
      max_c: 3,
      sort_order: 2,
      frequency: "biquotidien",
    },
    {
      ...base,
      zone_id: zoneId("Plonge"),
      label: "Eau sanitaire",
      min_c: 45,
      max_c: 55,
      sort_order: 3,
      frequency: "quotidien",
    },
  ]);
  if (pErr) throw pErr;

  const surfaces = [
    { zone: "Cuisine", label: "Hotte", frequency: "hebdomadaire" },
    { zone: "Cuisine", label: "Plan de travail", frequency: "quotidien" },
    { zone: "Cuisine", label: "Tables inox", frequency: "quotidien" },
    { zone: "Cuisine", label: "Sol", frequency: "quotidien" },
    { zone: "Cuisine", label: "Poubelles", frequency: "quotidien" },
    { zone: "Salle", label: "Tables", frequency: "quotidien" },
    { zone: "Salle", label: "Sol", frequency: "quotidien" },
    { zone: "Salle", label: "Vitres", frequency: "hebdomadaire" },
    { zone: "Salle", label: "Sanitaires", frequency: "quotidien" },
    { zone: "Plonge", label: "Bacs de plonge", frequency: "quotidien" },
    { zone: "Plonge", label: "Sol", frequency: "quotidien" },
    { zone: "Réserve", label: "Étagères", frequency: "mensuel" },
    { zone: "Réserve", label: "Sol", frequency: "hebdomadaire" },
  ];
  const { error: sErr } = await svc
    .from("haccp_cleaning_surfaces")
    .insert(surfaces.map((s) => ({ ...base, zone_id: zoneId(s.zone), label: s.label, frequency: s.frequency })));
  if (sErr) throw sErr;

  const { error: oErr } = await svc.from("haccp_oil_baths").insert([
    { ...base, label: "Friteuse 1", sort_order: 1, frequency: "quotidien" },
    { ...base, label: "Friteuse 2", sort_order: 2, frequency: "quotidien" },
  ]);
  if (oErr) throw oErr;

  const { error: cErr } = await svc.from("haccp_checklist_templates").insert([
    {
      ...base,
      title: "Ouverture",
      frequency: "quotidien",
      frequency_label: "Quotidien — matin",
      items: [
        "Températures des enceintes froides relevées",
        "Surfaces de travail propres",
        "Absence de nuisibles constatée",
        "DLC des produits entamés contrôlées",
        "Lave-mains approvisionné (savon, essuie-mains)",
      ],
    },
    {
      ...base,
      title: "Fermeture",
      frequency: "quotidien",
      frequency_label: "Quotidien — soir",
      items: [
        "Surfaces et plans de travail nettoyés/désinfectés",
        "Sols nettoyés",
        "Poubelles vidées",
        "Denrées filmées et rangées",
        "Fermeture des enceintes froides vérifiée",
      ],
    },
    {
      ...base,
      title: "Hygiène du personnel",
      frequency: "quotidien",
      frequency_label: "Quotidien",
      items: ["Tenue propre et complète", "Lavage des mains aux moments clés", "Absence de bijoux / plaies protégées"],
    },
  ]);
  if (cErr) throw cErr;

  const { error: dErr } = await svc.from("haccp_documents").insert([
    { ...base, title: "Plan de Maîtrise Sanitaire (PMS)", doc_type: "plan", version: "v3" },
    { ...base, title: "Plan de marche en avant", doc_type: "plan", version: "v1" },
    { ...base, title: "Procédure de nettoyage / désinfection", doc_type: "procedure", version: "v2" },
    { ...base, title: "Procédure de gestion des non-conformités", doc_type: "procedure", version: "v1" },
    { ...base, title: "Registre de traçabilité", doc_type: "registre", version: "courant" },
    { ...base, title: "Registre des températures", doc_type: "registre", version: "courant" },
  ]);
  if (dErr) throw dErr;

  // Types d'étiquettes (lus par le module mobile « Étiquettes ») — socle identique à la
  // migration mobile 20260711100000. Un seul is_default=true par établissement.
  const { error: ltErr } = await svc.from("haccp_label_types").insert([
    { ...base, name: "Fait / ouvert", is_default: true, sort_order: 0 },
    { ...base, name: "Décongelé", is_default: false, sort_order: 1 },
  ]);
  if (ltErr) throw ltErr;
}

/**
 * Seeds par défaut d'un établissement fraîchement créé : clé NF525, moyens de paiement,
 * menu principal, salle + table de 4 couverts, taux de TVA, et config HACCP.
 */
export async function seedEstablishmentDefaults(svc: Svc, estId: string, orgId: string): Promise<void> {
  // NB : les taux de TVA ne sont PLUS seedés ici — ils sont au niveau ORG (ensureOrgVatRates à la
  // création d'organisation). Voir PLAN_VAT_ORG_SCOPING.md.
  await insertNf525Key(svc, estId, orgId);
  // JET 260 « Initialisation des données » — genèse du fil device-NULL, juste après la clé ECDSA
  // (Piste d'Audit, non purgeable). Best-effort : ne bloque pas la création si la signature échoue.
  try {
    const jet260Err = await signJet({
      establishmentId: estId,
      organizationId: orgId,
      code: 260,
      label: `création établissement ${estId} (signature ECDSA P-256)`,
    });
    if (jet260Err) console.error("JET 260 (initialisation données) échoué (non bloquant) :", jet260Err);
  } catch (e) {
    console.error("JET 260 (initialisation données) exception (non bloquant) :", e);
  }
  await insertDefaultPaymentMethods(svc, estId, orgId);
  await insertDefaultMenu(svc, estId, orgId);
  await insertDefaultRoomAndTable(svc, estId, orgId);
  // NB : AUCUN module n'est activé automatiquement (ni POS). Les modules + sièges se définissent au
  // niveau ORG (wizard création d'org) puis s'attribuent par établissement dans la page « Attribution
  // des modules ». Un device POS ne peut s'appairer qu'une fois POS activé + un siège libre alloué.
  // Best-effort : ne bloque pas la création si le seed HACCP échoue.
  try {
    await insertHaccpDefaults(svc, estId, orgId);
  } catch (e) {
    console.error("Seed HACCP échoué (non bloquant) :", e);
  }
}

/** Crée le compte tablette (orga_user, rôle manager) rattaché à l'établissement. */
export async function createOrgaUser(
  svc: Svc,
  establishmentId: string,
  organizationId: string,
  slug: string,
): Promise<{ email: string; password: string }> {
  const email = `${slug}@logones.internal`;
  const password = generateTabletPassword();

  // On stocke le mot de passe en clair dans user_metadata pour pouvoir le réafficher côté SaaS
  // (compte de device interne, jamais un compte humain). L'auth ne renvoie que le hash sinon.
  const { data: newUser, error: authError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "orga_user" },
    user_metadata: { tablet_password: password },
  });
  if (authError) throw authError;
  const userId = newUser.user.id;

  const { error: uoError } = await svc.from("users_organizations").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "manager",
    establishment_id: establishmentId,
  });

  if (uoError) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw uoError;
  }

  return { email, password };
}
