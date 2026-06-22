import { AlertTriangle, CheckCircle2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FRITEUSES = [
  {
    id: 1,
    nom: "Friteuse 1",
    zone: "Cuisine chaude",
    capacite: "10 litres",
    huile_actuelle: "Huile de tournesol",
    date_changement: "18 juin 2026",
    dernier_test: {
      date: "22 juin",
      heure: "11:00",
      agent: "Jean D.",
      acidite: 2.4,
      couleur: "claire",
      odeur: "normale",
      statut: "ok",
    },
    historique_changements: ["18 juin 2026", "9 juin 2026", "1 juin 2026"],
  },
  {
    id: 2,
    nom: "Friteuse 2",
    zone: "Cuisine chaude",
    capacite: "15 litres",
    huile_actuelle: "Huile de tournesol",
    date_changement: "12 juin 2026",
    dernier_test: {
      date: "22 juin",
      heure: "11:05",
      agent: "Jean D.",
      acidite: 27.8,
      couleur: "foncée",
      odeur: "rance",
      statut: "alerte",
    },
    historique_changements: ["12 juin 2026", "2 juin 2026", "24 mai 2026"],
  },
];

const HISTORIQUE_TESTS = [
  { date: "22 juin", friteuse: "Friteuse 1", acidite: "2,4 %", couleur: "claire", agent: "Jean D.", statut: "ok" },
  { date: "22 juin", friteuse: "Friteuse 2", acidite: "27,8 %", couleur: "foncée", agent: "Jean D.", statut: "alerte" },
  { date: "19 juin", friteuse: "Friteuse 1", acidite: "1,9 %", couleur: "claire", agent: "Sophie L.", statut: "ok" },
  {
    date: "19 juin",
    friteuse: "Friteuse 2",
    acidite: "22,1 %",
    couleur: "légèrement foncée",
    agent: "Sophie L.",
    statut: "ok",
  },
  { date: "18 juin", friteuse: "Friteuse 1", acidite: "0,8 %", couleur: "claire", agent: "Jean D.", statut: "ok" },
  { date: "18 juin", friteuse: "Friteuse 2", acidite: "18,5 %", couleur: "ambrée", agent: "Jean D.", statut: "ok" },
];

export default function HuilesPage() {
  const alertes = FRITEUSES.filter((f) => f.dernier_test.statut === "alerte").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contrôle des huiles</h1>
          <p className="text-muted-foreground text-sm">
            {FRITEUSES.length} friteuse{FRITEUSES.length > 1 ? "s" : ""} · limite réglementaire : acidité &lt; 25 %
            {alertes > 0 && (
              <span className="ml-2 font-semibold text-red-600">
                · {alertes} dépassement{alertes > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Tests et changements via l&apos;app mobile
        </div>
      </div>

      {/* État friteuses */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FRITEUSES.map((f) => {
          const nc = f.dernier_test.statut === "alerte";
          return (
            <Card key={f.id} className={nc ? "border-red-200 bg-red-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{f.nom}</CardTitle>
                  {nc ? <Badge variant="destructive">À changer</Badge> : <Badge variant="default">Conforme</Badge>}
                </div>
                <p className="text-muted-foreground text-xs">
                  {f.zone} · {f.capacite}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white p-2.5">
                    <p className="text-muted-foreground text-xs">Acidité</p>
                    <p className={`font-mono text-xl font-bold ${nc ? "text-red-600" : ""}`}>
                      {f.dernier_test.acidite} %
                    </p>
                    <p className="text-muted-foreground text-xs">limite : 25 %</p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5">
                    <p className="text-muted-foreground text-xs">Couleur / Odeur</p>
                    <p className="text-sm font-semibold capitalize">{f.dernier_test.couleur}</p>
                    <p className="text-muted-foreground text-xs capitalize">{f.dernier_test.odeur}</p>
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">
                  <p>
                    Dernier test : {f.dernier_test.date} à {f.dernier_test.heure} par {f.dernier_test.agent}
                  </p>
                  <p>
                    Huile changée le : <span className="font-medium">{f.date_changement}</span>
                  </p>
                  <p>Huile : {f.huile_actuelle}</p>
                </div>
                {nc && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-100 p-2.5 text-xs text-red-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Acidité dépassant la limite réglementaire (25 %) — changement d&apos;huile obligatoire avant
                    utilisation
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Historique changements :</p>
                  <div className="flex flex-wrap gap-1">
                    {f.historique_changements.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Référentiel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Référentiel réglementaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
            L&apos;arrêté du 15 mai 1985 impose le changement d&apos;huile lorsque la teneur en composés polaires
            dépasse 25 %. Les tests doivent être effectués régulièrement (au minimum à chaque changement de friture).
          </div>
          <div className="divide-y">
            {[
              { critere: "Composés polaires (acidité)", limite: "< 25 %", frequence: "Chaque jour d'utilisation" },
              { critere: "Couleur", limite: "Claire à ambrée", frequence: "Visuel à chaque service" },
              { critere: "Odeur", limite: "Neutre", frequence: "Olfactif à chaque service" },
              { critere: "Mousses / fumée bleue", limite: "Absence", frequence: "Pendant utilisation" },
            ].map((ref, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{ref.critere}</p>
                  <p className="text-muted-foreground text-xs">{ref.frequence}</p>
                </div>
                <span className="font-mono text-sm font-semibold">{ref.limite}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historique tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {HISTORIQUE_TESTS.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-14 shrink-0 text-xs">{t.date}</span>
                  <div>
                    <p className="font-medium">{t.friteuse}</p>
                    <p className="text-muted-foreground text-xs">
                      Couleur : {t.couleur} · {t.agent}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{t.acidite}</span>
                  <Badge variant={t.statut === "ok" ? "default" : "destructive"}>{t.statut}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
