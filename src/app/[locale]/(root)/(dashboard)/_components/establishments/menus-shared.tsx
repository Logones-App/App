"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEstablishmentMenus } from "@/lib/queries/establishments";

import { MenusDisplay } from "./_components/menus-display";
import { useMenusManagement } from "./_components/use-menus-management";
import { BackToEstablishmentButton } from "./back-to-establishment-button";

export function MenusShared({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const { data: menus } = useEstablishmentMenus(establishmentId, organizationId);

  const {
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
  } = useMenusManagement({ establishmentId, organizationId, menus });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <Button onClick={() => setShowMenuForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un menu
        </Button>
      </div>

      <MenusDisplay
        establishmentId={establishmentId}
        organizationId={organizationId}
        menus={menus}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        showMenuForm={showMenuForm}
        setShowMenuForm={setShowMenuForm}
        editMenu={editMenu ?? undefined}
        setEditMenu={setEditMenu}
        deleteMenuId={deleteMenuId}
        setDeleteMenuId={setDeleteMenuId}
        addMenuMutation={addMenuMutation as any}
        editMenuMutation={editMenuMutation as any}
        deleteMenuMutation={deleteMenuMutation as any}
      />
    </div>
  );
}
