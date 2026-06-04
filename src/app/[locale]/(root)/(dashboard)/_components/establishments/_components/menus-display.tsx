"use client";

import { useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Plus, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";

import { MenuFormModal } from "./menu-form-modal";
import { MenuFormulasPanel } from "./menu-formulas-panel";
import { MenuProductsGridPanel } from "./menu-products-grid-panel";
import { MenuSchedulesList } from "./menu-schedules-list";

type PatchPayload = Partial<Tables<"menus">> & { id: string };

function MenuSettingsDialog({
  menu,
  open,
  onOpenChange,
  onPatch,
  onDelete,
  patchPending,
  deletePending,
}: {
  menu: Tables<"menus">;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPatch: (patch: PatchPayload) => void;
  onDelete: () => void;
  patchPending: boolean;
  deletePending: boolean;
}) {
  const [name, setName] = useState(menu.name ?? "");
  const [description, setDescription] = useState(menu.description ?? "");
  const [isActive, setIsActive] = useState(menu.is_active ?? false);
  const [isPublic, setIsPublic] = useState(menu.is_public ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(menu.name ?? "");
      setDescription(menu.description ?? "");
      setIsActive(menu.is_active ?? false);
      setIsPublic(menu.is_public ?? false);
      setConfirmDelete(false);
    }
  }, [open, menu]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres du menu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm">Actif</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              <span className="text-sm">Public</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={patchPending}
              onClick={() =>
                onPatch({
                  id: menu.id,
                  name: name.trim(),
                  description: description.trim(),
                  is_active: isActive,
                  is_public: isPublic,
                })
              }
            >
              Enregistrer
            </Button>
          </div>

          <div className="border-t pt-3">
            {confirmDelete ? (
              <div className="border-destructive/50 bg-destructive/5 space-y-2 rounded-lg border p-3">
                <p className="text-destructive text-sm font-medium">Confirmer la suppression ?</p>
                <p className="text-muted-foreground text-xs">
                  Cette action est irréversible. Tous les liens avec les produits seront supprimés.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                  <Button size="sm" variant="destructive" disabled={deletePending} onClick={onDelete}>
                    Supprimer définitivement
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive w-full justify-start"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer ce menu
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">Aucun menu configuré pour cet établissement.</p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Créer votre premier menu
      </Button>
    </div>
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
  addMenuMutation: ReturnType<typeof useMutation>;
  deleteMenuMutation: ReturnType<typeof useMutation>;
  patchMenuMutation: { mutate: (patch: PatchPayload) => void; isPending: boolean };
}

export function MenusDisplay({
  establishmentId,
  organizationId,
  menus,
  activeMenuId,
  setActiveMenuId,
  showMenuForm,
  setShowMenuForm,
  addMenuMutation,
  deleteMenuMutation,
  patchMenuMutation,
}: MenusDisplayProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeMenu = menus?.find((m) => m.id === activeMenuId);

  const handleDelete = () => {
    if (!activeMenu) return;
    (deleteMenuMutation.mutate as (id: string) => void)(activeMenu.id);
    setSettingsOpen(false);
  };

  return (
    <div className="space-y-4">
      <MenuFormModal
        open={showMenuForm}
        onOpenChange={setShowMenuForm}
        onSubmit={addMenuMutation.mutate as (values: Tables<"menus">) => void}
      />

      {!menus?.length ? (
        <MenuEmptyState onAdd={() => setShowMenuForm(true)} />
      ) : (
        <Tabs key={activeMenuId ?? "no-menu"} defaultValue="products" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={activeMenuId ?? ""} onValueChange={setActiveMenuId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Choisir un menu…" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name ?? "(Sans nom)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeMenu && (
                <Button size="icon" variant="ghost" title="Paramètres du menu" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <TabsList>
                <TabsTrigger value="products">Produits</TabsTrigger>
                <TabsTrigger value="formulas">Formules</TabsTrigger>
                <TabsTrigger value="schedules">Horaires</TabsTrigger>
              </TabsList>
            </div>
            <Button size="sm" onClick={() => setShowMenuForm(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Ajouter un menu
            </Button>
          </div>

          {activeMenu && (
            <>
              <MenuSettingsDialog
                menu={activeMenu}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                onPatch={patchMenuMutation.mutate}
                onDelete={handleDelete}
                patchPending={patchMenuMutation.isPending}
                deletePending={!!deleteMenuMutation.isPending}
              />
              <TabsContent value="products" className="mt-4">
                <MenuProductsGridPanel
                  menuId={activeMenu.id}
                  establishmentId={establishmentId}
                  organizationId={organizationId}
                />
              </TabsContent>
              <TabsContent value="formulas" className="mt-4">
                <MenuFormulasPanel
                  menuId={activeMenu.id}
                  establishmentId={establishmentId}
                  organizationId={organizationId}
                />
              </TabsContent>
              <TabsContent value="schedules" className="mt-4">
                <MenuSchedulesList menuId={activeMenu.id} organizationId={organizationId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}
