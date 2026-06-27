import type { createClient } from "@/lib/supabase/client";

// Appel du RPC de journalisation NF525 « JET 130 » (modification des droits employé).
// Le RPC est SECURITY DEFINER (signe + chaîne l'événement avec la clé de l'établissement)
// et sort silencieusement si aucune clé de signature active n'existe (NF525 non configuré).
// Retourne le message d'erreur en cas d'échec, ou null si OK / non journalisé.

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type UntypedRpc = (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

type JetArgs = { establishmentId: string; organizationId: string; label: string };

// Appel générique d'un RPC de la famille nf525_jet_<code>_saas (même signature).
async function writeJetSaas(supabase: SupabaseBrowserClient, code: number, args: JetArgs): Promise<string | null> {
  const { error } = await (supabase.rpc as unknown as UntypedRpc)(`nf525_jet_${code}_saas`, {
    p_establishment_id: args.establishmentId,
    p_organization_id: args.organizationId,
    p_label: args.label,
  });
  return error ? error.message : null;
}

// JET 130 — modification d'un droit employé certifiant.
export function writeJet130(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 130, args);
}

// JET 180 — génération du fichier d'export des écritures comptables (FEC).
export function writeJet180(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 180, args);
}

// JET 290 — envoi du FEC / Z à l'expert-comptable.
export function writeJet290(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 290, args);
}
