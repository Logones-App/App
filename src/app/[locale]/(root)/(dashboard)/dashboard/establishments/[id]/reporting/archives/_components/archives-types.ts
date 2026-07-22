import type { ChainReport } from "@/lib/nf525/archive-chain";
import type { ArchiveVerdict } from "@/lib/nf525/archive-verify";

/** Forme de la réponse de GET /api/establishments/[id]/archives. */
export interface ArchiveRow {
  key: string;
  businessDay: string | null;
  deviceId: string | null;
  createdAt: string | null;
  verdict: ArchiveVerdict;
}

export interface ArchivesResponse {
  establishmentId: string;
  period: { from: string; to: string };
  count: number;
  archives: ArchiveRow[];
  chain: ChainReport;
  /** Archives dont le `daily_found.closed_at` est introuvable → exclues, jamais en silence. */
  missingClosedAt: string[];
  /** Clôtures (daily_found) de la période SANS archive sur le WORM = trou de dépôt (§6.8.1). */
  missingArchives: { dailyFoundId: string; closedAt: string; businessDay: string }[];
  /** false = aucune clé publique ECDSA pour l'établissement → contrôle ③ impossible. */
  signatureCheckable: boolean;
  contents?: Record<string, unknown>;
}
