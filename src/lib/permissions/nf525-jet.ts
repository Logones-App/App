import type { createClient } from "@/lib/supabase/client";

// Appel du RPC de journalisation NF525 « JET 130 » (modification des droits employé).
// Le RPC est SECURITY DEFINER (signe + chaîne l'événement avec la clé de l'établissement)
// et sort silencieusement si aucune clé de signature active n'existe (NF525 non configuré).
// Retourne le message d'erreur en cas d'échec, ou null si OK / non journalisé.

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type UntypedRpc = (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

export async function writeJet130(
  supabase: SupabaseBrowserClient,
  args: { establishmentId: string; organizationId: string; label: string },
): Promise<string | null> {
  const { error } = await (supabase.rpc as unknown as UntypedRpc)("nf525_jet_130_saas", {
    p_establishment_id: args.establishmentId,
    p_organization_id: args.organizationId,
    p_label: args.label,
  });
  return error ? error.message : null;
}
