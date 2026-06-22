import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FOURNISSEURS = [
  {
    id: 1,
    nom: "Boucherie Martin",
    categorie: "Viandes & charcuterie",
    contact: "M. Martin — 04 72 XX XX XX",
    agrement_ce: "FR 69.001.001 CE",
    agrement_valide: true,
    derniere_reception: "22 juin",
    nc_30_jours: 0,
    nc_historique: 1,
    note_qualite: 4.8,
    certifications: ["CE", "Label Rouge", "Agriculture Française"],
    livraison_freq: "Lundi, Mercredi, Vendredi",
  },
  {
    id: 2,
    nom: "Marée Bleue",
    categorie: "Poissons & fruits de mer",
    contact: "Mme Leclerc — 04 72 XX XX XX",
    agrement_ce: "FR 13.002.004 CE",
    agrement_valide: true,
    derniere_reception: "22 juin",
    nc_30_jours: 0,
    nc_historique: 0,
    note_qualite: 4.9,
    certifications: ["CE", "MSC"],
    livraison_freq: "Mardi, Jeudi, Samedi",
  },
  {
    id: 3,
    nom: "Rungis Express",
    categorie: "Fruits & légumes",
    contact: "M. Fontaine — 01 46 XX XX XX",
    agrement_ce: null,
    agrement_valide: true,
    derniere_reception: "21 juin",
    nc_30_jours: 1,
    nc_historique: 3,
    note_qualite: 3.6,
    certifications: ["GlobalG.A.P."],
    livraison_freq: "Lundi au Vendredi",
  },
  {
    id: 4,
    nom: "Laiterie Régionale",
    categorie: "Produits laitiers",
    contact: "Mme Rousseau — 04 74 XX XX XX",
    agrement_ce: "FR 01.003.002 CE",
    agrement_valide: true,
    derniere_reception: "20 juin",
    nc_30_jours: 0,
    nc_historique: 0,
    note_qualite: 4.7,
    certifications: ["CE", "AOP"],
    livraison_freq: "Lundi, Jeudi",
  },
  {
    id: 5,
    nom: "Metro (épicerie sèche)",
    categorie: "Épicerie, conserves, surgelés",
    contact: "Compte client #4571",
    agrement_ce: null,
    agrement_valide: true,
    derniere_reception: "20 juin",
    nc_30_jours: 0,
    nc_historique: 0,
    note_qualite: 4.2,
    certifications: [],
    livraison_freq: "Commande en magasin",
  },
];

const NC_FOURNISSEUR = [
  {
    date: "21 juin",
    fournisseur: "Rungis Express",
    description: "Légumes reçus à 8,5 °C — limite 8 °C — livraison refusée",
    action: "Retour effectué, 2e livraison à 6,1 °C acceptée",
    statut: "clôturé",
  },
  {
    date: "19 juin",
    fournisseur: "Boucherie Martin",
    description: "Carton légèrement humide — produit conforme",
    action: "Signalement fournisseur, accepté avec réserve",
    statut: "clôturé",
  },
];

export default function FournisseursHaccpPage() {
  const avecNc = FOURNISSEURS.filter((f) => f.nc_30_jours > 0).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Fournisseurs</h1>
        <p className="text-muted-foreground text-sm">
          {FOURNISSEURS.length} fournisseurs référencés · {avecNc} avec non-conformité sur 30 jours
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Le Plan de Maîtrise Sanitaire impose d&apos;évaluer régulièrement ses fournisseurs et de conserver les preuves
        de leurs agréments et certifications. Chaque non-conformité réception doit être tracée.
      </div>

      {/* Liste fournisseurs */}
      <div className="space-y-3">
        {FOURNISSEURS.map((f) => (
          <Card key={f.id} className={f.nc_30_jours > 0 ? "border-amber-200 bg-amber-50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {f.nc_30_jours === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <p className="font-semibold">{f.nom}</p>
                  </div>
                  <p className="text-muted-foreground ml-6 text-xs">
                    {f.categorie} · {f.contact}
                  </p>
                  <p className="text-muted-foreground ml-6 text-xs">Livraison : {f.livraison_freq}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{f.note_qualite.toFixed(1)}</p>
                  <p className="text-muted-foreground text-xs">note qualité</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {f.agrement_ce ? (
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-3 w-3" /> Agrément CE : {f.agrement_ce}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pas d&apos;agrément CE requis</span>
                )}
                <span className="text-muted-foreground">Dernière livraison : {f.derniere_reception}</span>
                {f.nc_30_jours > 0 && (
                  <span className="font-semibold text-amber-700">{f.nc_30_jours} NC (30 jours)</span>
                )}
                <span className="text-muted-foreground">{f.nc_historique} NC total</span>
              </div>

              {f.certifications.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.certifications.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NC par fournisseur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Non-conformités fournisseurs (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {NC_FOURNISSEUR.map((nc, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{nc.fournisseur}</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{nc.date}</span>
                  <Badge variant="default">{nc.statut}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{nc.description}</p>
              <p className="mt-1 text-xs text-green-700">↳ {nc.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
