// Journalisation NF525 « JET 130 » (modification des droits employé) via la route serveur.
// La signature ECDSA exige le service_role/Edge Function → impossible côté navigateur, on passe donc
// par une route serveur. Le HMAC symétrique legacy (RPC nf525_jet_<code>_saas) a été retiré (§6.11.3).

type JetArgs = { establishmentId: string; organizationId: string; label: string };

/**
 * JET 130 via la route serveur — signe en ECDSA (Edge Function). À utiliser depuis le client.
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
