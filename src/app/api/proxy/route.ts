import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { targetUrl } = await request.json();

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json({ error: "URL cible manquante" }, { status: 400 });
    }

    // Vérifier que l'URL pointe vers logones.fr
    if (!targetUrl.includes("logones.fr")) {
      return NextResponse.json({ error: "URL non autorisée" }, { status: 403 });
    }

    // Fetch externe qui ne déclenche pas le middleware
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CustomDomainProxy/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Page non trouvée" }, { status: 404 });
    }

    const html = await response.text();

    return NextResponse.json({
      html,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    console.error("Erreur proxy:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
