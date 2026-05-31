"use client";

import { useState } from "react";

import Link from "next/link";

import { AlertTriangle, ArrowLeft, CheckCircle, Download, ExternalLink, XCircle, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type DocJson,
  useDocImport,
  useDocSignedUrl,
  useRejectDoc,
  useValidateDoc,
} from "@/lib/queries/doc-import-queries";
import { type Json } from "@/lib/supabase/database.types";

import { DocumentDetailForm } from "./document-detail-form";

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  processing: { label: "En cours", className: "bg-gray-100 text-gray-600" },
  auto_valide: { label: "Auto-validé", className: "bg-green-100 text-green-700" },
  a_valider: { label: "À valider", className: "bg-orange-100 text-orange-700" },
  valide: { label: "Validé", className: "bg-green-700 text-white" },
  erreur: { label: "Erreur", className: "bg-red-100 text-red-700" },
};

const FIELD_LABELS: Record<string, string> = {
  fournisseur: "Fournisseur",
  date: "Date",
  date_livraison: "Date livraison",
  date_echeance: "Date échéance",
  numero_facture: "N° facture",
  numero_bl: "N° BL",
  total_ht: "Total HT",
  tva_rate: "Taux TVA",
  tva_montant: "TVA",
  total_ttc: "Total TTC",
  reference_commande: "Réf. commande",
  compte_client: "Compte client",
  representant: "Représentant",
  siret: "SIRET",
  tva_intracommunautaire: "TVA intracom.",
  adresse_fournisseur: "Adresse fournisseur",
};

function getUncertainFields(json: DocJson): string[] {
  const fields: string[] = [];
  for (const key of Object.keys(json)) {
    let fieldName: string | undefined;
    if (key.startsWith("_confidence_") && json[key] === "low") {
      fieldName = key.slice(12);
    } else if (key.endsWith("_confidence") && json[key] === "low") {
      fieldName = key.slice(0, -11).replace(/^_/, "");
    }
    if (fieldName) fields.push(FIELD_LABELS[fieldName] ?? fieldName);
  }
  for (const ligne of json.lignes ?? []) {
    if (ligne["_confidence"] === "low") {
      fields.push(`Ligne "${ligne.designation ?? "?"}"`);
    }
  }
  return fields;
}

function docTypeLabel(docType: string | null): string {
  if (docType === "facture") return "Facture";
  if (docType === "bl") return "Bon de livraison";
  return "Ticket";
}

type DocRecord = Awaited<ReturnType<typeof useDocImport>>["data"];

function DocumentHeader({
  doc,
  statusCfg,
  consensusJson,
  signedUrl,
  filename,
  backUrl,
}: {
  doc: NonNullable<DocRecord>;
  statusCfg: { label: string; className: string };
  consensusJson: DocJson;
  signedUrl: string | null | undefined;
  filename: string;
  backUrl: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backUrl}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Link>
      </Button>
      <h1 className="text-lg font-semibold">
        {docTypeLabel(doc.doc_type)}
        {consensusJson.numero_facture && ` — ${consensusJson.numero_facture}`}
        {consensusJson.numero_bl && ` — ${consensusJson.numero_bl}`}
      </h1>
      <Badge variant="secondary" className={statusCfg.className}>
        {statusCfg.label}
      </Badge>
      {doc.pennylane_id && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <ExternalLink className="h-3 w-3" /> Pennylane : {doc.pennylane_id}
        </Badge>
      )}
      {signedUrl && (
        <Button size="sm" variant="outline" asChild className="ml-auto">
          <a href={signedUrl} download={filename} target="_blank" rel="noreferrer">
            <Download className="mr-1 h-4 w-4" /> Télécharger
          </a>
        </Button>
      )}
    </div>
  );
}

function DocumentBanners({ status, uncertainFields }: { status: string; uncertainFields: string[] }) {
  const count = uncertainFields.length;
  return (
    <>
      {status === "a_valider" && (
        <div className="flex items-center gap-2 rounded border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Ce document contient des champs incertains, veuillez vérifier avant de valider.
        </div>
      )}
      {count > 0 && (
        <div className="flex items-start gap-2 rounded border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {count} champ{count > 1 ? "s" : ""} incertain{count > 1 ? "s" : ""} :{" "}
            <span className="font-semibold">{uncertainFields.join(", ")}</span>
          </span>
        </div>
      )}
    </>
  );
}

