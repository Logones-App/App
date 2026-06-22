import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMPLOYES = [
  {
    id: 1,
    nom: "Jean Dupont",
    poste: "Chef de cuisine",
    formation_haccp: {
      date: "15 janvier 2025",
      organisme: "AFPA Lyon",
      validite: "15 janvier 2027",
      statut: "valide",
    },
    habilitations: ["Manipulation denrées", "Nettoyage-désinfection", "Réception marchandises"],
    acces_app_mobile: true,
  },
  {
    id: 2,
    nom: "Marie Durand",
    poste: "Chef de partie",
    formation_haccp: {
      date: "3 mars 2024",
      organisme: "CCI Rhône-Alpes",
      validite: "3 mars 2026",
      statut: "valide",
    },
    habilitations: ["Manipulation denrées", "Nettoyage-désinfection"],
    acces_app_mobile: true,
  },
  {
    id: 3,
    nom: "Sophie Laurent",
    poste: "Commis",
    formation_haccp: {
      date: "15 juin 2023",
      organisme: "AFPA Lyon",
      validite: "15 juin 2025",
      statut: "expiré",
    },
    habilitations: ["Manipulation denrées"],
    acces_app_mobile: true,
  },
  {
    id: 4,
    nom: "Thomas Bernard",
    poste: "Plongeur",
    formation_haccp: {
      date: null,
      organisme: null,
      validite: null,
      statut: "absent",
    },
    habilitations: ["Nettoyage-désinfection"],
    acces_app_mobile: false,
  },
  {
    id: 5,
    nom: "Claire Martin",
    poste: "Chef pâtissier",
    formation_haccp: {
      date: "20 septembre 2024",
      organisme: "École hôtelière Lyon",
      validite: "20 septembre 2026",
      statut: "valide",
    },
    habilitations: ["Manipulation denrées", "Réception marchandises"],
    acces_app_mobile: true,
  },
];

const FORMATIONS_PLANIFIEES = [
  {
    employe: "Sophie Laurent",
    type: "Renouvellement HACCP",
    date_prevue: "15 juillet 2026",
    organisme: "AFPA Lyon",
    statut: "planifié",
  },
  {
    employe: "Thomas Bernard",
    type: "Formation HACCP initiale",
    date_prevue: "1 août 2026",
    organisme: "À définir",
    statut: "à planifier",
  },
];

const statutIcon = {
  valide: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  expiré: <AlertTriangle className="h-4 w-4 text-red-500" />,
  absent: <AlertTriangle className="h-4 w-4 text-orange-500" />,
};

const statutBadge: Record<string, "default" | "destructive" | "secondary"> = {
  valide: "default",
  expiré: "destructive",
  absent: "secondary",
};

export default function EmployesHaccpPage() {
  const valides = EMPLOYES.filter((e) => e.formation_haccp.statut === "valide").length;
  const expires = EMPLOYES.filter((e) => e.formation_haccp.statut === "expiré").length;
  const absents = EMPLOYES.filter((e) => e.formation_haccp.statut === "absent").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Employés & formations HACCP</h1>
        <p className="text-muted-foreground text-sm">
          {valides} formation{valides > 1 ? "s" : ""} valide{valides > 1 ? "s" : ""} · {expires + absents} à régulariser
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{valides}</p>
            <p className="text-muted-foreground text-sm">
              Formation{valides > 1 ? "s" : ""} valide{valides > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className={expires > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${expires > 0 ? "text-red-600" : ""}`}>{expires}</p>
            <p className="text-muted-foreground text-sm">Expirée{expires > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className={absents > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${absents > 0 ? "text-orange-600" : ""}`}>{absents}</p>
            <p className="text-muted-foreground text-sm">Sans formation</p>
          </CardContent>
        </Card>
      </div>

      {/* Info réglementaire */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La loi du 5 janvier 2010 (décret n°2011-731) impose qu&apos;au moins une personne par établissement soit
        titulaire d&apos;une attestation de formation à l&apos;hygiène alimentaire. Durée de validité : 2 ans
        recommandés.
      </div>

      {/* Liste employés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Équipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {EMPLOYES.map((emp) => (
            <div
              key={emp.id}
              className={`rounded-lg border p-3 text-sm ${
                emp.formation_haccp.statut === "expiré"
                  ? "border-red-200 bg-red-50"
                  : emp.formation_haccp.statut === "absent"
                    ? "border-orange-200 bg-orange-50"
                    : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {statutIcon[emp.formation_haccp.statut as keyof typeof statutIcon]}
                  <div>
                    <p className="font-semibold">{emp.nom}</p>
                    <p className="text-muted-foreground text-xs">{emp.poste}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statutBadge[emp.formation_haccp.statut]}>{emp.formation_haccp.statut}</Badge>
                  {emp.acces_app_mobile && (
                    <Badge variant="outline" className="text-xs">
                      App mobile
                    </Badge>
                  )}
                </div>
              </div>

              {emp.formation_haccp.date ? (
                <div className="text-muted-foreground mt-2 text-xs">
                  <p>
                    Formation : {emp.formation_haccp.date} · {emp.formation_haccp.organisme}
                  </p>
                  <p>
                    Valide jusqu&apos;au : <span className="font-semibold">{emp.formation_haccp.validite}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-orange-700">Aucune formation HACCP enregistrée</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1">
                {emp.habilitations.map((h, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Formations planifiées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Formations planifiées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FORMATIONS_PLANIFIEES.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-semibold">{f.employe}</p>
                <p className="text-muted-foreground text-xs">
                  {f.type} · {f.organisme}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">{f.date_prevue}</span>
                <Badge variant={f.statut === "planifié" ? "default" : "secondary"}>{f.statut}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
