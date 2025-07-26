import { NextRequest, NextResponse } from "next/server";

import { DnsService } from "@/lib/services/dns-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  try {
    const { domain } = await params;

    if (!domain) {
      return NextResponse.json({ error: "Domain parameter is missing" }, { status: 400 });
    }

    // Vérifier que le domaine est valide
    const domainRegex = /^(https?:\/\/)?(www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");

    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Vérifier la configuration DNS
    const dnsService = new DnsService();
    const result = await dnsService.checkDomainResolution(cleanDomain);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking DNS for domain:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        isConfigured: false,
      },
      { status: 500 },
    );
  }
}

// Route pour vérifier plusieurs domaines en lot
export async function POST(request: NextRequest) {
  try {
    const { domains } = await request.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: "Domains array is required" }, { status: 400 });
    }

    // Limiter à 10 domaines pour éviter la surcharge
    if (domains.length > 10) {
      return NextResponse.json({ error: "Maximum 10 domains allowed per request" }, { status: 400 });
    }

    // Vérifier que tous les domaines sont valides
    const domainRegex = /^(https?:\/\/)?(www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomains = domains.map((domain) =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, ""),
    );

    const invalidDomains = cleanDomains.filter((domain) => !domainRegex.test(domain));
    if (invalidDomains.length > 0) {
      return NextResponse.json({ error: `Invalid domains: ${invalidDomains.join(", ")}` }, { status: 400 });
    }

    // Vérifier la configuration DNS pour tous les domaines
    const dnsService = new DnsService();
    const results = await dnsService.checkMultipleDomains(cleanDomains);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error checking DNS for multiple domains:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
