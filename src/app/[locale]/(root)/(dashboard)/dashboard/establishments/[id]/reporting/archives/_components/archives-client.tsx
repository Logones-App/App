"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { Download, FileArchive, Loader2, ScrollText, ShieldCheck } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, defaultDateRange, rangeToIso } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

import { ArchivesReport } from "./archives-report";
import type { ArchivesResponse } from "./archives-types";
import { ArchivesVerifyFile } from "./archives-verify-file";

/**
 * Archives fiscales Z (WORM S3) — CONSULTATION ET CONTRÔLE À LA DEMANDE.
 *
 * Pas de contrôle quotidien automatique : deux actions manuelles, l'une pour consulter/récupérer les
 * archives d'une période, l'autre pour en tester l'intégrité. Aucun JET n'est émis ici (consulter ≠ archiver).
 *
 * ⚠️ La période porte sur le **jour de CLÔTURE** (règle ① — cf. src/lib/nf525/archive-period.ts),
 * pas sur la date du chemin S3 qui est celle de l'upload.
 */

type Busy = "list" | "verify" | "download" | null;

function downloadJson(content: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ArchivesTable({
  data,
  establishmentId,
  organizationId,
}: {
  data: ArchivesResponse;
  establishmentId: string;
  organizationId: string;
}) {
  if (data.archives.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">Aucune archive sur la période.</p>;
  }
  const downloadHref = (key: string) =>
    `/api/establishments/${establishmentId}/archives/download?organizationId=${encodeURIComponent(
      organizationId,
    )}&key=${encodeURIComponent(key)}`;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Jour d&apos;exploitation</TableHead>
          <TableHead>Caisse</TableHead>
          <TableHead>Déposée le</TableHead>
          <TableHead>Fichier</TableHead>
          <TableHead className="text-right">Télécharger</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.archives.map((a) => (
          <TableRow key={a.key}>
            <TableCell className="font-medium">{a.businessDay}</TableCell>
            <TableCell className="font-mono text-xs">{a.deviceId ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {a.createdAt ? new Date(a.createdAt).toLocaleString("fr-FR") : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">{a.key.split("/").pop()}</TableCell>
            <TableCell className="text-right">
              <a
                href={downloadHref(a.key)}
                download
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                <Download className="h-3 w-3" /> JSON
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ArchivesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const [range, setRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const { fromDate, toDate } = rangeToIso(range);

  const [busy, setBusy] = useState<Busy>(null);
  const [data, setData] = useState<ArchivesResponse | null>(null);
  const [view, setView] = useState<"list" | "verify" | null>(null);

  const zipHref = `/api/establishments/${establishmentId}/archives/zip?organizationId=${encodeURIComponent(
    organizationId,
  )}&from=${fromDate}&to=${toDate}`;

  const fetchPeriod = async (withContent: boolean): Promise<ArchivesResponse> => {
    const qs = new URLSearchParams({ organizationId, from: fromDate, to: toDate });
    if (withContent) qs.set("content", "1");
    const res = await fetch(`/api/establishments/${establishmentId}/archives?${qs.toString()}`);
    const body = (await res.json()) as ArchivesResponse & { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Erreur");
    return body;
  };

  const run = async (action: Exclude<Busy, null>) => {
    setBusy(action);
    try {
      const body = await fetchPeriod(action === "download");
      if (action === "download") {
        downloadJson(body.contents ?? {}, `archives-fiscales_${fromDate}_${toDate}.json`);
        toast.success(`${body.count} archive(s) récupérée(s)`);
      } else {
        setData(body);
        setView(action);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null || !organizationId;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Archives fiscales</h1>
            <Badge variant="secondary">NF525</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Archives Z déposées sur le stockage inaltérable (WORM) à chaque clôture de caisse
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void run("list")} disabled={disabled}>
          {busy === "list" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScrollText className="mr-2 h-4 w-4" />
          )}
          Consulter la période
        </Button>
        <Button variant="outline" onClick={() => void run("verify")} disabled={disabled}>
          {busy === "verify" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Tester l&apos;intégrité
        </Button>
        <Button variant="outline" onClick={() => void run("download")} disabled={disabled}>
          {busy === "download" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Récupérer les archives (JSON)
        </Button>
        {organizationId && (
          <Button variant="outline" asChild>
            <a href={zipHref} download>
              <FileArchive className="mr-2 h-4 w-4" />
              Télécharger le ZIP
            </a>
          </Button>
        )}
      </div>

      {view === null && (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Choisissez une période, puis <strong>Consulter</strong> pour lister les archives déposées, ou{" "}
            <strong>Tester l&apos;intégrité</strong> pour rejouer les 3 contrôles et le chaînage.
            <br />
            La période porte sur le <strong>jour de clôture</strong> de la caisse.
          </CardContent>
        </Card>
      )}

      {view === "list" && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {data.count} archive(s) — {data.period.from} → {data.period.to}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ArchivesTable data={data} establishmentId={establishmentId} organizationId={organizationId} />
          </CardContent>
        </Card>
      )}

      {view === "verify" && data && <ArchivesReport data={data} />}

      <ArchivesVerifyFile />
    </div>
  );
}
