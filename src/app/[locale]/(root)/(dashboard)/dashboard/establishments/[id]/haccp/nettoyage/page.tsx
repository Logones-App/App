import { CheckCircle2, Circle, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Frequence = "quotidien" | "hebdomadaire" | "mensuel";

const PLAN_NETTOYAGE: {
  zone: string;
  description: string;
  frequence: Frequence;
  produit: string;
  responsable: string;
  taches_du_jour: { heure: string | null; agent: string | null; fait: boolean }[];
}[] = [
  {
    zone: "Plan de travail cuisine",
    description: "Désinfection complète en fin de service",
    frequence: "quotidien",
    produit: "Dégraissant alimentaire + désinfectant",
    responsable: "Équipe cuisine",
    taches_du_jour: [
      { heure: "14:30", agent: "Marie D.", fait: true },
      { heure: null, agent: null, fait: false },
    ],
  },
  {
    zone: "Frigos (joints, clayettes, portes)",
    description: "Nettoyage intérieur complet",
    frequence: "quotidien",
    produit: "Désinfectant alimentaire",
    responsable: "Équipe cuisine",
    taches_du_jour: [{ heure: "09:00", agent: "Jean D.", fait: true }],
  },
  {
    zone: "Sols cuisine + plonge",
    description: "Balayage humide + désinfection",
    frequence: "quotidien",
    produit: "Dégraissant sols + eau de javel diluée",
    responsable: "Plongeur",
    taches_du_jour: [{ heure: null, agent: null, fait: false }],
  },
  {
    zone: "Hottes et filtres",
    description: "Dégraissage filtres + surface extérieure hotte",
    frequence: "hebdomadaire",
    produit: "Dégraissant haute puissance",
    responsable: "Chef de partie",
    taches_du_jour: [],
  },
  {
    zone: "WC personnel",
    description: "Nettoyage complet sanitaires",
    frequence: "quotidien",
    produit: "Détartrant + désinfectant sanitaire",
    responsable: "Équipe salle",
    taches_du_jour: [{ heure: null, agent: null, fait: false }],
  },
  {
    zone: "Chambre froide positive",
    description: "Nettoyage sols, murs, étagères + joint porte",
    frequence: "hebdomadaire",
    produit: "Désinfectant alimentaire",
    responsable: "Chef de partie",
    taches_du_jour: [],
  },
  {
    zone: "Friteuse",
    description: "Vidange + nettoyage complet cuve",
    frequence: "hebdomadaire",
    produit: "Dégraissant friteuse",
    responsable: "Commis",
    taches_du_jour: [],
  },
  {
    zone: "Four (cavité + joints)",
    description: "Dégraissage complet four + plaque",
    frequence: "hebdomadaire",
    produit: "Produit four professionnel",
    responsable: "Chef de partie",
    taches_du_jour: [{ heure: null, agent: null, fait: false }],
  },
  {
    zone: "Hottes (nettoyage complet + graisses)",
    description: "Démontage complet + trempage filtres",
    frequence: "mensuel",
    produit: "Dégraissant pro + trempage",
    responsable: "Chef de cuisine",
    taches_du_jour: [],
  },
  {
    zone: "Murs carrelés cuisine",
    description: "Détartrage + désinfection",
    frequence: "mensuel",
    produit: "Détartrant alimentaire",
    responsable: "Équipe cuisine",
    taches_du_jour: [],
  },
];

const FREQ_COLOR: Record<Frequence, "default" | "secondary" | "outline"> = {
  quotidien: "default",
  hebdomadaire: "secondary",
  mensuel: "outline",
};

const FREQ_LABEL: Record<Frequence, string> = {
  quotidien: "Quotidien",
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
};

const JOUR_SEMAINE = "lundi"; // mercredi déclencherait les hebdo

export default function NettoyagePage() {
  const quotidiens = PLAN_NETTOYAGE.filter((t) => t.frequence === "quotidien");
  const faitsAujourdhui = quotidiens.filter((t) => t.taches_du_jour.every((td) => td.fait)).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan de nettoyage</h1>
          <p className="text-muted-foreground text-sm">
            Aujourd&apos;hui ({JOUR_SEMAINE}) · {faitsAujourdhui}/{quotidiens.length} tâches quotidiennes faites
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Validation des tâches via l&apos;app mobile
        </div>
      </div>

      {/* Checklist du jour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tâches du jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PLAN_NETTOYAGE.filter((t) => t.taches_du_jour.length > 0).map((t, i) => {
            const fait = t.taches_du_jour.every((td) => td.fait);
            const derniere = t.taches_du_jour.find((td) => td.fait);
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                {fait ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={fait ? "text-muted-foreground line-through" : "font-medium"}>{t.zone}</p>
                  <p className="text-muted-foreground text-xs">{t.produit}</p>
                </div>
                {fait && derniere && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {derniere.heure} · {derniere.agent}
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Plan complet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Plan complet de nettoyage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {PLAN_NETTOYAGE.map((t, i) => (
              <div key={i} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{t.zone}</p>
                      <Badge variant={FREQ_COLOR[t.frequence]}>{FREQ_LABEL[t.frequence]}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{t.description}</p>
                    <p className="text-muted-foreground text-xs">
                      Produit : {t.produit} · Responsable : {t.responsable}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
