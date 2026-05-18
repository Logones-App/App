"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderProduct = Tables<"order_products">;
export type OrderPaymentSettlement = Tables<"order_payment_settlements">;

export type OrderWithDetails = Tables<"orders"> & {
  order_products: OrderProduct[];
  order_payments: Array<
    Tables<"order_payments"> & {
      order_payment_settlements: OrderPaymentSettlement[];
    }
  >;
};

export type OrderKPIs = {
  revenueTTC: number; // Somme des encaissements réels
  orderCount: number; // Nombre de commandes
  itemCount: number; // Nombre d'articles vendus
  averageBasket: number; // Panier moyen TTC
  revenueByMethod: { method: string; amount: number }[]; // Par méthode de paiement
};

export type TopProduct = {
  product_name: string;
  quantity: number;
  revenue: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { from, to };
}

export function lastNDaysRange(n: number) {
  const to = new Date().toISOString();
  const from = new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

export function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

/** Calcule les KPIs depuis une liste de commandes avec détails. */
export function computeOrderKPIs(orders: OrderWithDetails[]): OrderKPIs {
  let revenueTTC = 0;
  let itemCount = 0;
  const byMethod = new Map<string, number>();

  for (const order of orders) {
    // Produits non annulés
    for (const op of order.order_products) {
      if (!op.cancelled && !op.deleted) {
        itemCount += op.quantity;
      }
    }
    // Encaissements réels
    for (const pay of order.order_payments) {
      for (const s of pay.order_payment_settlements) {
        if (!s.deleted) {
          revenueTTC += s.amount;
          const method = s.payment_method_name ?? "Autre";
          byMethod.set(method, (byMethod.get(method) ?? 0) + s.amount);
        }
      }
    }
  }

  const orderCount = orders.length;
  return {
    revenueTTC,
    orderCount,
    itemCount,
    averageBasket: orderCount > 0 ? revenueTTC / orderCount : 0,
    revenueByMethod: [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** Calcule le top produits depuis une liste de commandes. */
export function computeTopProducts(orders: OrderWithDetails[], limit = 10): TopProduct[] {
  const map = new Map<string, { quantity: number; revenue: number }>();
  for (const order of orders) {
    for (const op of order.order_products) {
      if (op.cancelled || op.deleted) continue;
      const existing = map.get(op.product_name) ?? { quantity: 0, revenue: 0 };
      map.set(op.product_name, {
        quantity: existing.quantity + op.quantity,
        revenue: existing.revenue + op.total_price,
      });
    }
  }
  return [...map.entries()]
    .map(([product_name, v]) => ({ product_name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function ordersQueryKey(establishmentId: string, organizationId: string, from: string, to: string) {
  return ["orders", establishmentId, organizationId, from, to] as const;
}

/** Commandes avec produits et encaissements pour une période donnée. */
export function useEstablishmentOrders(establishmentId: string, organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: ordersQueryKey(establishmentId, organizationId, from, to),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_products(*),
          order_payments(
            *,
            order_payment_settlements(*)
          )
        `,
        )
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderWithDetails[];
    },
    enabled: !!establishmentId && !!organizationId && !!from && !!to,
  });
}

/** KPIs du mois courant pour le dashboard principal (toutes orga confondues). */
export function useDashboardMonthlyStats(organizationId: string) {
  const { from, to } = currentMonthRange();
  return useQuery({
    queryKey: ["dashboard-monthly-stats", organizationId, from, to],
    queryFn: async () => {
      const supabase = createClient();
      // Encaissements du mois
      const { data: settlements, error } = await supabase
        .from("order_payment_settlements")
        .select("amount, establishment_id, deleted")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("created_at", from)
        .lt("created_at", to);
      if (error) throw error;

      const revenueTTC = (settlements ?? []).reduce((s, r) => s + r.amount, 0);

      // Commandes du mois
      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("created_at", from)
        .lt("created_at", to);

      return { revenueTTC, orderCount: orderCount ?? 0, from, to };
    },
    enabled: !!organizationId,
  });
}

/** Dernières commandes toutes orga pour le dashboard (résumé). */
export function useDashboardRecentOrders(organizationId: string, limit = 10) {
  return useQuery({
    queryKey: ["dashboard-recent-orders", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, created_at, establishment_id, description,
          order_products(product_name, quantity, total_price, cancelled, deleted),
          order_payments(paid, order_payment_settlements(amount, payment_method_name, deleted))
        `,
        )
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as OrderWithDetails[];
    },
    enabled: !!organizationId,
  });
}
