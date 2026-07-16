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
 *
 * ⚠️ Aucun verdict de chaînage n'est rendu : il n'est pas vérifiable depuis le WORM (cf. archive-chain.ts).
 * La limite est affichée, pas tue.
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
      {v.unknownRootKeys.map((k) => (
        <Badge variant="outline" className="gap-1" key={`root-${k}`}>
          <AlertTriangle className="h-3 w-3" /> champ racine inconnu : {k}
        </Badge>
      ))}
      {v.unmappedHashes.map((h) => (
        <Badge variant="outline" className="gap-1" key={`hash-${h}`}>
          <AlertTriangle className="h-3 w-3" /> condensat sans contenu : {h}
        </Badge>
      ))}
      {v.undeclaredData.map((d) => (
        <Badge variant="outline" className="gap-1" key={`data-${d}`}>
          <AlertTriangle className="h-3 w-3" /> contenu sans condensat : {d}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Trois états, jamais deux. Une archive dont le format a évolué n'est PAS une archive falsifiée :
 * la confondre avec un défaut produirait une fausse accusation (et le JET 90 est non purgeable).
 */
function Summary({ data }: { data: ArchivesResponse }) {
  const verifiable = data.archives.filter((a) => a.verdict.verifiable);
  const defects = verifiable.filter((a) => a.verdict.verifiable && !a.verdict.valid && !a.verdict.inconclusive);
  const unknown = verifiable.filter((a) => a.verdict.verifiable && a.verdict.inconclusive);

  if (defects.length > 0) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Défaut d&apos;intégrité</AlertTitle>
        <AlertDescription>
          {defects.length} archive(s) en écart. À transmettre à l&apos;éditeur POS avant toute conclusion : un défaut
          confirmé relève du JET 90 (non purgeable).
        </AlertDescription>
      </Alert>
    );
  }
  if (unknown.length > 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Vérification non concluante — le format a évolué</AlertTitle>
        <AlertDescription>
          {unknown.length} archive(s) contiennent des éléments que ce vérificateur ne connaît pas encore. Ce n&apos;est{" "}
          <strong>pas</strong> un défaut d&apos;intégrité : tant que le format n&apos;est pas appris, aucun verdict ne
          peut être rendu. Mettre à jour <code>src/lib/nf525/archive-format.ts</code>.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Aucune anomalie détectée</AlertTitle>
      <AlertDescription>
        {verifiable.length} archive(s) vérifiée(s) sur la période — condensats des fichiers et condensat intégral
        conformes.
        {!data.signatureCheckable && " ⚠️ Signature non vérifiée : aucune clé publique pour cet établissement."}
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

/**
 * Inventaire par caisse — PAS un contrôle de chaînage : celui-ci n'est pas vérifiable depuis le WORM
 * (cf. src/lib/nf525/archive-chain.ts). On l'affiche comme une limite connue plutôt que de taire le sujet.
 */
function InventoryCard({ data }: { data: ArchivesResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Dépôts par caisse (inventaire)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.chain.devices.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune archive vérifiable sur la période.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caisse</TableHead>
                <TableHead className="text-right">Archives</TableHead>
                <TableHead>Premier dépôt</TableHead>
                <TableHead>Dernier dépôt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.chain.devices.map((d) => (
                <TableRow key={d.deviceId}>
                  <TableCell className="font-mono text-xs">{d.deviceId}</TableCell>
                  <TableCell className="text-right">{d.count}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {d.firstCreatedAt ? new Date(d.firstCreatedAt).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {d.lastCreatedAt ? new Date(d.lastCreatedAt).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chaînage des archives : non vérifiable ici</AlertTitle>
          <AlertDescription className="text-xs">{data.chain.reason}</AlertDescription>
        </Alert>
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

      <InventoryCard data={data} />
    </div>
  );
}
