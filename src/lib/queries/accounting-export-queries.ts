"use client";

// Export comptable « simple » (transmission au cabinet, pas de FEC normé).
// Construit depuis les commandes (même base HT que la page Ventes) : ventilation
// de TVA par jour/taux + récap par mode de paiement. Source cohérente avec le
// reste du reporting ; pourra être basculée sur les pièces fiscales signées
// (nf525_pieces) si un export « fiscal » est requis un jour.

import type { OrderProduct, OrderWithDetails } from "./orders-queries";

const round2 = (n: number) => Math.round(n * 100) / 100;

function isSold(op: OrderProduct) {
  return !op.cancelled && !op.deleted;
}

function lineTtc(op: OrderProduct) {
  return op.total_price ?? 0;
}

function lineHt(op: OrderProduct) {
  const ttc = lineTtc(op);
  // vat_rate est stocké en POURCENTAGE (10, 20, 5.5), cf. ttcToHt canonique.
  return op.vat_rate ? ttc / (1 + op.vat_rate / 100) : ttc;
}

export type VatRow = { vatRate: number; ht: number; vat: number; ttc: number };

// Ventilation TVA agrégée sur la période (par taux).
export function computeVatBreakdown(orders: OrderWithDetails[]): VatRow[] {
  const byRate = new Map<number, { ht: number; ttc: number }>();
  for (const order of orders) {
    for (const op of order.order_products) {
      if (!isSold(op)) continue;
      const rate = op.vat_rate ?? 0;
      const e = byRate.get(rate) ?? { ht: 0, ttc: 0 };
      e.ht += lineHt(op);
      e.ttc += lineTtc(op);
      byRate.set(rate, e);
    }
  }
  return [...byRate.entries()]
    .map(([vatRate, e]) => ({ vatRate, ht: round2(e.ht), vat: round2(e.ttc - e.ht), ttc: round2(e.ttc) }))
    .sort((a, b) => a.vatRate - b.vatRate);
}

export type VatDayRow = { date: string; vatRate: number; ht: number; vat: number; ttc: number };

// Ventilation TVA par jour × taux (lignes de l'export CSV).
export function computeVatByDay(orders: OrderWithDetails[]): VatDayRow[] {
  const byKey = new Map<string, { date: string; vatRate: number; ht: number; ttc: number }>();
  for (const order of orders) {
    if (!order.created_at) continue;
    const date = order.created_at.slice(0, 10);
    for (const op of order.order_products) {
      if (!isSold(op)) continue;
      const rate = op.vat_rate ?? 0;
      const key = `${date}|${rate}`;
      const e = byKey.get(key) ?? { date, vatRate: rate, ht: 0, ttc: 0 };
      e.ht += lineHt(op);
      e.ttc += lineTtc(op);
      byKey.set(key, e);
    }
  }
  return [...byKey.values()]
    .map((e) => ({ date: e.date, vatRate: e.vatRate, ht: round2(e.ht), vat: round2(e.ttc - e.ht), ttc: round2(e.ttc) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.vatRate - b.vatRate);
}

// Nombre FR pour CSV (virgule décimale).
function numFr(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function pctFr(rate: number) {
  return `${rate.toFixed(1).replace(".", ",")} %`;
}

// YYYY-MM-DD → JJ/MM/AAAA (reconnu comme date par Excel FR).
function dateFr(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// BOM UTF-8 (via code point, pas de caractère invisible dans la source) — Excel FR.
const BOM = String.fromCharCode(0xfeff);

// CSV (séparateur ;, BOM UTF-8) : ventilation TVA par jour + ligne TOTAL.
// Directive `sep=;` en tête → Excel découpe en colonnes quel que soit le locale.
export function buildAccountingCsv(rows: VatDayRow[]): string {
  const sep = ";";
  const header = ["Date", "Taux TVA", "HT", "TVA", "TTC"].join(sep);
  const lines = rows.map((r) => [dateFr(r.date), pctFr(r.vatRate), numFr(r.ht), numFr(r.vat), numFr(r.ttc)].join(sep));
  const tHt = rows.reduce((s, r) => s + r.ht, 0);
  const tVat = rows.reduce((s, r) => s + r.vat, 0);
  const tTtc = rows.reduce((s, r) => s + r.ttc, 0);
  const total = ["TOTAL", "", numFr(round2(tHt)), numFr(round2(tVat)), numFr(round2(tTtc))].join(sep);
  return `${BOM}sep=;\r\n${[header, ...lines, total].join("\r\n")}`;
}
