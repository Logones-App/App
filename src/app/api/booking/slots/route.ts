import { NextRequest, NextResponse } from "next/server";

import { getDatabaseSlots, getExceptionsForDate, groupSlotsByService, type BookingSlot } from "../_utils/slots-utils";
import { validateSlotsRequest } from "../_utils/validation";

// Fonction pour récupérer les créneaux disponibles
async function getAvailableSlots(establishmentId: string, date: string) {
  try {
    console.log("🔍 Récupération des créneaux pour:", { establishmentId, date });

    // Récupérer les créneaux de base de données
    const slots = await getDatabaseSlots(establishmentId, date);
    console.log("📊 Créneaux trouvés:", slots.length);

    if (slots.length === 0) {
      console.log("📝 Aucun créneau configuré pour cet établissement");
      return { timeSlots: [] };
    }

    // Récupérer les exceptions
    const exceptions = await getExceptionsForDate(establishmentId, date);
    console.log("🚫 Exceptions trouvées:", exceptions.length);

    // Grouper les créneaux par service
    const serviceGroups = groupSlotsByService(slots, exceptions, date);
    console.log("📋 Groupes de services:", serviceGroups.length);

    return { timeSlots: serviceGroups };
  } catch (error) {
    console.error("💥 Erreur lors de la récupération des créneaux:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Récupération des créneaux disponibles");

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const establishmentId = searchParams.get("establishmentId");
    const date = searchParams.get("date");

    console.log("📝 Paramètres reçus:", { establishmentId, date });

    // Valider les paramètres
    const validation = validateSlotsRequest(establishmentId ?? "", date ?? "");
    if (!validation.isValid) {
      console.error("❌ Validation échouée:", validation.errors);
      return NextResponse.json({ error: "Paramètres invalides", details: validation.errors }, { status: 400 });
    }

    // Récupérer les créneaux
    const result = await getAvailableSlots(establishmentId!, date!);

    console.log("✅ Créneaux récupérés avec succès");

    return NextResponse.json(result);
  } catch (error) {
    console.error("💥 Erreur lors de la récupération des créneaux:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des créneaux",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
