import { NextRequest, NextResponse } from "next/server";
import { DomainService } from "@/lib/services/domain-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    if (!domain) {
      return NextResponse.json({ error: "Domain parameter is missing" }, { status: 400 });
    }

    const domainService = new DomainService();
    const customDomain = await domainService.getEstablishmentByDomain(domain);

    if (!customDomain) {
      return NextResponse.json({ error: "Custom domain not found or inactive" }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: establishment, error: establishmentError } = await supabase
      .from("establishments")
      .select("name, slug")
      .eq("id", customDomain.establishment_id)
      .single();

    if (establishmentError) {
      console.error("Error fetching establishment for custom domain:", establishmentError);
      return NextResponse.json({ error: "Establishment not found for this domain" }, { status: 404 });
    }

    if (!establishment) {
      return NextResponse.json({ error: "Establishment not found for this domain" }, { status: 404 });
    }

    return NextResponse.json({ domain: customDomain, establishment });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 