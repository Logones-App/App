// Edge Function nf525-sign — signe un événement JET (130/180/260/270/290/410) en ECDSA P-256 et l'insère,
// ATOMIQUEMENT (advisory lock par établissement → prev_sig/event_id cohérents sur le fil device-NULL).
// Remplace la signature HMAC des anciennes RPC (pgcrypto ne fait pas d'ECDSA). Appelé server-to-server
// par les routes SaaS avec la clé service_role. Interop POS verrouillée par KAT (RFC6979 + lowS, @noble).
import postgres from "npm:postgres@3";
import { p256 } from "npm:@noble/curves@2/nist.js";
import { sha256 } from "npm:@noble/hashes@2/sha2.js";

// ── Crypto ──────────────────────────────────────────────────────────────────
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** sha256(UTF-8(chainInput)) puis ECDSA P-256 (prehash:false) → r‖s 64 o base64url. */
function signJetEcdsa(chainInput: string, privateKeyBase64: string): string {
  const digest = sha256(new TextEncoder().encode(chainInput));
  const sig = p256.sign(digest, fromBase64(privateKeyBase64), { prehash: false });
  return toBase64Url(sig);
}

// ── Chaîne R19 §6.3 (identique aux anciennes RPC) ────────────────────────────
/** R19 §4.1 : séparateur canonique "," → neutraliser "," et "|" dans les champs texte libres. */
function sanitizeField(s: string): string {
  return s.replace(/,/g, " ").replace(/\|/g, " ");
}
function buildJetChain(p: { eventId: number; code: number; label: string; ts: string; prevSig: string | null }): string {
  const hasPrev = p.prevSig ? "1" : "0";
  const prev = p.prevSig ?? " ";
  // eventId,code,label,timestamp,operator( ),caisse( ),hasPrev,prevSig
  return `${p.eventId},${p.code},${sanitizeField(p.label)},${p.ts}, , ,${hasPrev},${prev}`;
}
/** Horodatage R19 AAAAMMJJHHMMSS (UTC). */
function nf525Timestamp(d: Date): string {
  const w = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${w(d.getUTCMonth() + 1)}${w(d.getUTCDate())}${w(d.getUTCHours())}${w(d.getUTCMinutes())}${w(d.getUTCSeconds())}`;
}

// ── Handler ──────────────────────────────────────────────────────────────────
const LABEL_PREFIX: Record<number, string> = {
  130: "Modification droits employé : ",
  180: "Génération export écritures comptables : ",
  260: "Initialisation des données : ",
  270: "Modification paramètre de conformité : ",
  290: "Échange expert-comptable (export/Z) : ",
  410: "Changement données assujetti : ",
};
// 260 = initialisation + 270 = paramètre de conformité + 410 = données assujetti → Piste d'Audit (non purgeables).
// 130/180/290 = Journal Technique (purgeables).
const NON_PURGEABLE = new Set([260, 270, 410]);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  // Auth server-to-server : uniquement le porteur de la clé service_role.
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return json(401, { error: "unauthorized" });
  }

  let body: { establishmentId?: string; organizationId?: string; code?: number; label?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }
  const { establishmentId, organizationId, code, label } = body;
  if (!establishmentId || !organizationId || !code) return json(400, { error: "missing params" });
  const prefix = LABEL_PREFIX[code];
  if (!prefix) return json(400, { error: `unsupported code ${code}` });

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
  try {
    const out = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${establishmentId}::text, 0))`;

      const mat = await tx`select * from nf525_get_signing_material(${establishmentId}::uuid)`;
      if (mat.length === 0) throw new Error("no active signing key");
      if (mat[0].algo !== "ecdsa-p256") throw new Error(`establishment algo=${mat[0].algo}, edge signs ecdsa-p256 only`);
      if (!mat[0].private_key_base64) throw new Error("missing private_key_base64");

      // event_id ET prev_sig scopés au fil device-NULL (event_id est PAR DEVICE ; SaaS seul écrivain).
      const seq = await tx`select coalesce(max(event_id),0)+1 as next from nf525_jet
        where establishment_id=${establishmentId}::uuid and device_id is null`;
      const prev = await tx`select signature_base64url from nf525_jet
        where establishment_id=${establishmentId}::uuid and device_id is null order by event_id desc limit 1`;

      const eventId = Number(seq[0].next);
      const prevSig: string | null = prev[0]?.signature_base64url ?? null;
      const fullLabel = sanitizeField(prefix + (label ?? ""));
      const chainInput = buildJetChain({ eventId, code, label: fullLabel, ts: nf525Timestamp(new Date()), prevSig });
      const signature = signJetEcdsa(chainInput, mat[0].private_key_base64);

      await tx`insert into nf525_jet
        (id, establishment_id, organization_id, event_id, code_event, label, event_at, operator_code,
         device_id, report_previous_signature, previous_signature_base64url, signature_base64url,
         hash_chain_input, purgeable, created_at)
        values (gen_random_uuid(), ${establishmentId}::uuid, ${organizationId}::uuid, ${eventId}, ${code},
         ${fullLabel}, now(), null, null, null, ${prevSig}, ${signature}, ${chainInput},
         ${!NON_PURGEABLE.has(code)}, now())`;

      return { eventId, signature };
    });
    return json(200, { ok: true, ...out });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  } finally {
    await sql.end();
  }
});
