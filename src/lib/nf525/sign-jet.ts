import { createServiceClient } from "@/lib/supabase/service";

export type JetCode = 130 | 180 | 290 | 410;

/**
 * Écrit un JET SaaS (fil device-NULL) en routant selon l'algo de l'établissement (dual-mode) :
 * - `ecdsa-p256` → Edge Function `nf525-sign` (signature ECDSA hors base, pgcrypto ne le fait pas) ;
 * - `hmac-sha256` (legacy) → RPC en base `nf525_jet_<code>_saas`.
 * Server-only (clé service_role). Retourne un message d'erreur, ou null si OK.
 */
export async function signJet(args: {
  establishmentId: string;
  organizationId: string;
  code: JetCode;
  /** Texte libre du label (130/180/290) ou champs modifiés (410). Sanitisé côté signature. */
  label: string;
}): Promise<string | null> {
  const svc = createServiceClient();

  const { data: key } = await svc
    .from("nf525_signing_keys")
    .select("algo")
    .eq("establishment_id", args.establishmentId)
    .is("valid_to", null)
    .limit(1)
    .maybeSingle();
  const algo = key?.algo ?? "hmac-sha256";

  if (algo === "ecdsa-p256") {
    const { data, error } = await svc.functions.invoke("nf525-sign", {
      body: {
        establishmentId: args.establishmentId,
        organizationId: args.organizationId,
        code: args.code,
        label: args.label,
      },
    });
    if (error) return error.message;
    if (data && data.ok === false) return typeof data.error === "string" ? data.error : "edge sign failed";
    return null;
  }

  // Legacy HMAC : signature en base. 410 prend p_changed_fields, les autres p_label.
  type UntypedRpc = (fn: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  const rpcArgs =
    args.code === 410
      ? {
          p_establishment_id: args.establishmentId,
          p_organization_id: args.organizationId,
          p_changed_fields: args.label,
        }
      : { p_establishment_id: args.establishmentId, p_organization_id: args.organizationId, p_label: args.label };
  const { error } = await (svc.rpc as unknown as UntypedRpc)(`nf525_jet_${args.code}_saas`, rpcArgs);
  return error ? error.message : null;
}
