import { Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TypeControle = "cuisson" | "refroidissement" | "remise_chauffe" | "service";

const TYPE_LABEL: Record<TypeControle, string> = {
  cuisson: "Cuisson",
  refroidissement: "Refroidissement rapide",
  remise_chauffe: "Remise en chauffe",
  service: "Service / maintien chaud",
};

const TYPE_COLOR: Record<TypeControle, "default" | "secondary" | "outline" | "destructive"> = {
  cuisson: "default",
  refroidissement: "secondary",
  remise_chauffe: "outline",
  service: "default",
};

const RELEVES = [
  {
    date: "22 juin",
    heure: "12:15",
    plat: "Poulet rôti",
    type: "cuisson" as TypeControle,
    temp: 78,
    limite: "> 75 °C",
    conforme: true,
    agent: "Marie T.",
    note: null,
  },
  {
    date: "22 juin",
    heure: "12:30",
    plat: "Bœuf braisé",
    type: "remise_chauffe" as TypeControle,
    temp: 68,
    limite: "> 63 °C",
    conforme: true,
    agent: "Marie T.",
    note: null,
  },
  {
    date: "22 juin",
    heure: "12:00",
    plat: "Soupe de légumes",
    type: "service" as TypeControle,
    temp: 71,
    limite: "> 63 °C",
    conforme: true,
    agent: "Jean D.",
    note: null,
  },
  {
    date: "21 juin",
    heure: "15:30",
    plat: "Blanquette de veau",
    type: "refroidissement" as TypeControle,
    temp: 28,
    limite: "< 10 °C en 2h",
    conforme: false,
    agent: "Sophie L.",
    note: "T° insuffisante après 2h — produit mis en cellule de refroidissement, atteint 8°C à 16h30",
  },
  {
    date: "21 juin",
    heure: "12:10",
    plat: "Saumon grillé",
    type: "cuisson" as TypeControle,
    temp: 65,
    limite: "> 63 °C",
    conforme: true,
    agent: "Marie T.",
    note: null,
  },
  {
    date: "21 juin",
    heure: "11:45",
    plat: "Omelette nature",
    type: "cuisson" as TypeControle,
    temp: 72,
    limite: "> 70 °C",
    conforme: true,
    agent: "Jean D.",
    note: null,
  },
  {
    date: "20 juin",
    heure: "14:00",
    plat: "Fond de veau",
    type: "refroidissement" as TypeControle,
    temp: 7,
    limite: "< 10 °C en 2h",
    conforme: true,
    agent: "Sophie L.",
    note: null,
  },
  {
    date: "20 juin",
    heure: "12:20",
    plat: "Volaille rôtie",
    type: "cuisson" as TypeControle,
    temp: 82,
    limite: "> 75 °C",
    conforme: true,
    agent: "Marie T.",
    note: null,
  },
];

const LIMITES_REFERENCE = [
  { type: "Cuisson volaille / porc / haché", limite: "Cœur > 75 °C" },
  { type: "Cuisson bœuf / veau entier", limite: "Cœur > 63 °C" },
  { type: "Cuisson poisson", limite: "Cœur > 63 °C" },
  { type: "Remise en chauffe", limite: "Cœur > 63 °C en < 1h" },
  { type: "Maintien au chaud / service", limite: "> 63 °C en permanence" },
  { type: "Refroidissement rapide", limite: "+ 63 °C → + 10 °C en < 2h" },
];

export default function TemperaturesProduitPage() {
  const nonConformes = RELEVES.filter((r) => !r.conforme).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Températures produit</h1>
          <p className="text-muted-foreground text-sm">
            Cuisson, refroidissement, remise en chauffe, service
            {nonConformes > 0 && (
              <span className="ml-2 font-semibold text-red-600">
                · {nonConformes} non-conforme{nonConformes > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie relevés via l&apos;app mobile
        </div>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(["cuisson", "refroidissement", "remise_chauffe", "service"] as TypeControle[]).map((type) => {
          const items = RELEVES.filter((r) => r.type === type);
          const nc = items.filter((r) => !r.conforme).length;
          return (
            <Card key={type} className={nc > 0 ? "border-red-200 bg-red-50" : ""}>
              <CardContent className="pt-4">
                <Badge variant={TYPE_COLOR[type]} className="mb-1">
                  {TYPE_LABEL[type]}
                </Badge>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-muted-foreground text-xs">
                  relevés · {nc > 0 ? <span className="font-semibold text-red-600">{nc} NC</span> : "tous conformes"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Relevés (7 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RELEVES.map((r, i) => (
              <div key={i} className={`py-3 text-sm ${!r.conforme ? "-mx-4 bg-red-50 px-4" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="text-muted-foreground w-20 shrink-0 text-xs">
                      <p>{r.date}</p>
                      <p className="font-mono">{r.heure}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{r.plat}</p>
                        <Badge variant={TYPE_COLOR[r.type]} className="text-xs">
                          {TYPE_LABEL[r.type]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Limite : {r.limite} · {r.agent}
                      </p>
                      {r.note && <p className="mt-1 text-xs text-amber-700 italic">{r.note}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-bold">{r.temp} °C</span>
                    <Badge variant={r.conforme ? "default" : "destructive"}>
                      {r.conforme ? "conforme" : "non conforme"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Référentiel températures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Référentiel réglementaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {LIMITES_REFERENCE.map((ref, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{ref.type}</span>
                <span className="font-mono font-semibold">{ref.limite}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
