"use client";

import { AlertTriangle, CheckCircle2, Link2, Link2Off, XCircle } from "lucide-react";

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
 * Le chaînage est vérifié PAR ÉTABLISSEMENT (cf. archive-chain.ts, réactivé le 22/07 après confirmation sur
 * données réelles) : la carte dédiée affiche le fil et signale les ruptures.
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
  const chainDefects = data.chain.defectCount;
  const missing = data.missingArchives.length;

  if (defects.length > 0 || chainDefects > 0 || missing > 0) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Anomalie détectée</AlertTitle>
        <AlertDescription>
          {defects.length > 0 && `${defects.length} archive(s) en écart d'intégrité. `}
          {chainDefects > 0 && `${chainDefects} rupture(s) de chaînage. `}
          {missing > 0 && `${missing} clôture(s) sans archive déposée. `}À transmettre à l&apos;éditeur POS avant toute
          conclusion : un défaut confirmé relève du JET 90 (non purgeable).
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
        {verifiable.length} archive(s) vérifiée(s) sur la période — intégrité (condensats + condensat intégral) et
        chaînage conformes.
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

function ChainBadge({ link }: { link: ArchivesResponse["chain"]["nodes"][number]["link"] }) {
  switch (link) {
    case "genesis":
      return <Badge variant="secondary">genèse</Badge>;
    case "start_of_selection":
      return <Badge variant="outline">début de sélection</Badge>;
    case "chained":
      return (
        <Badge className="gap-1">
          <Link2 className="h-3 w-3" /> chaînée
        </Badge>
      );
    case "restart":
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
          <Link2Off className="h-3 w-3" /> redémarrage
        </Badge>
      );
    case "broken":
      return (
        <Badge variant="destructive" className="gap-1">
          <Link2Off className="h-3 w-3" /> rupture
        </Badge>
      );
  }
}

/**
 * Contrôle de chaînage par ÉTABLISSEMENT (cf. src/lib/nf525/archive-chain.ts). La 1ʳᵉ archive de la fenêtre
 * est un « début de sélection » légitime — la chaîne peut continuer avant la période consultée.
 */
function ChainCard({ data }: { data: ArchivesResponse }) {
  const { nodes, excluded } = data.chain;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Chaînage des archives (par établissement)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nodes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune archive vérifiable sur la période.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Créée le</TableHead>
                <TableHead>Caisse</TableHead>
                <TableHead>Maillon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((n) => (
                <TableRow key={n.key}>
                  <TableCell className="text-xs">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{n.deviceId ?? "—"}</TableCell>
                  <TableCell>
                    <ChainBadge link={n.link} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {nodes
          .filter((n) => n.link === "broken")
          .map((n) => (
            <Alert variant="destructive" key={`brk-${n.key}`}>
              <Link2Off className="h-4 w-4" />
              <AlertTitle>Rupture de chaînage — {n.key.split("/").pop()}</AlertTitle>
              <AlertDescription className="font-mono text-xs break-all">
                attendu : {n.expected ?? "(signature précédente absente)"}
                <br />
                trouvé : {n.found ?? "(aucun)"}
              </AlertDescription>
            </Alert>
          ))}

        {data.chain.restartCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{data.chain.restartCount} redémarrage(s) de fil</AlertTitle>
            <AlertDescription className="text-xs">
              Une archive démarre un nouveau fil (pas de signature précédente) alors qu&apos;une archive la précède.
              Légitime lors d&apos;une migration de format, d&apos;une réinstallation de caisse ou d&apos;une rotation
              de trousseau — ce n&apos;est <strong>pas</strong> une falsification, mais à confirmer avec l&apos;éditeur
              POS si la cause n&apos;est pas connue.
            </AlertDescription>
          </Alert>
        )}

        {excluded.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {excluded.length} archive(s) écartée(s) du chaînage (non signées / ancien format).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Trou de dépôt : une caisse a clôturé mais son archive n'est pas sur le WORM (§6.8.1, exhaustivité). */
function MissingArchivesCard({ data }: { data: ArchivesResponse }) {
  if (data.missingArchives.length === 0) return null;
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>{data.missingArchives.length} clôture(s) sans archive sur le WORM</AlertTitle>
      <AlertDescription>
        <p className="mb-1 text-xs">
          Ces caisses ont été clôturées en base mais aucune archive n&apos;a été déposée — trou d&apos;exhaustivité
          (§6.8.1). À remonter à l&apos;éditeur POS.
        </p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs">
          {data.missingArchives.map((m) => (
            <li key={m.dailyFoundId} className="font-mono">
              {m.businessDay} — clôture {m.dailyFoundId} ({new Date(m.closedAt).toLocaleString("fr-FR")})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function ArchivesReport({ data }: { data: ArchivesResponse }) {
  return (
    <div className="space-y-4">
      <Summary data={data} />
      <MissingArchivesCard data={data} />
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
