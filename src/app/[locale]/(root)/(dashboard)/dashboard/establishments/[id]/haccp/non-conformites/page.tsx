import { AlertTriangle, CheckCircle2, Clock, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Statut = "ouvert" | "en cours" | "clôturé";
type Gravite = "critique" | "majeure" | "mineure";

const NON_CONFORMITES: {
  id: number;
  date: string;
  heure: string;
  categorie: string;
  description: string;
  zone: string;
  gravite: Gravite;
  statut: Statut;
  agent: string;
  action_corrective: string | null;
  date_cloture: string | null;
  responsable_action: string | null;
}[] = [
  {
    id: 1,
    date: "22 juin",
    heure: "13:00",
    categorie: "Température",
    description: "Vitrine réfrigérée à 7,2 °C (limite 6 °C)",
    zone: "Salle",
    gravite: "majeure",
    statut: "ouvert",
    agent: "Jean D.",
    action_corrective: null,
    date_cloture: null,
    responsable_action: null,
  },
  {
    id: 2,
    date: "8 juin",
    heure: "15:00",
    categorie: "Température",
    description: "Chambre froide positive à 5,2 °C (limite 4 °C) lors du relevé de l'après-midi",
    zone: "Cuisine",
    gravite: "majeure",
    statut: "en cours",
    agent: "Marie D.",
    action_corrective: "Vérification du joint de porte — commande joint en cours",
    date_cloture: null,
    responsable_action: "Chef de cuisine",
  },
  {
    id: 3,
    date: "21 juin",
    heure: "07:45",
    categorie: "Réception",
    description: "Livraison légumes Rungis Express à 8,5 °C — limite 8 °C",
    zone: "Réception marchandises",
    gravite: "mineure",
    statut: "clôturé",
    agent: "Marie D.",
    action_corrective: "Livraison refusée — remplacement effectué à 09:00 à 6,1 °C — fournisseur notifié",
    date_cloture: "21 juin",
    responsable_action: "Responsable réception",
  },
  {
    id: 4,
    date: "15 juin",
    heure: "11:00",
    categorie: "Nettoyage",
    description: "Fiche nettoyage friteuse non signée 2 jours consécutifs",
    zone: "Cuisine",
    gravite: "mineure",
    statut: "clôturé",
    agent: "Sophie L.",
    action_corrective: "Rappel équipe + mise en place check de fin de service",
    date_cloture: "16 juin",
    responsable_action: "Chef de cuisine",
  },
  {
    id: 5,
    date: "10 juin",
    heure: "08:30",
    categorie: "Réception",
    description: "Emballage viandes Boucherie Martin percé — contact possible avec l'extérieur",
    zone: "Réception marchandises",
    gravite: "critique",
    statut: "clôturé",
    agent: "Jean D.",
    action_corrective: "Produit isolé et détruit — fournisseur contacté — bon de retour émis — lot tracé",
    date_cloture: "10 juin",
    responsable_action: "Chef de cuisine",
  },
];

const graviteBadge: Record<Gravite, "destructive" | "secondary" | "outline"> = {
  critique: "destructive",
  majeure: "secondary",
  mineure: "outline",
};

const statutIcon = {
  ouvert: <AlertTriangle className="h-4 w-4 text-red-500" />,
  "en cours": <Clock className="h-4 w-4 text-amber-500" />,
  clôturé: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const statutBadge: Record<Statut, "destructive" | "secondary" | "default"> = {
  ouvert: "destructive",
  "en cours": "secondary",
  clôturé: "default",
};

export default function NonConformitesPage() {
  const ouvertes = NON_CONFORMITES.filter((nc) => nc.statut === "ouvert").length;
  const enCours = NON_CONFORMITES.filter((nc) => nc.statut === "en cours").length;
  const cloturees = NON_CONFORMITES.filter((nc) => nc.statut === "clôturé").length;
  const critiques = NON_CONFORMITES.filter((nc) => nc.gravite === "critique" && nc.statut !== "clôturé").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Non-conformités</h1>
          <p className="text-muted-foreground text-sm">
            {ouvertes} ouverte{ouvertes > 1 ? "s" : ""} · {enCours} en cours · {cloturees} clôturée
            {cloturees > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Signalement via l&apos;app mobile
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className={critiques > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${critiques > 0 ? "text-red-600" : ""}`}>{critiques}</p>
            <p className="text-muted-foreground text-sm">
              Critique{critiques > 1 ? "s" : ""} non clôturée{critiques > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className={ouvertes > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${ouvertes > 0 ? "text-orange-600" : ""}`}>{ouvertes}</p>
            <p className="text-muted-foreground text-sm">Ouverte{ouvertes > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{enCours}</p>
            <p className="text-muted-foreground text-sm">En cours de traitement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{cloturees}</p>
            <p className="text-muted-foreground text-sm">Clôturée{cloturees > 1 ? "s" : ""} (30 jours)</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Toutes les non-conformités</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {NON_CONFORMITES.map((nc) => (
            <div
              key={nc.id}
              className={`rounded-lg border p-4 text-sm ${
                nc.statut === "ouvert"
                  ? "border-red-200 bg-red-50"
                  : nc.statut === "en cours"
                    ? "border-amber-200 bg-amber-50"
                    : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {statutIcon[nc.statut]}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {nc.categorie} — {nc.zone}
                      </span>
                      <Badge variant={graviteBadge[nc.gravite]}>{nc.gravite}</Badge>
                      <Badge variant={statutBadge[nc.statut]}>{nc.statut}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {nc.date} à {nc.heure} · signalé par {nc.agent}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-sm">{nc.description}</p>

              {nc.action_corrective && (
                <div className="mt-2 rounded border-l-2 border-green-400 bg-green-50 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-green-700">Action corrective : </span>
                  <span className="text-green-800">{nc.action_corrective}</span>
                  {nc.responsable_action && (
                    <span className="text-muted-foreground ml-1">· {nc.responsable_action}</span>
                  )}
                </div>
              )}

              {nc.date_cloture && <p className="text-muted-foreground mt-1 text-xs">Clôturée le {nc.date_cloture}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
