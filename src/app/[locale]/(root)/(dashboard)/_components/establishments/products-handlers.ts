"use client";

import { useState } from "react";

import type { ProductWithStock } from "@/lib/types/database-extensions";

import type { Product, ProductStock } from "./_components";

// Hook pour les fonctions de gestion des produits
export function useProductsHandlers() {
  // États pour les formulaires
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProductsModal, setShowAddProductsModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // États pour les formulaires
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    price: 0,
    vat_rate: 20,
    is_available: true,
    current_stock: -1,
    min_stock: 0,
    max_stock: null as number | null,
    low_stock_threshold: null as number | null,
    critical_stock_threshold: null as number | null,
    unit: "pièce",
  });

  const [editProductForm, setEditProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    vat_rate: 20,
    is_available: true,
  });

  const [editStockForm, setEditStockForm] = useState({
    current_stock: 0,
    min_stock: 0,
    max_stock: null as number | null,
    low_stock_threshold: null as number | null,
    critical_stock_threshold: null as number | null,
    unit: "pièce",
  });

  // Fonction pour commencer l'édition d'un produit
  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditProductForm({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      vat_rate: product.vat_rate,
      is_available: product.is_available ?? true,
    });
  };

  // Fonction pour commencer l'édition d'un stock
  const startEditStock = (product: ProductWithStock) => {
    setEditingStockId(product.id);
    setEditStockForm({
      current_stock: product.stock?.current_stock ?? 0,
      min_stock: product.stock?.min_stock ?? 0,
      max_stock: product.stock?.max_stock ?? null,
      low_stock_threshold: product.stock?.low_stock_threshold ?? null,
      critical_stock_threshold: product.stock?.critical_stock_threshold ?? null,
      unit: product.stock?.unit ?? "pièce",
    });
  };

  // Fonction pour annuler l'édition
  const cancelEdit = () => {
    setEditingProductId(null);
    setEditingStockId(null);
    setEditProductForm({
      name: "",
      description: "",
      price: 0,
      vat_rate: 20,
      is_available: true,
    });
    setEditStockForm({
      current_stock: 0,
      min_stock: 0,
      max_stock: null,
      low_stock_threshold: null,
      critical_stock_threshold: null,
      unit: "pièce",
    });
  };

  return {
    showAddForm,
    setShowAddForm,
    showAddProductsModal,
    setShowAddProductsModal,
    editingProductId,
    setEditingProductId,
    editingStockId,
    setEditingStockId,
    errorMsg,
    setErrorMsg,
    searchTerm,
    setSearchTerm,
    addForm,
    setAddForm,
    editProductForm,
    setEditProductForm,
    editStockForm,
    setEditStockForm,
    startEditProduct,
    startEditStock,
    cancelEdit,
  };
}
