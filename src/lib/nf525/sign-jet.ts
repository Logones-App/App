import { createServiceClient } from "@/lib/supabase/service";

export type JetCode = 130 | 180 | 290 | 410;

/**
 * Écrit un JET SaaS (fil device-NULL) via l'Edge Function `nf525-sign` (signature ECDSA P-256 hors
 * base — pgcrypto ne fait pas d'ECDSA). Server-only (clé service_role). Retourne un message d'erreur,
 * ou null si OK.
 *
 * NB : le procédé HMAC-SHA256 symétrique (legacy) a été RETIRÉ — non conforme NF525 §6.11.3. Tout
 * établissement signe désormais en ECDSA. Voir aussi la doc du référentiel (asymétrique obligatoire).
 */
export async function signJet(args: {
  establishmentId: string;
  organizationId: string;
  code: JetCode;
  /** Texte libre du label (130/180/290) ou champs modifiés (410). Sanitisé côté signature. */
  label: string;
}): Promise<string | null> {
  const svc = createServiceClient();
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