function DocumentViewer({ url, filename }: { url: string; filename: string }) {
  const [zoomed, setZoomed] = useState(false);
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    return <iframe src={url} className="h-full min-h-[500px] w-full rounded border" title="Document PDF" />;
  }
  return (
    <div className="relative overflow-auto rounded border bg-gray-50">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-10 h-7 w-7 bg-white shadow"
        onClick={() => setZoomed((z) => !z)}
      >
        {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
      </Button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Document"
        className={`mx-auto transition-all ${zoomed ? "w-[150%]" : "max-h-[700px] w-full object-contain"}`}
      />
    </div>
  );
}

type Props = { docId: string; backUrl: string };

export function DocumentDetailPanel({ docId, backUrl }: Props) {
  const { data: doc, isLoading } = useDocImport(docId);
  const signedUrlQuery = useDocSignedUrl(doc?.source_url);
  const signedUrl = signedUrlQuery.data;
  const validateMutation = useValidateDoc(docId);
  const rejectMutation = useRejectDoc(docId);

  const consensusJson = (doc?.consensus_json ?? {}) as DocJson;
  const [formData, setFormData] = useState<DocJson | null>(null);
  const activeForm: DocJson = formData ?? consensusJson;

  const handleFormChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...(prev ?? consensusJson), [key]: value }));
  };

  const handleValidate = () => {
    validateMutation.mutate(activeForm as unknown as Json, {
      onSuccess: () => toast.success("Document validé avec succès."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la validation."),
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(undefined, {
      onSuccess: () => toast.success("Document rejeté."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors du rejet."),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return <p className="text-muted-foreground p-8 text-center">Document introuvable.</p>;
  }

  const statusCfg = STATUS_CFG[doc.status] ?? { label: doc.status, className: "" };
  const uncertainFields = getUncertainFields(consensusJson);
  const filename = doc.source_url?.split("/").pop() ?? "";
  const isActionable = !["valide", "processing"].includes(doc.status);
  const busy = validateMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex flex-col gap-4 p-6">
      <DocumentHeader
        doc={doc}
        statusCfg={statusCfg}
        consensusJson={consensusJson}
        signedUrl={signedUrl}
        filename={filename}
        backUrl={backUrl}
      />

      <DocumentBanners status={doc.status} uncertainFields={uncertainFields} />

      {doc.consensus_json == null ? (
        <p className="text-muted-foreground text-sm">Extraction en cours, revenez dans quelques instants.</p>
      ) : (
        <>
          {/* Top band — all fields + totals */}
          <DocumentDetailForm
            formData={activeForm}
            docType={doc.doc_type}
            onChange={handleFormChange}
            section="fields"
          />

          {/* Bottom — lines left, image right */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DocumentDetailForm
              formData={activeForm}
              docType={doc.doc_type}
              onChange={handleFormChange}
              section="lines"
            />
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Document original</p>
              {signedUrl ? (
                <DocumentViewer url={signedUrl} filename={filename} />
              ) : (
                <div className="text-muted-foreground flex h-48 items-center justify-center rounded border border-dashed text-sm">
                  {doc.source_url ? "Chargement du document…" : "Aucun fichier associé"}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* LLM vs Azure diff */}
      {doc.extracted_azure != null && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Comparaison moteurs d&apos;extraction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-blue-600">Claude LLM</p>
                <pre className="max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(doc.extracted_llm, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-purple-600">Azure Document Intelligence</p>
                <pre className="max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(doc.extracted_azure, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isActionable && (
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" className="text-destructive" disabled={busy} onClick={handleReject}>
            <XCircle className="mr-1 h-4 w-4" /> Rejeter
          </Button>
          <Button disabled={busy} onClick={handleValidate}>
            <CheckCircle className="mr-1 h-4 w-4" />
            {validateMutation.isPending ? "Validation…" : "Valider"}
          </Button>
        </div>
      )}
    </div>
  );
}
