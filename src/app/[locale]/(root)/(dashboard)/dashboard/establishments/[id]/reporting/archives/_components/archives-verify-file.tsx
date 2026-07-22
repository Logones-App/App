"use client";

import { useRef, useState } from "react";

import { AlertTriangle, CheckCircle2, FlaskConical, Link2, Link2Off, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { DeepReport } from "@/lib/nf525/archive-deep-verify";
import type { ArchiveVerdict } from "@/lib/nf525/archive-verify";

/**
 * Banc d'essai LOCAL. On dépose UNE OU PLUSIEURS archives Z (JSON, ou l'enveloppe de « Récupérer les
 * archives »), on les édite pour simuler une falsification, puis on lance :
 *   1. les 3 contrôles d'intégrité de CHAQUE archive (route serveur `verifyArchive`) ;
 *   2. le contrôle de CHAÎNAGE entre elles (comparaison de signatures — côté client, sans crypto).
 * But : prouver que le test détecte une altération de contenu ET une rupture de chaîne.
 */

interface Archive {
  created_at?: string;
  establishment_id?: string;
  signature_base64url?: string;
  previous_archive_signature?: string | null;
  report_previous_signature?: boolean;
  [key: string]: unknown;
}

interface VerifyResponse {
  verdict: ArchiveVerdict;
  deep: DeepReport;
  establishmentId: string | null;
  signatureCheckable: boolean;
}

interface Result {
  archive: Archive;
  res: VerifyResponse;
}

type ChainLink =
  | { type: "genesis" }
  | { type: "chained" }
  | { type: "start_of_selection" }
  | { type: "restart" }
  | { type: "broken"; expected: string; found: string | null };

const looksLikeArchive = (o: unknown): boolean =>
  typeof o === "object" && o !== null && "hash_chain_input" in o && "signature_base64url" in o;

/** Accepte une archive nue, un tableau, ou l'enveloppe `{ "clé S3": {archive} }`. */
function extractArchives(parsed: unknown): Archive[] {
  if (looksLikeArchive(parsed)) return [parsed as Archive];
  if (Array.isArray(parsed)) return parsed.filter(looksLikeArchive) as Archive[];
  if (typeof parsed === "object" && parsed !== null) return Object.values(parsed).filter(looksLikeArchive) as Archive[];
  return [];
}

/**
 * Chaînage : archives triées par `created_at`. Chaque archive doit reporter la signature de la précédente
 * du même établissement. La 1ʳᵉ de la sélection est un point de départ légitime (la chaîne peut continuer avant).
 */
function chainLinkFor(cur: Archive, prev: Archive | null): ChainLink {
  if (!prev) {
    if (!cur.previous_archive_signature) return { type: "genesis" };
    return { type: "start_of_selection" };
  }
  if (!cur.previous_archive_signature) return { type: "restart" };
  if (cur.previous_archive_signature === prev.signature_base64url) return { type: "chained" };
  return { type: "broken", expected: prev.signature_base64url ?? "", found: cur.previous_archive_signature };
}

function Check({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {label} : n/a
      </Badge>
    );
  }
  return (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </Badge>
  );
}

function IntegrityCell({ res }: { res: VerifyResponse }) {
  const v = res.verdict;
  if (!v.verifiable) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> ancien format
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Check ok={v.filesOk} label="Fichiers" />
      <Check ok={v.condensateOk} label="Condensat" />
      <Check ok={v.signatureOk} label="Signature" />
      {v.failedFiles.length > 0 && (
        <span className="text-destructive font-mono text-xs">{v.failedFiles.join(", ")}</span>
      )}
    </div>
  );
}

