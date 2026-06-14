"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { type CrmProduct, CATEGORIES, PRICE_TYPES } from "./products-types";

interface Props {
  open: boolean;
  product?: CrmProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  unit_price: string;
  purchase_price: string;
  price_type: string;
  is_active: boolean;
}

export function ProductModal({ open, product, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    category: "service",
    unit_price: "",
    purchase_price: "",
    price_type: "monthly",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name ?? "",
      description: product?.description ?? "",
      category: product?.category ?? "service",
      unit_price: product ? String(product.unit_price) : "",
      purchase_price: product ? String(product.purchase_price) : "",
      price_type: product?.price_type ?? "monthly",
      is_active: product?.is_active ?? true,
    });
  }, [open, product]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }
    const price = parseFloat(form.unit_price);
    if (isNaN(price) || price < 0) {
      toast.error("Le prix doit être un nombre positif");
      return;
    }
    const purchasePrice = parseFloat(form.purchase_price) || 0;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!product && !user) {
        toast.error("Session expirée, reconnectez-vous");
        return;
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        unit_price: price,
        purchase_price: purchasePrice,
        price_type: form.price_type,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };
      const { error } = product
        ? await supabase.from("crm_products").update(payload).eq("id", product.id)
        : await supabase.from("crm_products").insert({ ...payload, created_by: user?.id ?? null });
      if (error) throw error;
      toast.success(product ? "Produit mis à jour" : "Produit créé");
      onSuccess();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex : Logiciel Caisse Pro"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Description courte…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type de prix</Label>
              <Select value={form.price_type} onValueChange={(v) => set("price_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prix de vente (€ HT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => set("unit_price", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prix d&apos;achat (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => set("purchase_price", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) => set("is_active", checked === true)}
            />
            <Label htmlFor="is_active" className="cursor-pointer font-normal">
              Produit actif (visible dans les devis)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
