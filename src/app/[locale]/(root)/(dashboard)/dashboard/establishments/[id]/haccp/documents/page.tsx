import { Download, FileText, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DocStatut = "valide" | "à renouveler" | "expiré";
type DocCategorie = "pms" | "agrement" | "protocole" | "formation" | "controle" | "chimique";

const CAT_LABEL: Record<DocCategorie, string> = {
  pms: "Plan de Maîtrise Sanitaire",
  agrement: "Agréments & certifications",
  protocole: "Protocoles & procédures",
  formation: "Formations HACCP",
  controle: "Contrôles extérieurs",
  chimique: "Produits chimiques",
};

const CAT_COLOR: Record<DocCategorie, "default" | "secondary" | "outline"> = {
  pms: "default",
  agrement: "default",
  protocole: "secondary",
  formation: "secondary",
  controle: "outline",
  chimique: "outline",
};

const DOCUMENTS: {
  id: number;
  nom: string;
  categorie: DocCategorie;
  version: string;
  date_creation: string;
  date_validite: string | null;
  statut: DocStatut;
  taille: string;
  description: string;
}[] = [
  {
    id: 1,
    nom: "Plan de Maîtrise Sanitaire — Version 2.1",
    categorie: "pms",
    version: "v2.1",
    date_creation: "1 janvier 2026",
    date_validite: null,
    statut: "valide",
    taille: "1,2 Mo",
    description: "Document principal HACCP — analyse des dangers, CCP, procédures de maîtrise",
  },
  {
    id: 2,
    nom: "Agrément sanitaire établissement",
    categorie: "agrement",
    version: "—",
    date_creation: "15 mars 2022",
    date_validite: null,
    statut: "valide",
    taille: "245 Ko",
    description: "N° FR69.XXX.XXX CE — Délivré par la DDPP du Rhône",
  },
  {
    id: 3,
    nom: "Protocole nettoyage et désinfection",
    categorie: "protocole",
    version: "v1.3",
    date_creation: "10 septembre 2025",
    date_validite: null,
    statut: "valide",
    taille: "380 Ko",
    description: "Protocoles par zone, produits utilisés, fréquences et méthodes",
  },
  {
    id: 4,
    nom: "Attestation formation HACCP — Jean Dupont",
    categorie: "formation",
    version: "—",
    date_creation: "15 janvier 2025",
    date_validite: "15 janvier 2027",
    statut: "valide",
    taille: "120 Ko",
    description: "AFPA Lyon — Module hygiène alimentaire restauration commerciale",
  },
  {
    id: 5,
    nom: "Attestation formation HACCP — Marie Durand",
    categorie: "formation",
    version: "—",
    date_creation: "3 mars 2024",
    date_validite: "3 mars 2026",
    statut: "valide",
    taille: "118 Ko",
    description: "CCI Rhône-Alpes — Module hygiène alimentaire",
  },
  {
    id: 6,
    nom: "Attestation formation HACCP — Sophie Laurent",
    categorie: "formation",
    version: "—",
    date_creation: "15 juin 2023",
    date_validite: "15 juin 2025",
    statut: "expiré",
    taille: "115 Ko",
    description: "AFPA Lyon — Renouvellement à planifier",
  },
  {
    id: 7,
    nom: "Rapport contrôle antiparasitaire — Mai 2026",
    categorie: "controle",
    version: "—",
    date_creation: "15 mai 2026",
    date_validite: "15 novembre 2026",
    statut: "valide",
    taille: "290 Ko",
    description: "Société Rentokil — Aucune infestation détectée — prochain passage novembre 2026",
  },
  {
    id: 8,
    nom: "Rapport contrôle antiparasitaire — Nov. 2025",
    categorie: "controle",
    version: "—",
    date_creation: "8 novembre 2025",
    date_validite: "15 mai 2026",
    statut: "expiré",
    taille: "275 Ko",
    description: "Société Rentokil — Archivé",
  },
  {
    id: 9,
    nom: "Fiches de données sécurité — Produits nettoyants",
    categorie: "chimique",
    version: "2026",
    date_creation: "1 janvier 2026",
    date_validite: null,
    statut: "valide",
    taille: "2,1 Mo",
    description: "FDS dégraissant, désinfectant, produit four, javel — obligatoire par règlement CE 1907/2006",
  },
];

const statutBadge: Record<DocStatut, "default" | "destructive" | "secondary"> = {
  valide: "default",
  "à renouveler": "secondary",
  expiré: "destructive",
};

const CATEGORIES = [...new Set(DOCUMENTS.map((d) => d.categorie))] as DocCategorie[];

export default function DocumentsHaccpPage() {
  const expires = DOCUMENTS.filter((d) => d.statut === "expiré").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Documents HACCP</h1>
        <p className="text-muted-foreground text-sm">
          {DOCUMENTS.length} documents · {expires} expiré{expires > 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Le Plan de Maîtrise Sanitaire et tous les justificatifs associés doivent être disponibles lors des contrôles
        DDPP/DGCCRF. Durée de conservation minimale recommandée : 5 ans.
      </div>

      {CATEGORIES.map((cat) => {
        const docs = DOCUMENTS.filter((d) => d.categorie === cat);
        return (
          <Card key={cat}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">{CAT_LABEL[cat]}</CardTitle>
                <Badge variant={CAT_COLOR[cat]}>
                  {docs.length} doc{docs.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                    doc.statut === "expiré"
                      ? "border-red-200 bg-red-50"
                      : doc.statut === "à renouveler"
                        ? "border-amber-200 bg-amber-50"
                        : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">{doc.nom}</p>
                      <p className="text-muted-foreground text-xs">{doc.description}</p>
                      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                        <span>Ajouté le {doc.date_creation}</span>
                        {doc.date_validite && <span>· Valide jusqu&apos;au {doc.date_validite}</span>}
                        <span>· {doc.taille}</span>
                        {doc.version !== "—" && <span>· {doc.version}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={statutBadge[doc.statut]}>{doc.statut}</Badge>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
