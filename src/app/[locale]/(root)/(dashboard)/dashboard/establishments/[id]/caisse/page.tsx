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

const TRANSACTIONS = [
  { id: "#1042", heure: "12:14", montant: "38,50 €", mode: "CB", items: 3 },
  { id: "#1043", heure: "12:31", montant: "22,00 €", mode: "Espèces", items: 2 },
  { id: "#1044", heure: "13:05", montant: "67,80 €", mode: "CB", items: 5 },
  { id: "#1045", heure: "13:22", montant: "14,50 €", mode: "CB", items: 1 },
  { id: "#1046", heure: "14:10", montant: "89,20 €", mode: "CB", items: 6 },
];

const TOP_PRODUITS = [
  { nom: "Entrecôte 300g", qte: 14, ca: "462,00 €" },
  { nom: "Menu du jour", qte: 11, ca: "176,00 €" },
  { nom: "Tarte tatin", qte: 9, ca: "63,00 €" },
  { nom: "Verre de vin rouge", qte: 22, ca: "110,00 €" },
];

const HEURES = [
  { h: "10h", pct: 8 },
  { h: "11h", pct: 15 },
  { h: "12h", pct: 85 },
  { h: "13h", pct: 100 },
  { h: "14h", pct: 60 },
  { h: "15h", pct: 20 },
  { h: "16h", pct: 10 },
  { h: "17h", pct: 12 },
  { h: "18h", pct: 25 },
  { h: "19h", pct: 72 },
  { h: "20h", pct: 95 },
  { h: "21h", pct: 88 },
  { h: "22h", pct: 45 },
];

export default function CaissePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Caisse</h1>
        <p className="text-muted-foreground text-sm">Journée du mardi 10 juin 2025</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="CA du jour" value="1 842,50 €" sub="+12% vs hier" />
        <KpiCard label="Transactions" value="48" sub="dont 3 annulations" />
        <KpiCard label="Ticket moyen" value="38,40 €" sub="vs 34,20 € hier" />
        <KpiCard label="Taux CB" value="87 %" sub="10 paiements espèces" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">CA par heure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1.5">
              {HEURES.map(({ h, pct }) => (
                <div key={h} className="flex flex-1 flex-col items-center gap-1">
                  <div className="bg-primary/80 w-full rounded-t" style={{ height: `${pct}%` }} />
                  <span className="text-muted-foreground text-[10px]">{h}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top produits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOP_PRODUITS.map((p) => (
              <div key={p.nom} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.nom}</p>
                  <p className="text-muted-foreground text-xs">×{p.qte}</p>
                </div>
                <span className="font-semibold">{p.ca}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {TRANSACTIONS.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono text-xs">{t.id}</span>
                  <span className="text-muted-foreground text-xs">{t.heure}</span>
                  <span>
                    {t.items} article{t.items > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{t.mode}</Badge>
                  <span className="font-semibold">{t.montant}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
