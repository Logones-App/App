"use client";

import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DocJson, type DocLigne } from "@/lib/queries/doc-import-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function isLowConfidence(json: DocJson, field: string): boolean {
  return json[`_confidence_${field}`] === "low" || json[`_${field}_confidence`] === "low";
}

function Field({
  label,
  value,
  uncertain,
  onChange,
}: {
  label: string;
  value: string;
  uncertain?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`space-y-1 ${uncertain ? "rounded border border-yellow-400 p-2" : ""}`}>
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {uncertain && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

type Props = {
  formData: DocJson;
  docType: string | null;
  onChange: (key: string, value: unknown) => void;
  section?: "fields" | "lines";
};

export function DocumentDetailForm({ formData, docType, onChange, section }: Props) {
  const str = (k: keyof DocJson) => (formData[k] != null ? String(formData[k]) : "");
  const u = (k: string) => isLowConfidence(formData, k);
  const upd = (k: string) => (v: string) => onChange(k, v || null);

  const lignes: DocLigne[] = Array.isArray(formData.lignes) ? formData.lignes : [];
  const sumHT = lignes.reduce((acc, l) => acc + (Number(l.total_ht) || 0), 0);
  const declared_ht = Number(formData.total_ht) || 0;
  const ecart = Math.abs(sumHT - declared_ht);
  const hasEcart = docType === "facture" && lignes.length > 0 && ecart > 0.01;

  if (section === "lines") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Lignes articles ({lignes.length})</p>
        {lignes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune ligne détectée.</p>
        ) : (
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Référence</TableHead>
                  <TableHead className="text-xs">Désignation</TableHead>
                  <TableHead className="text-right text-xs">Qté</TableHead>
                  <TableHead className="text-xs">Unité</TableHead>
                  <TableHead className="text-right text-xs">P.U. HT</TableHead>
                  <TableHead className="text-right text-xs">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l, i) => (
                  <TableRow key={i} className={l["_confidence"] === "low" ? "bg-yellow-50" : ""}>
                    <TableCell className="text-xs">{l.reference ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {l["_confidence"] === "low" && <AlertTriangle className="mr-1 inline h-3 w-3 text-yellow-500" />}
                      {l.designation ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{l.quantite ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.unite ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {typeof l.prix_unitaire === "number" ? eur.format(l.prix_unitaire) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {typeof l.total_ht === "number" ? eur.format(l.total_ht) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {hasEcart && (
          <div className="flex items-center gap-2 rounded border border-orange-300 bg-orange-50 p-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Écart : somme lignes {eur.format(sumHT)} ≠ total HT déclaré {eur.format(declared_ht)} (diff{" "}
            {eur.format(ecart)})
          </div>
        )}
      </div>
    );
  }

  // section === "fields" or undefined — show fields + totals
  const commonFields = (
    <div className="grid grid-cols-2 gap-3">
      <Field
        label="Fournisseur"
        value={str("fournisseur")}
        uncertain={u("fournisseur")}
        onChange={upd("fournisseur")}
      />
      {docType === "facture" && (
        <Field
          label="N° facture"
          value={str("numero_facture")}
          uncertain={u("numero_facture")}
          onChange={upd("numero_facture")}
        />
      )}
      {docType === "bl" && (
        <Field label="N° BL" value={str("numero_bl")} uncertain={u("numero_bl")} onChange={upd("numero_bl")} />
      )}
      <Field label="Date" value={str("date")} uncertain={u("date")} onChange={upd("date")} />
      {(docType === "facture" || docType === "bl") && (
        <Field
          label="Date livraison"
          value={str("date_livraison")}
          uncertain={u("date_livraison")}
          onChange={upd("date_livraison")}
        />
      )}
    </div>
  );

  const factureFields = docType === "facture" && (
    <div className="grid grid-cols-2 gap-3">
      <Field
        label="Date échéance"
        value={str("date_echeance")}
        uncertain={u("date_echeance")}
        onChange={upd("date_echeance")}
      />
      <Field
        label="Réf. commande"
        value={str("reference_commande")}
        uncertain={u("reference_commande")}
        onChange={upd("reference_commande")}
      />
      <Field
        label="Compte client"
        value={str("compte_client")}
        uncertain={u("compte_client")}
        onChange={upd("compte_client")}
      />
      <Field
        label="Représentant"
        value={str("representant")}
        uncertain={u("representant")}
        onChange={upd("representant")}
      />
      <Field label="SIRET" value={str("siret")} uncertain={u("siret")} onChange={upd("siret")} />
      <Field
        label="TVA intracom."
        value={str("tva_intracommunautaire")}
        uncertain={u("tva_intracommunautaire")}
        onChange={upd("tva_intracommunautaire")}
      />
      <Field
        label="Adresse fournisseur"
        value={str("adresse_fournisseur")}
        uncertain={u("adresse_fournisseur")}
        onChange={upd("adresse_fournisseur")}
      />
    </div>
  );

  const totalsSection = (docType === "facture" || docType === "ticket") && (
    <div className="space-y-2">
      <p className="text-sm font-medium">Totaux</p>
      <div className="grid grid-cols-2 gap-3">
        {docType === "facture" && (
          <>
            <Field label="Total HT (€)" value={str("total_ht")} uncertain={u("total_ht")} onChange={upd("total_ht")} />
            <Field label="Taux TVA (%)" value={str("tva_rate")} uncertain={u("tva_rate")} onChange={upd("tva_rate")} />
            <Field
              label="TVA (€)"
              value={str("tva_montant")}
              uncertain={u("tva_montant")}
              onChange={upd("tva_montant")}
            />
          </>
        )}
        <Field label="Total TTC (€)" value={str("total_ttc")} uncertain={u("total_ttc")} onChange={upd("total_ttc")} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Informations générales</p>
        {commonFields}
        {factureFields}
      </div>
      {totalsSection}
    </div>
  );
}