/** Signatures internes (pièces, JET, Grands Totaux) — vérification profonde. */
function DeepCell({ deep }: { deep: DeepReport }) {
  if (!deep.verifiable) {
    return <span className="text-muted-foreground text-xs">n/a (pas de clé ECDSA)</span>;
  }
  if (deep.collections.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {deep.collections.map((c) => {
        const short = c.name.replace(/^nf525_/, "");
        const bad = c.failed.length > 0;
        return (
          <Badge variant={bad ? "destructive" : "default"} className="gap-1" key={c.name} title={c.failed.join(", ")}>
            {bad ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {short} {c.ok}/{c.signed}
          </Badge>
        );
      })}
    </div>
  );
}

function ChainCell({ link }: { link: ChainLink }) {
  switch (link.type) {
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

function ResultsView({ results }: { results: Result[] }) {
  const sorted = [...results].sort((a, b) => (a.archive.created_at ?? "").localeCompare(b.archive.created_at ?? ""));
  const links = sorted.map((r, i) => chainLinkFor(r.archive, i === 0 ? null : sorted[i - 1].archive));

  const integrityBad = sorted.some((r) => r.res.verdict.verifiable && !r.res.verdict.valid);
  const chainBad = links.some((l) => l.type === "broken");
  const deepBad = sorted.some((r) => r.res.deep.verifiable && !r.res.deep.allOk);

  return (
    <div className="space-y-3">
      {integrityBad || chainBad || deepBad ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Anomalie détectée ✅ (le test a fonctionné)</AlertTitle>
          <AlertDescription className="text-xs">
            {integrityBad && "Au moins une archive a échoué un contrôle d'intégrité. "}
            {chainBad && "Le chaînage est rompu entre deux archives. "}
            {deepBad && "Une signature interne (pièce / JET / Grand Total) est invalide."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>
            {sorted.length} archive(s) — intègres, {sorted.length > 1 ? "chaînées" : "vérifiées"} et signatures internes
            conformes
          </AlertTitle>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Créée le</TableHead>
            <TableHead>Intégrité (3 contrôles)</TableHead>
            <TableHead>Chaînage</TableHead>
            <TableHead>Contenu interne (signatures)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={r.archive.signature_base64url ?? i}>
              <TableCell className="text-xs">
                {r.archive.created_at ? new Date(r.archive.created_at).toLocaleString("fr-FR") : "—"}
              </TableCell>
              <TableCell>
                <IntegrityCell res={r.res} />
              </TableCell>
              <TableCell>
                <ChainCell link={links[i]} />
              </TableCell>
              <TableCell>
                <DeepCell deep={r.res.deep} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {links.map((l, i) =>
        l.type === "broken" ? (
          <Alert variant="destructive" key={`brk-${i}`}>
            <Link2Off className="h-4 w-4" />
            <AlertTitle>
              Rupture de chaînage entre l&apos;archive {i} et {i + 1}
            </AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              attendu : {l.expected || "(signature précédente absente)"}
              <br />
              trouvé : {l.found ?? "(aucun)"}
            </AlertDescription>
          </Alert>
        ) : null,
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <details className="bg-muted/40 rounded-lg border p-3 text-xs">
      <summary className="cursor-pointer font-medium">Ce que teste le banc d&apos;essai</summary>
      <div className="text-muted-foreground mt-2 space-y-2">
        <p>
          <strong>Intégrité de chaque archive</strong> — les 3 contrôles indissociables : ① condensats des fichiers
          déclarés dans <code>hashes</code> ; ② condensat intégral (dernier champ de <code>hash_chain_input</code>) ; ③
          signature ECDSA P-256 sur <code>hash_chain_input</code>. Altérer un montant, un total ou le SIRET fait échouer
          ① ou ② ; bricoler la signature fait échouer ③.
        </p>
        <p>
          <strong>Chaînage entre archives</strong> — triées par <code>created_at</code>, chaque archive doit reporter
          dans <code>previous_archive_signature</code> le <code>signature_base64url</code> de la précédente. La 1ʳᵉ de
          la sélection est un « début de sélection » (la chaîne peut continuer avant) ; une archive sans report est une
          genèse. Une valeur qui ne correspond pas est une <strong>rupture</strong> ; une ancre absente en plein fil est
          un <strong>redémarrage</strong> (migration de format, réinstallation…) — signalé, pas accusé.
        </p>
        <p>
          <strong>Contenu interne (vérification profonde)</strong> — chaque pièce, événement JET et Grand Total porte sa
          PROPRE signature ECDSA (R13 §7), signée avec la même clé. On les vérifie toutes : ça prouve que chaque objet a
          été scellé individuellement par l&apos;assujetti, pas seulement l&apos;enveloppe. Bricoler la signature ou le{" "}
          <code>hash_chain_input</code> d&apos;une pièce fait échouer sa collection.
        </p>
        <p>
          Déposez plusieurs archives (ou le fichier de « Récupérer les archives ») pour tester le chaînage. Modifiez le
          JSON ci-dessous pour simuler une falsification.
        </p>
      </div>
    </details>
  );
}

export function ArchivesVerifyFile() {
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (file: File) => {
    setJson(await file.text());
    setFileName(file.name);
    setResults(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  };

  const verifyOne = async (archive: Archive): Promise<Result> => {
    const r = await fetch("/api/nf525/verify-archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive }),
    });
    const res = (await r.json()) as VerifyResponse & { error?: string };
    if (!r.ok) throw new Error(res.error ?? "Erreur");
    return { archive, res };
  };

  const runTest = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      toast.error("JSON invalide — impossible de le parser");
      return;
    }
    const archives = extractArchives(parsed);
    if (archives.length === 0) {
      toast.error("Aucune archive reconnue (ni hash_chain_input, ni signature).");
      return;
    }
    setBusy(true);
    try {
      setResults(await Promise.all(archives.map(verifyOne)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Banc d&apos;essai — intégrité et chaînage d&apos;archives (fichier local)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <HowItWorks />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`hover:border-primary/50 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-6 transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
        >
          <Upload className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {fileName ? `Fichier chargé : ${fileName}` : "Glisser une ou plusieurs archives (.json) ici, ou cliquer"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
          }}
        />

        {json && (
          <Textarea
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setResults(null);
            }}
            spellCheck={false}
            className="h-64 font-mono text-xs"
          />
        )}

        <Button onClick={() => void runTest()} disabled={busy || !json.trim()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
          Tester intégrité + chaînage
        </Button>

        {results && <ResultsView results={results} />}
      </CardContent>
    </Card>
  );
}
