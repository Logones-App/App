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

function generateSigningKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
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
  const { error } = await svc.from("nf525_signing_keys").insert({
    establishment_id: estId,
    organization_id: orgId,
    signing_key_base64: generateSigningKey(),
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

async function insertVatRates(svc: Svc, rates: VatRateSeed[], estId: string, orgId: string): Promise<void> {
  const filtered = rates.filter((r) => r.value > 0);
  if (filtered.length === 0) return;
  const rows = filtered.map((r) => ({
    establishment_id: estId,
    organization_id: orgId,
    name: r.name,
    value: r.value,
  }));
  const { error } = await svc.from("vat_rate").insert(rows);
  if (error) throw error;
}

/**
 * Seeds par défaut d'un établissement fraîchement créé : clé NF525, moyens de paiement,
 * menu principal, salle + table de 4 couverts, et taux de TVA.
 */
export async function seedEstablishmentDefaults(
  svc: Svc,
  estId: string,
  orgId: string,
  vatRates: VatRateSeed[],
): Promise<void> {
  await insertNf525Key(svc, estId, orgId);
  await insertDefaultPaymentMethods(svc, estId, orgId);
  await insertDefaultMenu(svc, estId, orgId);
  await insertDefaultRoomAndTable(svc, estId, orgId);
  await insertVatRates(svc, vatRates, estId, orgId);
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
