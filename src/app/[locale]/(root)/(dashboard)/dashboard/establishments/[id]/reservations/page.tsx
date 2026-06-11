import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KpiCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </CardContent>
  </Card>
);

const RESERVATIONS = [
  { heure: "12:00", nom: "Martin Sophie", couverts: 4, statut: "confirmé", table: "T3" },
  { heure: "12:00", nom: "Dupont Paul", couverts: 2, statut: "confirmé", table: "T7" },
  { heure: "12:30", nom: "Bernard Claire", couverts: 6, statut: "en attente", table: "T1" },
  { heure: "13:00", nom: "Moreau Jean", couverts: 3, statut: "confirmé", table: "T5" },
  { heure: "19:30", nom: "Petit Isabelle", couverts: 8, statut: "confirmé", table: "T2" },
  { heure: "20:00", nom: "Leroy Marc", couverts: 2, statut: "confirmé", table: "T8" },
  { heure: "20:00", nom: "Simon Anne", couverts: 5, statut: "en attente", table: "T4" },
  { heure: "20:30", nom: "Blanc Thomas", couverts: 4, statut: "confirmé", table: "T6" },
];

const SERVICES = [
  { label: "Midi (12h–15h)", reservations: 12, couverts: 38, capacite: 50 },
  { label: "Soir (19h–23h)", reservations: 18, couverts: 64, capacite: 80 },
];

const statutColor: Record<string, "default" | "secondary" | "outline"> = {
  confirmé: "default",
  "en attente": "secondary",
  annulé: "outline",
};

export default function ReservationsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Réservations</h1>
        <p className="text-muted-foreground text-sm">Journée du mardi 10 juin 2025</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Réservations du jour" value="30" sub="12 midi · 18 soir" />
        <KpiCard label="Couverts attendus" value="102" sub="capacité totale 130" />
        <KpiCard label="Taux de remplissage" value="78 %" sub="+5pts vs semaine passée" />
        <KpiCard label="No-shows (7 jours)" value="3" sub="2,9 % des réservations" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Taux de remplissage par service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SERVICES.map((s) => {
              const pct = Math.round((s.couverts / s.capacite) * 100);
              return (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {s.couverts} / {s.capacite} couverts ({pct} %)
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full rounded-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-muted-foreground text-xs">{s.reservations} réservations</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Prochaines arrivées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {RESERVATIONS.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-10 font-mono text-xs">{r.heure}</span>
                  <div>
                    <p className="font-medium">{r.nom}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.couverts} couverts · {r.table}
                    </p>
                  </div>
                </div>
                <Badge variant={statutColor[r.statut]}>{r.statut}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Toutes les réservations du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RESERVATIONS.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-10 font-mono text-xs">{r.heure}</span>
                  <span className="font-medium">{r.nom}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.couverts} cvts · {r.table}
                  </span>
                </div>
                <Badge variant={statutColor[r.statut]}>{r.statut}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
