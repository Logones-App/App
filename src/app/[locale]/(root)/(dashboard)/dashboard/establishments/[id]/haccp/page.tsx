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

const RELEVES = [
  { zone: "Chambre froide positive", heure: "07:00", temp: "3,2 °C", limite: "0–4 °C", statut: "ok" },
  { zone: "Chambre froide positive", heure: "13:00", temp: "4,1 °C", limite: "0–4 °C", statut: "alerte" },
  { zone: "Chambre froide négative", heure: "07:00", temp: "-18,5 °C", limite: "< -18 °C", statut: "ok" },
  { zone: "Chambre froide négative", heure: "13:00", temp: "—", limite: "< -18 °C", statut: "manquant" },
  { zone: "Plonge", heure: "12:30", temp: "82 °C", limite: "> 80 °C", statut: "ok" },
  { zone: "Bain-marie sauces", heure: "12:00", temp: "63 °C", limite: "> 63 °C", statut: "ok" },
];

const NON_CONFORMITES = [
  {
    date: "8 juin",
    zone: "Chambre froide positive",
    desc: "Temp. 5,2 °C à 15h00",
    action: "Vérification joint porte",
    statut: "en cours",
  },
  {
    date: "5 juin",
    zone: "Réception marchandises",
    desc: "Viande reçue à 9 °C",
    action: "Retour fournisseur effectué",
    statut: "clôturé",
  },
];

const statutColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  alerte: "destructive",
  manquant: "secondary",
};

const ncColor: Record<string, "default" | "secondary" | "outline"> = {
  "en cours": "secondary",
  clôturé: "default",
};

export default function HaccpPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">HACCP</h1>
        <p className="text-muted-foreground text-sm">Plan de contrôle · mardi 10 juin 2025</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Contrôles du jour" value="5 / 6" sub="1 relevé manquant" />
        <KpiCard label="Conformité du jour" value="83 %" sub="1 alerte température" />
        <KpiCard label="Non-conformités ouvertes" value="1" sub="depuis le 8 juin" />
        <KpiCard label="Prochaine échéance" value="19:00" sub="Relevé soir — chambre froide" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Relevés de température du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RELEVES.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-10 font-mono text-xs">{r.heure}</span>
                  <div>
                    <p className="font-medium">{r.zone}</p>
                    <p className="text-muted-foreground text-xs">Limite : {r.limite}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{r.temp}</span>
                  <Badge variant={statutColor[r.statut]}>{r.statut}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Non-conformités récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {NON_CONFORMITES.map((nc, i) => (
            <div key={i} className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{nc.zone}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{nc.date}</span>
                  <Badge variant={ncColor[nc.statut]}>{nc.statut}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground">{nc.desc}</p>
              <p className="text-xs">Action : {nc.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
