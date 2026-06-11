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

const PLANNING_JOUR = [
  { nom: "Alice Martin", poste: "Serveuse", debut: "09:00", fin: "15:00", statut: "en poste" },
  { nom: "Bob Dupont", poste: "Cuisinier", debut: "08:00", fin: "16:00", statut: "en poste" },
  { nom: "Charlie Morel", poste: "Barman", debut: "12:00", fin: "22:00", statut: "à venir" },
  { nom: "Diana Petit", poste: "Manager", debut: "10:00", fin: "18:00", statut: "en poste" },
  { nom: "Eric Bernard", poste: "Serveur", debut: "18:00", fin: "24:00", statut: "à venir" },
  { nom: "Sophie Laurent", poste: "Serveuse", debut: "18:00", fin: "24:00", statut: "à venir" },
];

const ALERTES = [
  { type: "warning", msg: "2 shifts sans employé assigné — vendredi 13 juin" },
  { type: "info", msg: "Contrat de Marc Bonnet expire le 30 juin" },
  { type: "warning", msg: "Eric Bernard dépasse 35h cette semaine (+3h)" },
];

const statutColor: Record<string, "default" | "secondary" | "outline"> = {
  "en poste": "default",
  "à venir": "secondary",
  absent: "outline",
};

const alertColor: Record<string, string> = {
  warning: "border-l-amber-400 bg-amber-50 dark:bg-amber-950/20",
  info: "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20",
};

export default function RhPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">RH</h1>
        <p className="text-muted-foreground text-sm">Semaine 24 · mardi 10 juin 2025</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Effectif aujourd'hui" value="6" sub="sur 8 employés actifs" />
        <KpiCard label="Heures planifiées (sem.)" value="187 h" sub="budget 200 h" />
        <KpiCard label="Coût masse salariale" value="4 820 €" sub="estimation semaine" />
        <KpiCard label="Absences en cours" value="1" sub="Sophie Laurent — congés" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Planning du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {PLANNING_JOUR.map((e) => (
                <div key={e.nom} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{e.nom}</p>
                    <p className="text-muted-foreground text-xs">{e.poste}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono text-xs">
                      {e.debut} – {e.fin}
                    </span>
                    <Badge variant={statutColor[e.statut]}>{e.statut}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alertes RH</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ALERTES.map((a, i) => (
              <div key={i} className={`rounded-r border-l-4 px-3 py-2 text-sm ${alertColor[a.type]}`}>
                {a.msg}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Heures planifiées cette semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PLANNING_JOUR.map((e) => {
              const h = Math.floor(Math.random() * 15) + 20;
              const pct = Math.round((h / 35) * 100);
              return (
                <div key={e.nom} className="flex items-center gap-4 text-sm">
                  <span className="w-32 truncate font-medium">{e.nom}</span>
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div
                      className={`h-2 rounded-full ${pct > 100 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-14 text-right text-xs">{h}h / 35h</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
