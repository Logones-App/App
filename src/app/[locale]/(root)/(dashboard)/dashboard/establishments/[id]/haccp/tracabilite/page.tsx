import { Info, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LOTS = [
  {
    id: "LOT-2026-0187",
    produit: "Bœuf haché (5 kg)",
    fournisseur: "Boucherie Martin",
    date_reception: "22 juin",
    dlc_fournisseur: "24 juin",
    temperature_reception: "2,8 °C",
    utilise_dans: [{ plat: "Burger Classic", service: "22 juin — déjeuner", couverts: 14 }],
    statut: "en cours",
  },
  {
    id: "LOT-2026-0186",
    produit: "Saumon frais (3 kg)",
    fournisseur: "Marée Bleue",
    date_reception: "22 juin",
    dlc_fournisseur: "23 juin",
    temperature_reception: "1,2 °C",
    utilise_dans: [{ plat: "Saumon grillé", service: "22 juin — déjeuner", couverts: 8 }],
    statut: "en cours",
  },
  {
    id: "LOT-2026-0185",
    produit: "Volailles (4 pièces)",
    fournisseur: "Boucherie Martin",
    date_reception: "21 juin",
    dlc_fournisseur: "23 juin",
    temperature_reception: "3,5 °C",
    utilise_dans: [
      { plat: "Poulet rôti", service: "21 juin — déjeuner", couverts: 12 },
      { plat: "Poulet rôti", service: "22 juin — déjeuner", couverts: 6 },
    ],
    statut: "en cours",
  },
  {
    id: "LOT-2026-0184",
    produit: "Crème fraîche (2 L)",
    fournisseur: "Laiterie Régionale",
    date_reception: "20 juin",
    dlc_fournisseur: "25 juin",
    temperature_reception: "3,4 °C",
    utilise_dans: [
      { plat: "Sauce normande", service: "20 juin — dîner", couverts: 10 },
      { plat: "Blanquette de veau", service: "21 juin — déjeuner", couverts: 15 },
    ],
    statut: "épuisé",
  },
  {
    id: "LOT-2026-0183",
    produit: "Légumes frais (lot 2)",
    fournisseur: "Rungis Express",
    date_reception: "21 juin",
    dlc_fournisseur: "24 juin",
    temperature_reception: "6,1 °C",
    utilise_dans: [
      { plat: "Soupe de légumes", service: "21 juin — dîner", couverts: 20 },
      { plat: "Salade César", service: "22 juin — déjeuner", couverts: 7 },
    ],
    statut: "en cours",
  },
  {
    id: "LOT-2026-0182",
    produit: "Légumes frais (lot 1 — REFUSÉ)",
    fournisseur: "Rungis Express",
    date_reception: "21 juin",
    dlc_fournisseur: "24 juin",
    temperature_reception: "8,5 °C",
    utilise_dans: [],
    statut: "retourné",
  },
];

const statutBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "en cours": "default",
  épuisé: "secondary",
  retourné: "destructive",
};

export default function TracabilitePage() {
  const actifs = LOTS.filter((l) => l.statut === "en cours").length;
  const retournes = LOTS.filter((l) => l.statut === "retourné").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traçabilité</h1>
          <p className="text-muted-foreground text-sm">
            Suivi des lots de matières premières · {actifs} lot{actifs > 1 ? "s" : ""} actif{actifs > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Scan lots & saisie via l&apos;app mobile
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{LOTS.length}</p>
            <p className="text-muted-foreground text-sm">Lots tracés (7 jours)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{actifs}</p>
            <p className="text-muted-foreground text-sm">Lots en cours d&apos;utilisation</p>
          </CardContent>
        </Card>
        <Card className={retournes > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${retournes > 0 ? "text-red-600" : ""}`}>{retournes}</p>
            <p className="text-muted-foreground text-sm">
              Lot{retournes > 1 ? "s" : ""} retourné{retournes > 1 ? "s" : ""} / refusé{retournes > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explication */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La traçabilité permet de retrouver en cas d&apos;alerte sanitaire quels plats ont utilisé un lot donné et à
        quels clients ils ont été servis. Obligation réglementaire depuis le règlement CE 178/2002.
      </div>

      {/* Liste des lots */}
      <div className="space-y-3">
        {LOTS.map((lot) => (
          <Card key={lot.id} className={lot.statut === "retourné" ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{lot.produit}</p>
                    <Badge variant={statutBadge[lot.statut]}>{lot.statut}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {lot.fournisseur} · Reçu le {lot.date_reception} à {lot.temperature_reception} · DLC fournisseur :{" "}
                    {lot.dlc_fournisseur}
                  </p>
                </div>
                <p className="text-muted-foreground shrink-0 font-mono text-xs">{lot.id}</p>
              </div>

              {lot.utilise_dans.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Utilisé dans</p>
                  {lot.utilise_dans.map((u, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-gray-50 px-2.5 py-1.5 text-xs">
                      <span className="font-medium">{u.plat}</span>
                      <span className="text-muted-foreground">
                        {u.service} · {u.couverts} couverts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-2 text-xs italic">
                  Produit non utilisé — retourné au fournisseur
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
