"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * URL signée pour ouvrir un document HACCP stocké dans le bucket privé
 * `haccp-photos`.
 *
 * L'autorisation passe par la RLS de `haccp_documents` (client user-scoped :
 * si la ligne est lisible, l'utilisateur a accès à l'établissement). La
 * signature storage utilise ensuite le **service-role** car les policies du
 * bucket (tenues par le POS) n'autorisent pas encore la lecture côté web.
 */
export async function getHaccpDocumentSignedUrl(documentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("haccp_documents")
    .select("url")
    .eq("id", documentId)
    .eq("deleted", false)
    .single();
  if (error || !doc.url) return null;

  const svc = createServiceClient();
  const { data, error: signErr } = await svc.storage.from("haccp-photos").createSignedUrl(doc.url, 3600);
  if (signErr) return null;
  return data.signedUrl;
}
