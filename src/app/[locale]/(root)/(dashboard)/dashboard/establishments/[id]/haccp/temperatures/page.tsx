import { Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EQUIPEMENTS = [
  {
    id: 1,
    nom: "Chambre froide positive",
    zone: "Cuisine",
    cible: "0 – 4 °C",
    dernierReleve: { heure: "13:00", temp: 4.1, statut: "alerte" },
  },
  {
    id: 2,
    nom: "Chambre froide négative",
    zone: "Réserve",
    cible: "< -18 °C",
    dernierReleve: { heure: "07:00", temp: -19.5, statut: "ok" },
  },
  {
    id: 3,
    nom: "Bain-marie sauces",
    zone: "Cuisine chaude",
    cible: "> 63 °C",
    dernierReleve: { heure: "12:00", temp: 63.0, statut: "ok" },
  },
  {
    id: 4,
    nom: "Vitrine réfrigérée",
    zone: "Salle",
    cible: "0 – 6 °C",
    dernierReleve: { heure: "09:30", temp: 7.2, statut: "alerte" },
  },
  {
    id: 5,
    nom: "Plonge (eau de rinçage)",
    zone: "Plonge",
    cible: "> 80 °C",
    dernierReleve: { heure: "12:30", temp: 82.0, statut: "ok" },
  },
  {
    id: 6,
    nom: "Frigo pâtisserie",
    zone: "Pâtisserie",
    cible: "0 – 4 °C",
    dernierReleve: { heure: "07:00", temp: 2.8, statut: "ok" },
  },
];

const HISTORIQUE = [
  {
    date: "22 juin",
    heure: "13:00",
    equipement: "Chambre froide positive",
    temp: "4,1 °C",
    agent: "Jean D.",
    statut: "alerte",
  },
  { date: "22 juin", heure: "12:30", equipement: "Plonge", temp: "82 °C", agent: "Marie T.", statut: "ok" },
  { date: "22 juin", heure: "12:00", equipement: "Bain-marie sauces", temp: "63 °C", agent: "Marie T.", statut: "ok" },
  {
    date: "22 juin",
    heure: "09:30",
    equipement: "Vitrine réfrigérée",
    temp: "7,2 °C",
    agent: "Jean D.",
    statut: "alerte",
  },
  {
    date: "22 juin",
    heure: "07:00",
    equipement: "Chambre froide positive",
    temp: "3,2 °C",
    agent: "Jean D.",
    statut: "ok",
  },
  {
    date: "22 juin",
    heure: "07:00",
    equipement: "Chambre froide négative",
    temp: "-19,5 °C",
    agent: "Jean D.",
    statut: "ok",
  },
  { date: "22 juin", heure: "07:00", equipement: "Frigo pâtisserie", temp: "2,8 °C", agent: "Jean D.", statut: "ok" },
  {
    date: "21 juin",
    heure: "19:00",
    equipement: "Chambre froide positive",
    temp: "3,8 °C",
    agent: "Sophie L.",
    statut: "ok",
  },
  {
    date: "21 juin",
    heure: "19:00",
    equipement: "Chambre froide négative",
    temp: "-18,9 °C",
    agent: "Sophie L.",
    statut: "ok",
  },
  { date: "21 juin", heure: "12:00", equipement: "Bain-marie sauces", temp: "65 °C", agent: "Marie T.", statut: "ok" },
];

const statBadge: Record<string, "default" | "destructive" | "secondary"> = {
  ok: "default",
  alerte: "destructive",
  manquant: "secondary",
};

export default function TemperaturesPage() {
  const alertes = EQUIPEMENTS.filter((e) => e.dernierReleve.statut === "alerte").length;
  const ok = EQUIPEMENTS.filter((e) => e.dernierReleve.statut === "ok").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Températures</h1>
          <p className="text-muted-foreground text-sm">
            {ok} équipement{ok > 1 ? "s" : ""} conformes · {alertes} alerte{alertes > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie relevés via l&apos;app mobile
        </div>
      </div>

      {/* État des équipements */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EQUIPEMENTS.map((eq) => (
          <Card key={eq.id} className={eq.dernierReleve.statut === "alerte" ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{eq.nom}</p>
                  <p className="text-muted-foreground text-xs">{eq.zone}</p>
                </div>
                <Badge variant={statBadge[eq.dernierReleve.statut]}>{eq.dernierReleve.statut}</Badge>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={`font-mono text-2xl font-bold ${eq.dernierReleve.statut === "alerte" ? "text-red-600" : ""}`}
                  >
                    {eq.dernierReleve.temp} °C
                  </p>
                  <p className="text-muted-foreground text-xs">Cible : {eq.cible}</p>
                </div>
                <span className="text-muted-foreground text-xs">{eq.dernierReleve.heure}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des relevés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {HISTORIQUE.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-4">
                  <div className="text-muted-foreground w-20 text-xs">
                    <p>{r.date}</p>
                    <p className="font-mono">{r.heure}</p>
                  </div>
                  <div>
                    <p className="font-medium">{r.equipement}</p>
                    <p className="text-muted-foreground text-xs">par {r.agent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{r.temp}</span>
                  <Badge variant={statBadge[r.statut]}>{r.statut}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
