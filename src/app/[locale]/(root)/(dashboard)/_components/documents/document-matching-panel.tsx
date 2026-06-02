"use client";

import { useEffect, useMemo } from "react";

import Link from "next/link";

import { ArrowLeft, CheckCircle2, Loader2, Wand2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoMatchDocLines, useDocImportLines } from "@/lib/queries/doc-import-lines-queries";
import { useDocImport } from "@/lib/queries/doc-import-queries";

import { DocLineMatchRow } from "./doc-line-match-row";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

type Props = {
  docId: string;
  organizationId: string;
  establishmentId: string;
  backUrl: string;
};

export function DocumentMatchingPanel({ docId, organizationId, establishmentId, backUrl }: Props) {
  const { data: doc, isLoading: docLoading } = useDocImport(docId);
  const { data: lines = [], isLoading: linesLoading } = useDocImportLines(docId);
  const autoMatch = useAutoMatchDocLines(docId, organizationId);

  const pendingLines = useMemo(() => lines.filter((l) => l.automation_status === "pending"), [lines]);
  const matchedCount = useMemo(
    () => lines.filter((l) => l.automation_status === "matched" || l.automation_status === "applied").length,
    [lines],
  );
  const appliedCount = useMemo(() => lines.filter((l) => l.automation_status === "applied").length, [lines]);

  // Auto-match au chargement si des lignes sont en pending
  useEffect(() => {
    if (linesLoading || autoMatch.isPending || pendingLines.length === 0) return;
    const toMatch = pendingLines
      .filter((l) => l.reference)
      .map((l) => ({ id: l.id, reference: l.reference, designation: l.designation }));
    if (toMatch.length > 0) autoMatch.mutate(toMatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesLoading]);

  if (docLoading || linesLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!doc) return <p className="text-muted-foreground p-8 text-center">Document introuvable.</p>;

  const total = lines.length;
  const matchPct = total > 0 ? Math.round((matchedCount / total) * 100) : 0;
  const allApplied = total > 0 && appliedCount === total;

  return (
    <div className="space-y-5 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Traitement des lignes</h1>
          <p className="text-muted-foreground text-sm">
            {doc.numero_document && `${doc.numero_document} · `}
            {doc.document_date ?? doc.date_livraison ?? ""}
            {doc.total_ttc != null && ` · ${eur.format(doc.total_ttc)} TTC`}
          </p>
        </div>
      </div>

      {/* Progression */}
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>
            <span className="font-medium">{matchedCount}</span> / {total} lignes matchées
          </span>
          <span className="text-muted-foreground">
            {appliedCount} appliquée{appliedCount > 1 ? "s" : ""}
          </span>
        </div>
        <Progress value={matchPct} className="h-2" />
        {allApplied && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Toutes les lignes ont été traitées.
          </div>
        )}
      </div>

      {/* Actions globales */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={autoMatch.isPending || pendingLines.length === 0}
          onClick={() => {
            const toMatch = pendingLines
              .filter((l) => l.reference)
              .map((l) => ({ id: l.id, reference: l.reference, designation: l.designation }));
            if (toMatch.length > 0) autoMatch.mutate(toMatch);
          }}
        >
          {autoMatch.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
          Auto-matcher ({pendingLines.length})
        </Button>
        <Badge variant="outline" className="text-muted-foreground self-center">
          <Zap className="mr-1 h-3 w-3" />
          Les lignes matchées s&apos;appliquent individuellement
        </Badge>
      </div>

      {/* Lignes */}
      {lines.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Aucune ligne — validez d&apos;abord l&apos;extraction OCR.
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <DocLineMatchRow
              key={line.id}
              line={line}
              docId={docId}
              organizationId={organizationId}
              establishmentId={establishmentId}
              supplierId={doc.supplier_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
