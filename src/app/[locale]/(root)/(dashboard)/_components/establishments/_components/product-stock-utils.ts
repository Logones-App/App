"use client";

import { AlertTriangle, CheckCircle, XCircle, Package } from "lucide-react";
import type { ProductStock } from "./use-products-data";

// Fonction pour obtenir le statut du stock
export const getStockStatus = (stock: ProductStock | null) => {
  if (!stock) return { status: "unknown", color: "gray", text: "Non géré", icon: Package };

  const current = stock.current_stock ?? 0;
  const min = stock.min_stock ?? 0;
  const max = stock.max_stock;
  const lowThreshold = stock.low_stock_threshold;
  const criticalThreshold = stock.critical_stock_threshold;

  // Stock critique
  if (criticalThreshold != null && current <= criticalThreshold) {
    return { status: "critical", color: "red", text: "Critique", icon: XCircle };
  }

  // Stock bas
  if (lowThreshold != null && current <= lowThreshold) {
    return { status: "low", color: "yellow", text: "Bas", icon: AlertTriangle };
  }

  // Stock normal
  if (max != null && current >= max) {
    return { status: "full", color: "green", text: "Plein", icon: CheckCircle };
  }

  return { status: "normal", color: "green", text: "Normal", icon: CheckCircle };
}; 