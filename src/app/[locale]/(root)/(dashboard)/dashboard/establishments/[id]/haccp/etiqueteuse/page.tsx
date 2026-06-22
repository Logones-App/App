import { AlertTriangle, Info, Printer, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AUJOURD_HUI = "22 juin 2026";

const ETIQUETTES_RECENTES = [
  {
    id: 1,
    produit: "Fromage blanc",
    ouvert_le: "22 juin",
    ouvert_heure: "07:00",
    dlc: "25 juin",
    jours_restants: 3,
    agent: "Jean D.",
    statut: "ok",
  },
  {
    id: 2,
    produit: "Crème fraîche épaisse",
    ouvert_le: "22 juin",
    ouvert_heure: "07:00",
    dlc: "25 juin",
    jours_restants: 3,
    agent: "Jean D.",
    statut: "ok",
  },
  {
    id: 3,
    produit: "Fond de veau maison",
    ouvert_le: "22 juin",
    ouvert_heure: "14:00",
    dlc: "25 juin",
    jours_restants: 3,
    agent: "Marie D.",
    statut: "ok",
  },
  {
    id: 4,
    produit: "Mayonnaise maison",
    ouvert_le: "21 juin",
    ouvert_heure: "09:00",
    dlc: "23 juin",
    jours_restants: 1,
    agent: "Sophie L.",
    statut: "attention",
  },
  {
    id: 5,
    produit: "Sauce vinaigrette",
    ouvert_le: "20 juin",
    ouvert_heure: "10:00",
    dlc: "22 juin",
    jours_restants: 0,
    agent: "Jean D.",
    statut: "expire_aujourd_hui",
  },
  {
    id: 6,
    produit: "Blanquette de veau",
    ouvert_le: "20 juin",
    ouvert_heure: "15:00",
    dlc: "23 juin",
    jours_restants: 1,
    agent: "Sophie L.",
    statut: "attention",
  },
  {
    id: 7,
    produit: "Poireaux vinaigrette",
    ouvert_le: "19 juin",
    ouvert_heure: "11:00",
    dlc: "21 juin",
    jours_restants: -1,
    agent: "Marie D.",
    statut: "expire",
  },
];

const REGLES_DLC = [
  { categorie: "Préparations maison (froides)", duree: "J + 3 jours", detail: "Mayonnaises, vinaigrettes, mousses…" },
  { categorie: "Viandes cuites", duree: "J + 3 jours", detail: "Blanquette, rôtis, volailles cuites…" },
  { categorie: "Fonds et sauces", duree: "J + 3 jours", detail: "Fond de veau, jus, sauces cuites…" },
  { categorie: "Produits laitiers ouverts", duree: "J + 3 jours", detail: "Crème, fromage blanc, yaourts…" },
  { categorie: "Poissons cuits", duree: "J + 2 jours", detail: "Filets, terrines de poisson…" },
  { categorie: "Fruits de mer cuits", duree: "J + 1 jour", detail: "Crevettes, moules, saint-jacques…" },
];

export default function EtiqueteusePage() {
  const expires = ETIQUETTES_RECENTES.filter((e) => e.statut === "expire").length;
  const expireAujourdhui = ETIQUETTES_RECENTES.filter((e) => e.statut === "expire_aujourd_hui").length;
  const attention = ETIQUETTES_RECENTES.filter((e) => e.statut === "attention").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Étiqueteuse DLC</h1>
          <p className="text-muted-foreground text-sm">
            Traçabilité des produits ouverts et préparations maison · {AUJOURD_HUI}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Génération étiquettes via l&apos;app mobile
        </div>
      </div>

      {/* Alertes */}
      {(expires > 0 || expireAujourdhui > 0) && (
        <div className="space-y-2">
          {expires > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>
                  {expires} produit{expires > 1 ? "s" : ""} périmé{expires > 1 ? "s" : ""}
                </strong>{" "}
                — à retirer immédiatement du service
              </span>
            </div>
          )}
          {expireAujourdhui > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>
                  {expireAujourdhui} produit{expireAujourdhui > 1 ? "s" : ""} expire{expireAujourdhui > 1 ? "nt" : ""}{" "}
                  aujourd&apos;hui
                </strong>{" "}
                — à utiliser avant la fin du service
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{ETIQUETTES_RECENTES.length}</p>
            <p className="text-muted-foreground text-sm">Étiquettes actives</p>
          </CardContent>
        </Card>
        <Card className={expires > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${expires > 0 ? "text-red-600" : ""}`}>{expires}</p>
            <p className="text-muted-foreground text-sm">Périmé{expires > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className={expireAujourdhui > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${expireAujourdhui > 0 ? "text-orange-600" : ""}`}>{expireAujourdhui}</p>
            <p className="text-muted-foreground text-sm">Expire aujourd&apos;hui</p>
          </CardContent>
        </Card>
        <Card className={attention > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${attention > 0 ? "text-amber-600" : ""}`}>{attention}</p>
            <p className="text-muted-foreground text-sm">Expire demain</p>
          </CardContent>
        </Card>
      </div>

      {/* Étiquettes en cours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Étiquettes actives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ETIQUETTES_RECENTES.map((e) => {
            const borderClass =
              e.statut === "expire"
                ? "border-red-300 bg-red-50"
                : e.statut === "expire_aujourd_hui"
                  ? "border-orange-300 bg-orange-50"
                  : e.statut === "attention"
                    ? "border-amber-200 bg-amber-50"
                    : "";
            return (
              <div
                key={e.id}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${borderClass}`}
              >
                <div>
                  <p className="font-semibold">{e.produit}</p>
                  <p className="text-muted-foreground text-xs">
                    Ouvert le {e.ouvert_le} à {e.ouvert_heure} · {e.agent}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold">DLC</p>
                    <p className="font-mono text-sm font-bold">{e.dlc}</p>
                  </div>
                  {e.statut === "expire" && <Badge variant="destructive">Périmé</Badge>}
                  {e.statut === "expire_aujourd_hui" && <Badge variant="destructive">Expire ce soir</Badge>}
                  {e.statut === "attention" && <Badge variant="secondary">J-{e.jours_restants}</Badge>}
                  {e.statut === "ok" && <Badge variant="default">J-{e.jours_restants}</Badge>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Règles DLC */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Durées de conservation réglementaires</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Règle générale HACCP : les préparations maison et produits ouverts se conservent au maximum 3 jours à +4 °C.
            Ces durées peuvent être réduites selon la nature du produit.
          </div>
          <div className="divide-y">
            {REGLES_DLC.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{r.categorie}</p>
                  <p className="text-muted-foreground text-xs">{r.detail}</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {r.duree}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
