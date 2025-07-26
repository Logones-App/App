import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Déconnexion Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur Supabase signOut:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Créer une réponse avec suppression des cookies
    const response = NextResponse.json({ success: true });

    // 3. Supprimer explicitement les cookies Supabase
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    response.cookies.delete("supabase-auth-token");

    // 4. Supprimer les cookies de session Next.js si présents
    response.cookies.delete("NEXT_LOCALE");
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("next-auth.session-token");

    console.log("✅ Déconnexion réussie - cookies supprimés");

    return response;
  } catch (error) {
    console.error("❌ Error in /api/auth/logout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
