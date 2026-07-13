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
// ⚠️ LEGACY (RPC HMAC direct) : ne fonctionne QUE pour un établissement hmac-sha256 (clé HMAC).
// Pour l'ECDSA, utiliser writeJet130Server (signe côté serveur via l'Edge). Voir writeJet130Server.
export function writeJet130(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 130, args);
}

/**
 * JET 130 via la route serveur — route selon l'algo de l'établissement (ECDSA → Edge, HMAC → RPC).
 * À utiliser depuis le client (la signature ECDSA exige le service_role/Edge, impossible côté navigateur).
 * Retourne un message d'erreur, ou null si OK.
 */
export async function writeJet130Server(args: JetArgs): Promise<string | null> {
  const res = await fetch(`/api/establishments/${args.establishmentId}/jet-130`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: args.label }),
  });
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "journalisation NF525 (JET 130) échouée";
}

// JET 180 — génération du fichier d'export des écritures comptables (FEC).
export function writeJet180(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 180, args);
}

// JET 290 — envoi du FEC / Z à l'expert-comptable.
export function writeJet290(supabase: SupabaseBrowserClient, args: JetArgs): Promise<string | null> {
  return writeJetSaas(supabase, 290, args);
}
