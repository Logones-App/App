"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { ArchivesResponse } from "./archives-types";

/**
 * Rapport d'intégrité des archives fiscales Z.
 *
 * Les 3 contrôles sont indissociables (cf. archive-verify.ts) : on affiche donc le détail de chacun,
 * jamais un « OK » global qui masquerait un contrôle non effectué. Les exclusions (archive non signée,
 * clôture introuvable) sont affichées explicitement — une archive écartée en silence serait un faux « tout va bien ».
 */

function Check({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {label} : non vérifiable
      </Badge>
    );
  }
  return (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </Badge>
  );
}

function VerdictCell({ row }: { row: ArchivesResponse["archives"][number] }) {
  const v = row.verdict;
  if (!v.verifiable) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Hors périmètre (ancien format)
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Check ok={v.filesOk} label="Fichiers" />
      <Check ok={v.condensateOk} label="Condensat" />
      <Check ok={v.signatureOk} label="Signature" />
    </div>
  );
}

function Summary({ data }: { data: ArchivesResponse }) {
  const verifiable = data.archives.filter((a) => a.verdict.verifiable);
  const invalid = verifiable.filter((a) => a.verdict.verifiable && !a.verdict.valid);
  const defects = data.chain.defects.length;

  if (invalid.length === 0 && defects === 0) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Aucune anomalie détectée</AlertTitle>
        <AlertDescription>
          {verifiable.length} archive(s) vérifiée(s) sur la période — condensats, condensat intégral et chaînage
          conformes.
          {!data.signatureCheckable && " ⚠️ Signature non vérifiée : aucune clé publique pour cet établissement."}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Défaut d&apos;intégrité</AlertTitle>
      <AlertDescription>
        {invalid.length} archive(s) en écart, {defects} rupture(s) de chaînage. À transmettre au POS avant toute
        conclusion : un défaut confirmé relève du JET 90 (non purgeable).
      </AlertDescription>
    </Alert>
  );
}

function Exclusions({ data }: { data: ArchivesResponse }) {
  const excluded = data.chain.excluded;
  if (excluded.length === 0 && data.missingClosedAt.length === 0) return null;
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Archives écartées des contrôles</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4 text-xs">
          {excluded.length > 0 && (
            <li>
              {excluded.length} archive(s) sans signature (ancien format) — hors chaîne : elles ne font pas avancer le
              fil.
            </li>
          )}
          {data.missingClosedAt.length > 0 && (
            <li>
              {data.missingClosedAt.length} archive(s) sans clôture connue en base (`daily_found.closed_at` absent) — le
              jour d&apos;exploitation est indéterminable, elles sont exclues de la période.
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function ChainCard({ data }: { data: ArchivesResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Chaînage par caisse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.chain.devices.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune archive chaînable sur la période.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caisse</TableHead>
                <TableHead className="text-right">Archives</TableHead>
                <TableHead>Genèse (1ʳᵉ de la période)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.chain.devices.map((d) => (
                <TableRow key={d.deviceId}>
                  <TableCell className="font-mono text-xs">{d.deviceId}</TableCell>
                  <TableCell className="text-right">{d.count}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {d.genesisKey.split("/").pop()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data.chain.defects.map((d) => (
          <Alert variant="destructive" key={d.defectKey}>
            <XCircle className="h-4 w-4" />
            <AlertTitle>
              {d.type === "chain_break" ? "Rupture de chaînage" : "Genèse inattendue"} — caisse {d.deviceId}
            </AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {d.key}
              {d.type === "chain_break" && (
                <>
                  <br />
                  attendu : {d.expected}
                  <br />
                  trouvé : {d.found ?? "(aucun)"}
                </>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

export function ArchivesReport({ data }: { data: ArchivesResponse }) {
  return (
    <div className="space-y-4">
      <Summary data={data} />
      <Exclusions data={data} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Détail des 3 contrôles — condensats des fichiers, condensat intégral, signature ECDSA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.archives.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">Aucune archive sur la période.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour d&apos;exploitation</TableHead>
                  <TableHead>Caisse</TableHead>
                  <TableHead>Contrôles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.archives.map((a) => (
                  <TableRow key={a.key}>
                    <TableCell className="font-medium">{a.businessDay}</TableCell>
                    <TableCell className="font-mono text-xs">{a.deviceId ?? "—"}</TableCell>
                    <TableCell>
                      <VerdictCell row={a} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ChainCard data={data} />
    </div>
  );
}
