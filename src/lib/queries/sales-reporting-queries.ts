"use client";

// Agrégations de ventes (CA) pour le reporting, calculées côté client à partir de
// useEstablishmentOrders (orders-queries). CA exprimé en HT (préférence reporting) :
// le CA = somme des lignes order_products taxables HT, hors pourboires/extras.
// Les encaissements par mode de paiement restent en TTC (cash réellement encaissé).

import type { OrderProduct, OrderWithDetails } from "./orders-queries";

const round2 = (n: number) => Math.round(n * 100) / 100;

function lineHt(op: OrderProduct) {
  const ttc = op.total_price ?? 0;
  // vat_rate en POURCENTAGE (10, 20, 5.5), cf. ttcToHt canonique.
  return op.vat_rate ? ttc / (1 + op.vat_rate / 100) : ttc;
}

function isSold(op: OrderProduct) {
  return !op.cancelled && !op.deleted;
}

export type SalesKPIs = {
  revenueHt: number;
  revenueTtc: number;
  orderCount: number;
  itemCount: number;
  avgBasketHt: number;
};

export function computeSalesKPIs(orders: OrderWithDetails[]): SalesKPIs {
  let revenueHt = 0;
  let revenueTtc = 0;
  let itemCount = 0;
  for (const order of orders) {
    for (const op of order.order_products) {
      if (!isSold(op)) continue;
      revenueHt += lineHt(op);
      revenueTtc += op.total_price ?? 0;
      itemCount += op.quantity ?? 0;
    }
  }
  const orderCount = orders.length;
  return {
    revenueHt: round2(revenueHt),
    revenueTtc: round2(revenueTtc),
    orderCount,
    itemCount,
    avgBasketHt: orderCount > 0 ? round2(revenueHt / orderCount) : 0,
  };
}

export type SalesDayRow = { date: string; revenueHt: number; orderCount: number };

export function computeSalesByDay(orders: OrderWithDetails[]): SalesDayRow[] {
  const byDate = new Map<string, { revenueHt: number; orders: Set<string> }>();
  for (const order of orders) {
    if (!order.created_at) continue;
    const date = order.created_at.slice(0, 10);
    const entry = byDate.get(date) ?? { revenueHt: 0, orders: new Set<string>() };
    for (const op of order.order_products) {
      if (isSold(op)) entry.revenueHt += lineHt(op);
    }
    entry.orders.add(order.id);
    byDate.set(date, entry);
  }
  return [...byDate.entries()]
    .map(([date, e]) => ({ date, revenueHt: round2(e.revenueHt), orderCount: e.orders.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type SalesProductRow = { productName: string; quantity: number; revenueHt: number };

export function computeSalesByProduct(orders: OrderWithDetails[], limit = 20): SalesProductRow[] {
  const map = new Map<string, { quantity: number; revenueHt: number }>();
  for (const order of orders) {
    for (const op of order.order_products) {
      if (!isSold(op)) continue;
      const e = map.get(op.product_name) ?? { quantity: 0, revenueHt: 0 };
      e.quantity += op.quantity ?? 0;
      e.revenueHt += lineHt(op);
      map.set(op.product_name, e);
    }
  }
  return [...map.entries()]
    .map(([productName, v]) => ({ productName, quantity: v.quantity, revenueHt: round2(v.revenueHt) }))
    .sort((a, b) => b.revenueHt - a.revenueHt)
    .slice(0, limit);
}

export type PaymentMethodRow = { method: string; amount: number };

// Encaissements réels par mode de paiement (TTC, pourboires/extras inclus).
export function computeRevenueByPaymentMethod(orders: OrderWithDetails[]): PaymentMethodRow[] {
  const byMethod = new Map<string, number>();
  for (const order of orders) {
    for (const pay of order.order_payments) {
      for (const s of pay.order_payment_settlements) {
        if (s.deleted) continue;
        const method = s.payment_method_name ?? "Autre";
        byMethod.set(method, (byMethod.get(method) ?? 0) + s.amount);
      }
    }
  }
  return [...byMethod.entries()]
    .map(([method, amount]) => ({ method, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}
