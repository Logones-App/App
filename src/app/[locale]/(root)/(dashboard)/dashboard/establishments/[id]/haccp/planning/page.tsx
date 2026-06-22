"use client";

import { AlertTriangle, CheckCircle2, Circle, Clock, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { HaccpPlanning } from "./_components/haccp-planning";

type Freq = "quotidien" | "hebdomadaire" | "mensuel" | "ponctuel";
type Statut = "fait" | "en retard" | "à faire" | "planifié";

const FREQ_COLOR: Record<Freq, "default" | "secondary" | "outline"> = {
  quotidien: "default",
  hebdomadaire: "secondary",
  mensuel: "outline",
  ponctuel: "outline",
};

const statutIcon: Record<Statut, React.ReactNode> = {
  fait: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "en retard": <AlertTriangle className="h-4 w-4 text-red-500" />,
  "à faire": <Circle className="h-4 w-4 text-gray-400" />,
  planifié: <Clock className="h-4 w-4 text-blue-400" />,
};

const statutBadge: Record<Statut, "default" | "destructive" | "secondary" | "outline"> = {
  fait: "default",
  "en retard": "destructive",
  "à faire": "secondary",
  planifié: "outline",
};

const TACHES = [
  {
    id: 1,
    tache: "Relevé température matin",
    categorie: "Températures",
    freq: "quotidien" as Freq,
    heure: "07:00",
    responsable: "Jean D.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 2,
    tache: "Checklist ouverture cuisine",
    categorie: "Checklists",
    freq: "quotidien" as Freq,
    heure: "07:15",
    responsable: "Jean D.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 3,
    tache: "Contrôle réception marchandises",
    categorie: "Réceptions",
    freq: "quotidien" as Freq,
    heure: "08:00",
    responsable: "Jean D.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 4,
    tache: "Test acidité huile friteuse 1",
    categorie: "Huiles",
    freq: "quotidien" as Freq,
    heure: "11:00",
    responsable: "Jean D.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 5,
    tache: "Test acidité huile friteuse 2",
    categorie: "Huiles",
    freq: "quotidien" as Freq,
    heure: "11:00",
    responsable: "Jean D.",
    statut: "en retard" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 6,
    tache: "Relevé température midi",
    categorie: "Températures",
    freq: "quotidien" as Freq,
    heure: "13:00",
    responsable: "Marie T.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 7,
    tache: "Températures produit — service déjeuner",
    categorie: "Températures produit",
    freq: "quotidien" as Freq,
    heure: "12:00",
    responsable: "Marie T.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 8,
    tache: "Nettoyage plan de travail",
    categorie: "Nettoyage",
    freq: "quotidien" as Freq,
    heure: "14:30",
    responsable: "Marie D.",
    statut: "fait" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 9,
    tache: "Relevé température soir",
    categorie: "Températures",
    freq: "quotidien" as Freq,
    heure: "19:00",
    responsable: "Sophie L.",
    statut: "à faire" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 10,
    tache: "Checklist fermeture cuisine",
    categorie: "Checklists",
    freq: "quotidien" as Freq,
    heure: "22:00",
    responsable: "Sophie L.",
    statut: "à faire" as Statut,
    date: "Aujourd'hui",
  },
  {
    id: 11,
    tache: "Nettoyage chambre froide positive",
    categorie: "Nettoyage",
    freq: "hebdomadaire" as Freq,
    heure: "09:00",
    responsable: "Marie D.",
    statut: "fait" as Statut,
    date: "Lundi 22 juin",
  },
  {
    id: 12,
    tache: "Vérification pièges nuisibles",
    categorie: "Contrôle",
    freq: "hebdomadaire" as Freq,
    heure: "08:00",
    responsable: "Jean D.",
    statut: "fait" as Statut,
    date: "Lundi 22 juin",
  },
  {
    id: 13,
    tache: "Vidange et nettoyage friteuse 2",
    categorie: "Huiles",
    freq: "hebdomadaire" as Freq,
    heure: "À planifier",
    responsable: "Jean D.",
    statut: "en retard" as Statut,
    date: "Mercredi 24 juin",
  },
  {
    id: 14,
    tache: "Dégraissage four + plaques",
    categorie: "Nettoyage",
    freq: "hebdomadaire" as Freq,
    heure: "Après service",
    responsable: "Chef de partie",
    statut: "planifié" as Statut,
    date: "Vendredi 26 juin",
  },
  {
    id: 15,
    tache: "Nettoyage hottes (filtres)",
    categorie: "Nettoyage",
    freq: "hebdomadaire" as Freq,
    heure: "Après service",
    responsable: "Chef de partie",
    statut: "planifié" as Statut,
    date: "Vendredi 26 juin",
  },
  {
    id: 16,
    tache: "Calibrage sondes températures",
    categorie: "Températures",
    freq: "mensuel" as Freq,
    heure: "Matin",
    responsable: "Jean D.",
    statut: "planifié" as Statut,
    date: "30 juin",
  },
  {
    id: 17,
    tache: "Formation HACCP — Sophie Laurent",
    categorie: "Formations",
    freq: "ponctuel" as Freq,
    heure: "09:00",
    responsable: "Direction",
    statut: "planifié" as Statut,
    date: "15 juillet",
  },
];

const GROUPES = [
  { label: "Aujourd'hui", taches: TACHES.filter((t) => t.date === "Aujourd'hui") },
  {
    label: "Cette semaine",
    taches: TACHES.filter((t) => ["Lundi 22 juin", "Mercredi 24 juin", "Vendredi 26 juin"].includes(t.date)),
  },
  { label: "Ce mois / À venir", taches: TACHES.filter((t) => ["30 juin", "15 juillet"].includes(t.date)) },
];

export default function PlanningHaccpPage() {
  const enRetard = TACHES.filter((t) => t.statut === "en retard").length;
  const faites = TACHES.filter((t) => t.statut === "fait").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planning des tâches HACCP</h1>
          <p className="text-muted-foreground text-sm">
            {faites} tâches faites · {enRetard} en retard
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Tâches terrain validées via l&apos;app mobile
        </div>
      </div>

      {enRetard > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {enRetard} tâche{enRetard > 1 ? "s" : ""} en retard — action requise
          </span>
        </div>
      )}

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste">Liste</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="mt-4 space-y-4">
          {GROUPES.map((groupe) => (
            <Card key={groupe.label}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{groupe.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {groupe.taches.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${
                      t.statut === "en retard" ? "border-red-200 bg-red-50" : ""
                    }`}
                  >
                    {statutIcon[t.statut]}
                    <div className="flex-1">
                      <p className={t.statut === "fait" ? "text-muted-foreground line-through" : "font-medium"}>
                        {t.tache}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t.categorie} · {t.responsable}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={FREQ_COLOR[t.freq]} className="text-xs">
                        {t.freq}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{t.heure}</span>
                      <Badge variant={statutBadge[t.statut]} className="text-xs">
                        {t.statut}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          <HaccpPlanning />
        </TabsContent>
      </Tabs>
    </div>
  );
}
