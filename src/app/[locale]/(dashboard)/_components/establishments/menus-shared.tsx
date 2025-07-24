"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { Pencil, Trash2, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEstablishmentMenus } from "@/lib/queries/establishments";
import { useMenuProducts } from "@/lib/queries/establishments";
import { useEstablishmentProductsNotInMenus } from "@/lib/queries/establishments";
import { useOrganizationProducts, useEstablishmentProductsWithStocks } from "@/lib/queries/establishments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BackToEstablishmentButton } from "./BackToEstablishmentButton";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";

function MenuProductsList({ menuId }: { menuId: string }) {
  const { data: products, isLoading, isError } = useMenuProducts(menuId);
  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError) return <p className="text-destructive text-xs">Erreur lors du chargement des produits du menu.</p>;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground text-xs">Aucun produit dans ce menu.</p>;
  return (
    <div className="mt-2 space-y-2">
      {products.map((product: any) => (
        <div key={product.id} className="bg-muted/50 flex items-center gap-4 rounded border p-2">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
          )}
          <div className="flex-1">
            <div className="font-medium">{product.name}</div>
            {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
          </div>
          <div className="text-sm font-semibold">
            {product.menu_price != null ? (
              product.menu_price + " €"
            ) : (
              <span className="text-muted-foreground italic">(prix ?)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsNotInMenusList({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { data: products, isLoading, isError } = useEstablishmentProductsNotInMenus(establishmentId, organizationId);
  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError) return <p className="text-destructive text-xs">Erreur lors du chargement des produits hors menu.</p>;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground text-xs">Aucun produit hors menu.</p>;
  return (
    <div className="mt-2 space-y-2">
      {products.map((product: any) => (
        <div key={product.id} className="bg-muted/30 flex items-center gap-4 rounded border p-2">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
          )}
          <div className="flex-1">
            <div className="font-medium">{product.name}</div>
            {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
          </div>
          <div className="text-xs">
            Stock : {product.stock?.current_stock ?? <span className="text-muted-foreground italic">?</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductMenusList({ productId, menus }: { productId: string; menus: any[] }) {
  // Pour chaque menu, vérifier si le produit y est associé
  return (
    <div className="flex flex-wrap gap-2">
      {menus.map((menu) => {
        const menuProduct = menu.products?.find((p: any) => p.id === productId);
        if (!menuProduct) return null;
        return (
          <span key={menu.id} className="bg-muted rounded px-2 py-0.5 text-xs">
            {menu.name} ({menuProduct.menu_price != null ? menuProduct.menu_price + " €" : "prix ?"})
          </span>
        );
      })}
    </div>
  );
}

function ProductsTab({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const { data: products, isLoading: loadingProducts } = useOrganizationProducts(organizationId);
  const { data: menus, isLoading: loadingMenus } = useEstablishmentMenus(establishmentId, organizationId);
  const { data: productsWithStocks, isLoading: loadingStocks } = useEstablishmentProductsWithStocks(
    establishmentId,
    organizationId,
  );

  // Pour chaque menu, récupérer les produits associés (avec prix)
  // On prépare une map menuId -> produits du menu
  const menusWithProducts = (menus || []).map((menu: any) => {
    // On utilise le hook useMenuProducts pour chaque menu
    // (pour la démo, on suppose que les produits sont déjà chargés)
    // En production, il faudrait optimiser avec un hook global ou une requête jointe
    return {
      ...menu,
      products: [], // à remplir si besoin
    };
  });

  if (loadingProducts || loadingMenus || loadingStocks) return <Skeleton className="h-8 w-full" />;
  if (!products || products.length === 0)
    return <p className="text-muted-foreground">Aucun produit dans l'organisation.</p>;

  return (
    <div className="space-y-2">
      {products.map((product: any) => {
        const stock = (productsWithStocks || []).find((p: any) => p.id === product.id)?.stock;
        return (
          <div key={product.id} className="bg-muted/30 flex items-center gap-4 rounded border p-2">
            {product.image_url && (
              <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium">{product.name}</div>
              {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
              <ProductMenusList productId={product.id} menus={menusWithProducts} />
            </div>
            <div className="text-xs">
              Stock : {stock?.current_stock ?? <span className="text-muted-foreground italic">?</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StocksTab({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const { data: productsWithStocks, isLoading } = useEstablishmentProductsWithStocks(establishmentId, organizationId);
  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!productsWithStocks || productsWithStocks.length === 0)
    return <p className="text-muted-foreground">Aucun produit en stock dans cet établissement.</p>;
  return (
    <div className="space-y-2">
      {productsWithStocks.map((product: any) => {
        const stock = product.stock;
        const isLow = stock && stock.low_stock_threshold != null && stock.current_stock <= stock.low_stock_threshold;
        const isCritical =
          stock && stock.critical_stock_threshold != null && stock.current_stock <= stock.critical_stock_threshold;
        return (
          <div
            key={product.id}
            className={`flex items-center gap-4 rounded border p-2 ${isCritical ? "bg-red-100" : isLow ? "bg-yellow-100" : "bg-muted/30"}`}
          >
            {product.image_url && (
              <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium">{product.name}</div>
              {product.description && <div className="text-muted-foreground text-xs">{product.description}</div>}
            </div>
            <div className="flex flex-col items-end text-xs">
              <span>Stock : {stock?.current_stock ?? <span className="text-muted-foreground italic">?</span>}</span>
              {stock?.min_stock != null && <span>Min : {stock.min_stock}</span>}
              {stock?.max_stock != null && <span>Max : {stock.max_stock}</span>}
              {isCritical && <span className="font-bold text-red-600">Stock critique</span>}
              {!isCritical && isLow && <span className="font-bold text-yellow-700">Stock bas</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: "menus", label: "Menus" },
  { key: "products", label: "Produits" },
  { key: "stocks", label: "Stocks" },
];

function AddProductToMenuModal({
  menuId,
  organizationId,
  open,
  onOpenChange,
}: {
  menuId: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: orgProducts, isLoading } = useOrganizationProducts(organizationId);
  const { data: menuProducts } = useMenuProducts(menuId);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Produits non encore associés à ce menu
  const availableProducts = (orgProducts || []).filter(
    (p: any) => !(menuProducts || []).some((mp: any) => mp.id === p.id),
  );

  const mutation = useMutation({
    mutationFn: async (productId: string) => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").insert({
        menus_id: menuId || "",
        products_id: productId || "",
        organization_id: organizationId,
        price: null, // à éditer après si besoin
        deleted: false,
        // created_by: "system" // à activer si tu veux tracer l'auteur
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-products", menuId] });
      setSelectedProductId(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de l'association");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Associer un produit de l'organisation à ce menu</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : availableProducts.length === 0 ? (
          <div className="text-muted-foreground">Tous les produits de l'organisation sont déjà associés à ce menu.</div>
        ) : (
          <div className="space-y-2">
            <select
              className="w-full rounded border p-2"
              value={selectedProductId || ""}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="" disabled>
                Sélectionner un produit
              </option>
              {availableProducts.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!selectedProductId || mutation.status === "pending"}
              onClick={() => selectedProductId && mutation.mutate(selectedProductId)}
            >
              {mutation.status === "pending" ? "Ajout..." : "Associer au menu"}
            </Button>
            {error && <div className="text-destructive text-xs">{error}</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MenuFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: any) => void;
  initialValues?: any;
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: initialValues || { name: "", description: "", start_time: "", end_time: "", type: "" },
  });
  const [permanent, setPermanent] = useState(!initialValues?.start_time && !initialValues?.end_time);
  useEffect(() => {
    reset(initialValues || { name: "", description: "", start_time: "", end_time: "", type: "" });
    setPermanent(!initialValues?.start_time && !initialValues?.end_time);
  }, [initialValues, reset]);
  useEffect(() => {
    if (permanent) {
      setValue("start_time", "");
      setValue("end_time", "");
    }
  }, [permanent, setValue]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues ? "Modifier le menu" : "Ajouter un menu"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Input {...register("name", { required: true })} placeholder="Nom du menu" />
          <Input {...register("type")} placeholder="Type (ex: Déjeuner)" />
          <div className="mb-2 flex items-center gap-2">
            <Switch checked={permanent} onCheckedChange={setPermanent} id="permanent-switch" />
            <label htmlFor="permanent-switch" className="text-sm">
              Carte permanente
            </label>
          </div>
          <div className="flex gap-2">
            <Input {...register("start_time")} type="time" placeholder="Heure de début" disabled={permanent} />
            <Input {...register("end_time")} type="time" placeholder="Heure de fin" disabled={permanent} />
          </div>
          <textarea {...register("description")} className="w-full rounded border p-2" placeholder="Description" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">{initialValues ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MenuSchedulesList({ menuId, organizationId }: { menuId: string; organizationId: string }) {
  const {
    data: schedules,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["menu-schedules", menuId, organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menu_schedules")
        .select("*")
        .eq("menu_id", menuId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("day_of_week");
      if (error) throw error;
      return data || [];
    },
    enabled: !!menuId && !!organizationId,
  });
  const queryClient = useQueryClient();
  const addScheduleMutation = useMutation({
    mutationFn: async (values: any) => {
      const supabase = createClient();
      const { error } = await supabase.from("menu_schedules").insert({
        ...values,
        menu_id: menuId,
        organization_id: organizationId,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-schedules", menuId, organizationId] });
      setForm({ day_of_week: "", start_time: "", end_time: "", valid_from: "", valid_until: "" });
    },
  });
  const [form, setForm] = useState({ day_of_week: "", start_time: "", end_time: "", valid_from: "", valid_until: "" });
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menu_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-schedules", menuId, organizationId] });
      setDeleteScheduleId(null);
    },
  });
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const editScheduleMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const supabase = createClient();
      const { error } = await supabase.from("menu_schedules").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-schedules", menuId, organizationId] });
      setEditScheduleId(null);
      setEditForm(null);
    },
  });
  return (
    <div className="mt-2 flex flex-col gap-1">
      {isLoading && <Skeleton className="h-6 w-1/2" />}
      {isError && <p className="text-destructive text-xs">Erreur lors du chargement des plages de validité.</p>}
      {(!schedules || schedules.length === 0) && <span className="bg-muted rounded px-2 py-0.5">Carte permanente</span>}
      {schedules &&
        schedules.length > 0 &&
        schedules.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2">
            {editScheduleId === s.id ? (
              <form
                className="flex flex-1 flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  editScheduleMutation.mutate({
                    id: s.id,
                    day_of_week: editForm.day_of_week ? parseInt(editForm.day_of_week) : null,
                    start_time: editForm.start_time || null,
                    end_time: editForm.end_time || null,
                    valid_from: editForm.valid_from || null,
                    valid_until: editForm.valid_until || null,
                  });
                }}
              >
                <select
                  className="rounded border p-1 text-xs"
                  value={editForm.day_of_week}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, day_of_week: e.target.value }))}
                >
                  <option value="">Tous les jours</option>
                  <option value="1">Lundi</option>
                  <option value="2">Mardi</option>
                  <option value="3">Mercredi</option>
                  <option value="4">Jeudi</option>
                  <option value="5">Vendredi</option>
                  <option value="6">Samedi</option>
                  <option value="7">Dimanche</option>
                </select>
                <input
                  type="time"
                  className="rounded border p-1 text-xs"
                  value={editForm.start_time || ""}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, start_time: e.target.value }))}
                  placeholder="Début"
                />
                <input
                  type="time"
                  className="rounded border p-1 text-xs"
                  value={editForm.end_time || ""}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, end_time: e.target.value }))}
                  placeholder="Fin"
                />
                <input
                  type="date"
                  className="rounded border p-1 text-xs"
                  value={editForm.valid_from || ""}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, valid_from: e.target.value }))}
                  placeholder="Du"
                />
                <input
                  type="date"
                  className="rounded border p-1 text-xs"
                  value={editForm.valid_until || ""}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, valid_until: e.target.value }))}
                  placeholder="Au"
                />
                <Button type="submit" size="sm" disabled={editScheduleMutation.isPending}>
                  OK
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditScheduleId(null);
                    setEditForm(null);
                  }}
                >
                  Annuler
                </Button>
              </form>
            ) : (
              <span
                className="bg-muted flex-1 cursor-pointer rounded px-2 py-0.5 text-xs"
                onClick={() => {
                  setEditScheduleId(s.id);
                  setEditForm({
                    day_of_week: s.day_of_week?.toString() || "",
                    start_time: s.start_time || "",
                    end_time: s.end_time || "",
                    valid_from: s.valid_from || "",
                    valid_until: s.valid_until || "",
                  });
                }}
              >
                {s.day_of_week ? `Jour ${s.day_of_week}` : "Tous les jours"}
                {s.start_time && s.end_time ? `, ${s.start_time} - ${s.end_time}` : ""}
                {s.valid_from && s.valid_until ? `, du ${s.valid_from} au ${s.valid_until}` : ""}
              </span>
            )}
            <AlertDialog open={deleteScheduleId === s.id} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" title="Supprimer" onClick={() => setDeleteScheduleId(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette plage de validité ?</AlertDialogTitle>
                </AlertDialogHeader>
                <div>Cette action est irréversible.</div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteScheduleMutation.mutate(s.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      {/* Formulaire d'ajout de plage */}
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addScheduleMutation.mutate({
            day_of_week: form.day_of_week ? parseInt(form.day_of_week) : null,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null,
          });
        }}
      >
        <select
          className="rounded border p-1 text-xs"
          value={form.day_of_week}
          onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
        >
          <option value="">Tous les jours</option>
          <option value="1">Lundi</option>
          <option value="2">Mardi</option>
          <option value="3">Mercredi</option>
          <option value="4">Jeudi</option>
          <option value="5">Vendredi</option>
          <option value="6">Samedi</option>
          <option value="7">Dimanche</option>
        </select>
        <input
          type="time"
          className="rounded border p-1 text-xs"
          value={form.start_time}
          onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
          placeholder="Début"
        />
        <input
          type="time"
          className="rounded border p-1 text-xs"
          value={form.end_time}
          onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
          placeholder="Fin"
        />
        <input
          type="date"
          className="rounded border p-1 text-xs"
          value={form.valid_from}
          onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
          placeholder="Du"
        />
        <input
          type="date"
          className="rounded border p-1 text-xs"
          value={form.valid_until}
          onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
          placeholder="Au"
        />
        <Button type="submit" size="sm" disabled={addScheduleMutation.isPending}>
          Ajouter
        </Button>
      </form>
    </div>
  );
}

export function MenusShared({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const { data: menus, isLoading, isError } = useEstablishmentMenus(establishmentId, organizationId);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editMenu, setEditMenu] = useState<any>(null);
  const queryClient = useQueryClient();
  const addMenuMutation = useMutation({
    mutationFn: async (values: any) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").insert({
        ...values,
        organization_id: organizationId,
        establishments_id: establishmentId,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowMenuForm(false);
    },
  });
  const editMenuMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditMenu(null);
    },
  });
  const [deleteMenuId, setDeleteMenuId] = useState<string | null>(null);
  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteMenuId(null);
      setActiveMenuId(null);
    },
  });

  useEffect(() => {
    if (!activeMenuId && menus && menus.length > 0) {
      setActiveMenuId(menus[0].id);
    }
  }, [menus, activeMenuId]);

  const activeMenu = useMemo(() => menus?.find((m: any) => m.id === activeMenuId), [menus, activeMenuId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <Button variant="default" size="sm" className="ml-auto" onClick={() => setShowMenuForm(true)}>
          + Ajouter un menu
        </Button>
      </div>

      {/* Tabs pour chaque menu */}
      <div className="mb-4 flex gap-2 border-b pb-2">
        {menus &&
          menus.map((menu: any) => (
            <button
              key={menu.id}
              className={`border-b-2 px-4 py-2 font-medium transition-colors ${
                activeMenuId === menu.id
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-primary border-transparent"
              }`}
              onClick={() => setActiveMenuId(menu.id)}
              type="button"
            >
              {menu.name || <span className="text-muted-foreground italic">(Sans nom)</span>}
            </button>
          ))}
      </div>
      <MenuFormModal open={showMenuForm} onOpenChange={setShowMenuForm} onSubmit={addMenuMutation.mutate} />
      <MenuFormModal
        open={!!editMenu}
        onOpenChange={(v) => {
          if (!v) setEditMenu(null);
        }}
        onSubmit={(data) => editMenuMutation.mutate({ ...data, id: editMenu.id })}
        initialValues={editMenu}
      />
      {/* Card infos menu + actions */}
      {activeMenu && (
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {activeMenu.image_url && (
                  <img
                    src={activeMenu.image_url}
                    alt={activeMenu.name || "Menu"}
                    className="h-8 w-8 rounded object-cover"
                  />
                )}
                <span>{activeMenu.name || <span className="text-muted-foreground italic">(Sans nom)</span>}</span>
              </CardTitle>
              <div className="text-muted-foreground mt-1 text-sm">{activeMenu.description}</div>
              <div className="mt-2 flex gap-2 text-xs">
                {activeMenu.type && <span className="bg-muted rounded px-2 py-0.5">Type : {activeMenu.type}</span>}
                {activeMenu.is_active && <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Actif</span>}
                {activeMenu.is_public && <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Public</span>}
                {typeof activeMenu.display_order === "number" && (
                  <span className="bg-muted rounded px-2 py-0.5">Ordre : {activeMenu.display_order}</span>
                )}
                {!activeMenu.start_time && !activeMenu.end_time ? (
                  <span className="bg-muted rounded px-2 py-0.5">Carte permanente</span>
                ) : (
                  <>
                    {activeMenu.start_time && (
                      <span className="bg-muted rounded px-2 py-0.5">Débute : {activeMenu.start_time}</span>
                    )}
                    {activeMenu.end_time && (
                      <span className="bg-muted rounded px-2 py-0.5">Termine : {activeMenu.end_time}</span>
                    )}
                  </>
                )}
              </div>
              <MenuSchedulesList menuId={activeMenu.id} organizationId={organizationId} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" title="Éditer le menu" onClick={() => setEditMenu(activeMenu)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog
                open={deleteMenuId === activeMenu.id}
                onOpenChange={(open) => !open && setDeleteMenuId(null)}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    title="Supprimer"
                    onClick={() => setDeleteMenuId(activeMenu.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce menu ?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div>Cette action est irréversible. Tous les liens avec les produits seront supprimés.</div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMenuMutation.mutate(activeMenu.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
        </Card>
      )}
      {/* Tableau des produits du menu */}
      {activeMenuId && <MenuProductsTable menuId={activeMenuId} onAddProduct={() => setShowAddProductModal(true)} />}
      {/* Modale d'association produit/menu */}
      <AddProductToMenuModal
        menuId={activeMenuId!}
        organizationId={organizationId}
        open={showAddProductModal}
        onOpenChange={setShowAddProductModal}
      />
    </div>
  );
}

function MenuProductsTable({ menuId, onAddProduct }: { menuId: string; onAddProduct: () => void }) {
  const { data: products, isLoading, isError } = useMenuProducts(menuId);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const mutation = useMutation({
    mutationFn: async ({ menus_products_id, price }: { menus_products_id: string; price: number }) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").update({ price }).eq("id", menus_products_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditingId(null);
      setEditPrice("");
    },
  });
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const deleteProductMutation = useMutation({
    mutationFn: async (menus_products_id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menus_products").delete().eq("id", menus_products_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteProductId(null);
    },
  });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Produits du menu</h3>
        <Button size="sm" onClick={onAddProduct}>
          + Associer un produit
        </Button>
      </div>
      {isLoading && <Skeleton className="h-8 w-full" />}
      {isError && <p className="text-destructive text-xs">Erreur lors du chargement des produits du menu.</p>}
      {(!products || products.length === 0) && !isLoading && (
        <p className="text-muted-foreground text-xs">Aucun produit dans ce menu.</p>
      )}
      {products && products.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>
                  {editingId === product.menus_products_id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate({ menus_products_id: product.menus_products_id, price: parseFloat(editPrice) });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 rounded border p-1 text-right"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={mutation.isPending}>
                        OK
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </form>
                  ) : (
                    <span
                      onClick={() => {
                        setEditingId(product.menus_products_id);
                        setEditPrice(product.menu_price?.toString() || "");
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      {product.menu_price != null ? (
                        product.menu_price + " €"
                      ) : (
                        <span className="text-muted-foreground italic">(prix ?)</span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <AlertDialog
                    open={deleteProductId === product.menus_products_id}
                    onOpenChange={(open) => !open && setDeleteProductId(null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        title="Retirer du menu"
                        onClick={() => setDeleteProductId(product.menus_products_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Retirer ce produit du menu ?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <div>Cette action est irréversible.</div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProductMutation.mutate(product.menus_products_id)}>
                          Retirer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
