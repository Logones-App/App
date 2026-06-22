import { CheckCircle2, Circle, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Frequence = "ouverture" | "fermeture" | "hebdomadaire" | "mensuel";

const FREQ_LABEL: Record<Frequence, string> = {
  ouverture: "Ouverture",
  fermeture: "Fermeture",
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
};

const FREQ_COLOR: Record<Frequence, "default" | "secondary" | "outline"> = {
  ouverture: "default",
  fermeture: "default",
  hebdomadaire: "secondary",
  mensuel: "outline",
};

const MODELES = [
  {
    nom: "Checklist ouverture cuisine",
    frequence: "ouverture" as Frequence,
    points: [
      { label: "Vérifier T° frigos et congélateurs", fait: true, agent: "Jean D.", heure: "07:05" },
      { label: "Contrôler dates DLC des produits en cours", fait: true, agent: "Jean D.", heure: "07:10" },
      { label: "Vérifier état de propreté des plans de travail", fait: true, agent: "Jean D.", heure: "07:15" },
      { label: "Tester eau chaude plonge (> 80 °C)", fait: true, agent: "Jean D.", heure: "07:20" },
      { label: "Vérifier stock produits nettoyants", fait: false, agent: null, heure: null },
      { label: "Allumer et régler bain-marie (> 63 °C)", fait: false, agent: null, heure: null },
      { label: "Vérifier fonctionnement hottes", fait: false, agent: null, heure: null },
    ],
  },
  {
    nom: "Checklist fermeture cuisine",
    frequence: "fermeture" as Frequence,
    points: [
      { label: "Nettoyage et désinfection plans de travail", fait: false, agent: null, heure: null },
      { label: "Vider et nettoyer poubelles", fait: false, agent: null, heure: null },
      { label: "Vérifier fermeture frigos et congélateurs", fait: false, agent: null, heure: null },
      { label: "Éteindre équipements (four, plaques, friteuses)", fait: false, agent: null, heure: null },
      { label: "Relevé T° frigos (relevé soir)", fait: false, agent: null, heure: null },
    ],
  },
  {
    nom: "Checklist hebdomadaire",
    frequence: "hebdomadaire" as Frequence,
    points: [
      { label: "Nettoyage complet chambre froide positive", fait: true, agent: "Marie D.", heure: "Lundi 09:00" },
      { label: "Vidange et nettoyage friteuse(s)", fait: false, agent: null, heure: null },
      { label: "Dégraissage four + plaques induction", fait: false, agent: null, heure: null },
      { label: "Nettoyage hottes (filtres + surface)", fait: false, agent: null, heure: null },
      { label: "Vérification pièges nuisibles", fait: true, agent: "Jean D.", heure: "Lundi 08:00" },
      { label: "Test acidité huile de friture", fait: true, agent: "Jean D.", heure: "Lundi 11:00" },
      { label: "Nettoyage machine à café + détartrage", fait: false, agent: null, heure: null },
      { label: "Vérification dates péremption produits chimiques", fait: false, agent: null, heure: null },
    ],
  },
  {
    nom: "Checklist mensuelle",
    frequence: "mensuel" as Frequence,
    points: [
      { label: "Nettoyage complet murs carrelés cuisine", fait: false, agent: null, heure: null },
      { label: "Vérification et calibrage sondes températures", fait: false, agent: null, heure: null },
      { label: "Révision plan de maîtrise sanitaire", fait: false, agent: null, heure: null },
      { label: "Formation/rappel HACCP équipe", fait: false, agent: null, heure: null },
      { label: "Contrôle antiparasitaire (société externe)", fait: false, agent: null, heure: null },
    ],
  },
];

export default function ChecklistsPage() {
  const totalPoints = MODELES.flatMap((m) => m.points).length;
  const faits = MODELES.flatMap((m) => m.points).filter((p) => p.fait).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklists</h1>
          <p className="text-muted-foreground text-sm">
            {faits}/{totalPoints} points validés aujourd&apos;hui
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Validation des points via l&apos;app mobile
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODELES.map((m) => {
          const ok = m.points.filter((p) => p.fait).length;
          const total = m.points.length;
          return (
            <Card key={m.nom} className={ok === total ? "border-green-200 bg-green-50" : ""}>
              <CardContent className="pt-4">
                <Badge variant={FREQ_COLOR[m.frequence]} className="mb-2">
                  {FREQ_LABEL[m.frequence]}
                </Badge>
                <p className="text-sm font-semibold">{m.nom}</p>
                <p className={`mt-1 text-2xl font-bold ${ok < total ? "text-amber-600" : "text-green-600"}`}>
                  {ok}/{total}
                </p>
                <p className="text-muted-foreground text-xs">points validés</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {MODELES.map((modele) => (
        <Card key={modele.nom}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">{modele.nom}</CardTitle>
              <Badge variant={FREQ_COLOR[modele.frequence]}>{FREQ_LABEL[modele.frequence]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {modele.points.map((point, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                {point.fait ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <span className={point.fait ? "text-muted-foreground line-through" : "font-medium"}>{point.label}</span>
                {point.fait && point.agent && (
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                    {point.heure} · {point.agent}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
