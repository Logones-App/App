"use client";

import Image from "next/image";

import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/lib/supabase/database.types";

import { MenuFormModal } from "./menu-form-modal";
import { MenuProductsGridPanel } from "./menu-products-grid-panel";
import { MenuSchedulesList } from "./menu-schedules-list";

interface MenuCardProps {
  menu: Tables<"menus">;
  organizationId: string;
  deleteMenuId: string | null;
  setEditMenu: (menu: Tables<"menus"> | null) => void;
  setDeleteMenuId: (id: string | null) => void;
  deleteMenuMutation: ReturnType<typeof useMutation>;
}

function MenuCard({
  menu,
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
            {menu.image_url && (
              <Image
                src={menu.image_url}
                alt={menu.name ?? "Menu"}
                width={32}
                height={32}
                className="h-8 w-8 rounded object-cover"
              />
            )}
            <span>{menu.name ?? <span className="text-muted-foreground italic">(Sans nom)</span>}</span>
          </CardTitle>
          <div className="text-muted-foreground mt-1 text-sm">{menu.description}</div>
          <div className="mt-2 flex gap-2 text-xs">
            {menu.type && <span className="bg-muted rounded px-2 py-0.5">Type : {menu.type}</span>}
            {menu.is_active && <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Actif</span>}
            {menu.is_public && <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Public</span>}
            {typeof menu.display_order === "number" && (
              <span className="bg-muted rounded px-2 py-0.5">Ordre : {menu.display_order}</span>
            )}
            <span className="bg-muted rounded px-2 py-0.5">Carte permanente</span>
          </div>
          <MenuSchedulesList menuId={menu.id} organizationId={organizationId} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Éditer le menu" onClick={() => setEditMenu(menu)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog open={deleteMenuId === menu.id} onOpenChange={(open) => !open && setDeleteMenuId(null)}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" title="Supprimer" onClick={() => setDeleteMenuId(menu.id)}>
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
                <AlertDialogAction onClick={() => deleteMenuMutation.mutate(menu.id)}>Supprimer</AlertDialogAction>
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
  addMenuMutation,
  editMenuMutation,
  deleteMenuMutation,
}: MenusDisplayProps) {
  const t = useTranslations("establishments.menus_page");

  return (
    <div className="space-y-4">
      <MenuFormModal open={showMenuForm} onOpenChange={setShowMenuForm} onSubmit={addMenuMutation.mutate} />
      <MenuFormModal
        open={!!editMenu}
        onOpenChange={(v) => {
          if (!v) setEditMenu(null);
        }}
        onSubmit={(data) => editMenuMutation.mutate({ ...data, id: editMenu?.id ?? "" })}
        initialValues={editMenu}
      />

      {!menus?.length ? (
        <p className="text-muted-foreground text-sm">{t("no_menus")}</p>
      ) : (
        <Tabs value={activeMenuId ?? menus[0]?.id} onValueChange={(v) => setActiveMenuId(v)} className="w-full">
          <TabsList className="bg-muted/40 flex h-auto w-full flex-wrap justify-start gap-1 p-1">
            {menus.map((menu) => (
              <TabsTrigger key={menu.id} value={menu.id} className="max-w-[220px] truncate">
                {menu.name ?? <span className="text-muted-foreground italic">(Sans nom)</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          {menus.map((menu) => (
            <TabsContent key={menu.id} value={menu.id} className="mt-6 space-y-4 focus-visible:outline-none">
              <Tabs defaultValue="properties" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="properties">{t("tab_properties")}</TabsTrigger>
                  <TabsTrigger value="products">{t("tab_products")}</TabsTrigger>
                </TabsList>
                <TabsContent value="properties" className="mt-4 space-y-4">
                  <MenuCard
                    menu={menu}
                    organizationId={organizationId}
                    deleteMenuId={deleteMenuId}
                    setEditMenu={setEditMenu}
                    setDeleteMenuId={setDeleteMenuId}
                    deleteMenuMutation={deleteMenuMutation}
                  />
                </TabsContent>
                <TabsContent value="products" className="mt-4">
                  <MenuProductsGridPanel
                    menuId={menu.id}
                    establishmentId={establishmentId}
                    organizationId={organizationId}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
