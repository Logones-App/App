"use client";

import Image from "next/image";

import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/database.types";

import { BackToEstablishmentButton } from "../back-to-establishment-button";

import { AddProductToMenuModal } from "./add-product-to-menu-modal";
import { MenuFormModal } from "./menu-form-modal";
import { MenuProductsTable } from "./menu-products-table";
import { MenuSchedulesList } from "./menu-schedules-list";

interface MenuCardProps {
  activeMenu: Tables<"menus">;
  organizationId: string;
  deleteMenuId: string | null;
  setEditMenu: (menu: Tables<"menus"> | null) => void;
  setDeleteMenuId: (id: string | null) => void;
  deleteMenuMutation: any;
}

function MenuCard({
  activeMenu,
  organizationId,
  deleteMenuId,
  setEditMenu,
  setDeleteMenuId,
  deleteMenuMutation,
}: MenuCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {activeMenu.image_url && (
              <Image
                src={activeMenu.image_url}
                alt={activeMenu.name ?? "Menu"}
                width={32}
                height={32}
                className="h-8 w-8 rounded object-cover"
              />
            )}
            <span>{activeMenu.name ?? <span className="text-muted-foreground italic">(Sans nom)</span>}</span>
          </CardTitle>
          <div className="text-muted-foreground mt-1 text-sm">{activeMenu.description}</div>
          <div className="mt-2 flex gap-2 text-xs">
            {activeMenu.type && <span className="bg-muted rounded px-2 py-0.5">Type : {activeMenu.type}</span>}
            {activeMenu.is_active && <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Actif</span>}
            {activeMenu.is_public && <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Public</span>}
            {typeof activeMenu.display_order === "number" && (
              <span className="bg-muted rounded px-2 py-0.5">Ordre : {activeMenu.display_order}</span>
            )}
            <span className="bg-muted rounded px-2 py-0.5">Carte permanente</span>
          </div>
          <MenuSchedulesList menuId={activeMenu.id} organizationId={organizationId} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Éditer le menu" onClick={() => setEditMenu(activeMenu)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog open={deleteMenuId === activeMenu.id} onOpenChange={(open) => !open && setDeleteMenuId(null)}>
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
  );
}

interface MenusDisplayProps {
  establishmentId: string;
  organizationId: string;
  menus: Tables<"menus">[] | undefined;
  activeMenuId: string | null;
  setActiveMenuId: (id: string) => void;
  showMenuForm: boolean;
  setShowMenuForm: (show: boolean) => void;
  editMenu: Tables<"menus"> | undefined;
  setEditMenu: (menu: Tables<"menus"> | null) => void;
  deleteMenuId: string | null;
  setDeleteMenuId: (id: string | null) => void;
  activeMenu: Tables<"menus"> | undefined;
  addMenuMutation: ReturnType<typeof useMutation>;
  editMenuMutation: ReturnType<typeof useMutation>;
  deleteMenuMutation: ReturnType<typeof useMutation>;
}

export function MenusDisplay({
  establishmentId,
  organizationId,
  menus,
  activeMenuId,
  setActiveMenuId,
  showMenuForm,
  setShowMenuForm,
  editMenu,
  setEditMenu,
  deleteMenuId,
  setDeleteMenuId,
  activeMenu,
  addMenuMutation,
  editMenuMutation,
  deleteMenuMutation,
}: MenusDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <Button variant="default" size="sm" className="ml-auto" onClick={() => setShowMenuForm(true)}>
          + Ajouter un menu
        </Button>
      </div>

      {/* Tabs pour chaque menu */}
      <div className="mb-4 flex gap-2 border-b pb-2">
        {menus?.map((menu) => (
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
            {menu.name ?? <span className="text-muted-foreground italic">(Sans nom)</span>}
          </button>
        ))}
      </div>

      <MenuFormModal open={showMenuForm} onOpenChange={setShowMenuForm} onSubmit={addMenuMutation.mutate} />
      <MenuFormModal
        open={!!editMenu}
        onOpenChange={(v) => {
          if (!v) setEditMenu(null);
        }}
        onSubmit={(data) => editMenuMutation.mutate({ ...data, id: editMenu?.id ?? "" })}
        initialValues={editMenu}
      />

      {/* Card infos menu + actions */}
      {activeMenu && (
        <MenuCard
          activeMenu={activeMenu}
          organizationId={organizationId}
          deleteMenuId={deleteMenuId}
          setEditMenu={setEditMenu}
          setDeleteMenuId={setDeleteMenuId}
          deleteMenuMutation={deleteMenuMutation}
        />
      )}

      {/* Tableau des produits du menu */}
      {activeMenuId && <MenuProductsTable menuId={activeMenuId} onAddProduct={() => setShowMenuForm(true)} />}

      {/* Modale d'association produit/menu */}
      <AddProductToMenuModal
        menuId={activeMenuId!}
        organizationId={organizationId}
        open={showMenuForm}
        onOpenChange={setShowMenuForm}
      />
    </div>
  );
}
