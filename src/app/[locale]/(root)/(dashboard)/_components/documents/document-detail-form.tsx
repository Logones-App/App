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

function fieldStr(formData: DocJson, k: keyof DocJson): string {
  const v = formData[k];
  if (v == null) return "";
  if (Array.isArray(v)) return (v as unknown[]).join(" / ");
  return String(v);
}

function toNum(v: unknown): number {
  return Number(v) || 0;
}

function sumLineHT(lignes: DocLigne[]): number {
  return lignes.reduce((acc, l) => acc + toNum(l.total_ht), 0);
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

function DocLinesSection({
  lignes,
  showPrices,
  hasEcart,
  sumHT,
  declared_ht,
  ecart,
}: {
  lignes: DocLigne[];
  showPrices: boolean;
  hasEcart: boolean;
  sumHT: number;
  declared_ht: number;
  ecart: number;
}) {
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
                <TableHead className="text-xs">Contenance</TableHead>
                {showPrices && <TableHead className="text-right text-xs">P.U. HT</TableHead>}
                {showPrices && <TableHead className="text-right text-xs">Total HT</TableHead>}
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
                  <TableCell className="text-xs tabular-nums">
                    {l.contenance_unitaire != null
                      ? `${l.contenance_unitaire}${l.unite_contenance ? ` ${l.unite_contenance}` : ""}`
                      : "—"}
                  </TableCell>
                  {showPrices && (
                    <TableCell className="text-right text-xs tabular-nums">
                      {typeof l.prix_unitaire === "number" ? eur.format(l.prix_unitaire) : "—"}
                    </TableCell>
                  )}
                  {showPrices && (
                    <TableCell className="text-right text-xs tabular-nums">
                      {typeof l.total_ht === "number" ? eur.format(l.total_ht) : "—"}
                    </TableCell>
                  )}
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

export function DocumentDetailForm({ formData, docType, onChange, section }: Props) {
  const str = (k: keyof DocJson) => fieldStr(formData, k);
  const u = (k: string) => isLowConfidence(formData, k);
  const upd = (k: string) => (v: string) => onChange(k, v || null);

  const lignes: DocLigne[] = Array.isArray(formData.lignes) ? formData.lignes : [];
  const sumHT = sumLineHT(lignes);
  const declared_ht = toNum(formData.total_ht);
  const ecart = Math.abs(sumHT - declared_ht);
  const isFacture = docType === "facture" || docType === "facture_bl";
  const isBl = docType === "bl" || docType === "facture_bl";
  const hasEcart = isFacture && lignes.length > 0 && ecart > 0.01;

  if (section === "lines") {
    return (
      <DocLinesSection
        lignes={lignes}
        showPrices={isFacture || isBl}
        hasEcart={hasEcart}
        sumHT={sumHT}
        declared_ht={declared_ht}
        ecart={ecart}
      />
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
      {isFacture && (
        <Field
          label="N° facture"
          value={str("numero_facture")}
          uncertain={u("numero_facture")}
          onChange={upd("numero_facture")}
        />
      )}
      {isBl && <Field label="N° BL" value={str("numero_bl")} uncertain={u("numero_bl")} onChange={upd("numero_bl")} />}
      <Field label="Date" value={str("date")} uncertain={u("date")} onChange={upd("date")} />
      {(isFacture || isBl) && (
        <Field
          label="Date livraison"
          value={str("date_livraison")}
          uncertain={u("date_livraison")}
          onChange={upd("date_livraison")}
        />
      )}
    </div>
  );

  const factureFields = isFacture && (
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

  const blFields = docType === "bl" && (
    <div className="grid grid-cols-2 gap-3">
      <Field
        label="Réf. commande"
        value={str("reference_commande")}
        uncertain={u("reference_commande")}
        onChange={upd("reference_commande")}
      />
      <Field
        label="Représentant"
        value={str("representant")}
        uncertain={u("representant")}
        onChange={upd("representant")}
      />
      <Field
        label="Adresse fournisseur"
        value={str("adresse_fournisseur")}
        uncertain={u("adresse_fournisseur")}
        onChange={upd("adresse_fournisseur")}
      />
    </div>
  );

  const tvaDetails = Array.isArray(formData.tva_details) ? formData.tva_details : null;

  const totalsSection = (isFacture || docType === "ticket") && (
    <div className="space-y-2">
      <p className="text-sm font-medium">Totaux</p>
      <div className="grid grid-cols-2 gap-3">
        {isFacture && (
          <>
            <Field label="Total HT (€)" value={str("total_ht")} uncertain={u("total_ht")} onChange={upd("total_ht")} />
            {tvaDetails && tvaDetails.length > 0 ? (
              <div className="col-span-2 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Base HT</TableHead>
                      <TableHead className="text-xs">Taux TVA</TableHead>
                      <TableHead className="text-xs">Montant TVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tvaDetails.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs tabular-nums">{eur.format(t.base_ht)}</TableCell>
                        <TableCell className="text-xs">{t.taux_tva}%</TableCell>
                        <TableCell className="text-xs tabular-nums">{eur.format(t.montant_tva)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <>
                <Field
                  label="Taux TVA (%)"
                  value={str("tva_rate")}
                  uncertain={u("tva_rate")}
                  onChange={upd("tva_rate")}
                />
                <Field
                  label="TVA (€)"
                  value={str("tva_montant")}
                  uncertain={u("tva_montant")}
                  onChange={upd("tva_montant")}
                />
              </>
            )}
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
        {blFields}
      </div>
      {totalsSection}
    </div>
  );
}
