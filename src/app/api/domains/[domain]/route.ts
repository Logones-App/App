import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    console.log("🔍 API - Recherche du domaine:", domain);
    
    if (!domain) {
      return NextResponse.json({ error: "Domain parameter is missing" }, { status: 400 });
    }

    const supabase = await createClient();
    console.log("🔍 API - Client Supabase créé");
    
    // Récupérer le domaine personnalisé
    const { data: customDomain, error: domainError } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("domain", domain)
      .eq("is_active", true)
      .eq("deleted", false)
      .single();

    console.log("🔍 API - Résultat de la requête:", { customDomain, domainError });

    if (domainError) {
      console.error("🔍 API - Erreur domaine:", domainError);
      return NextResponse.json({ error: "Custom domain not found or inactive" }, { status: 404 });
    }

    if (!customDomain) {
      console.error("🔍 API - Domaine non trouvé");
      return NextResponse.json({ error: "Custom domain not found or inactive" }, { status: 404 });
    }

    // Récupérer l'établissement associé
    const { data: establishment, error: establishmentError } = await supabase
      .from("establishments")
      .select("name, slug")
      .eq("id", customDomain.establishment_id)
      .single();

    console.log("🔍 API - Résultat établissement:", { establishment, establishmentError });

    if (establishmentError) {
      console.error("Error fetching establishment for custom domain:", establishmentError);
      return NextResponse.json({ error: "Establishment not found for this domain" }, { status: 404 });
    }

    console.log("🔍 API - Succès, retour des données");
    return NextResponse.json({ domain: customDomain, establishment });
  } catch (error) {
    console.error("🔍 API - Erreur générale:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 