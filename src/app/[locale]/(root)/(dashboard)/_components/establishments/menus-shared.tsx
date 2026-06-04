"use client";

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
    addMenuMutation,
    deleteMenuMutation,
    patchMenuMutation,
  } = useMenusManagement({ establishmentId, organizationId, menus });

  return (
    <div className="space-y-6">
      <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
      <MenusDisplay
        establishmentId={establishmentId}
        organizationId={organizationId}
        menus={menus}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        showMenuForm={showMenuForm}
        setShowMenuForm={setShowMenuForm}
        addMenuMutation={addMenuMutation as any}
        deleteMenuMutation={deleteMenuMutation as any}
        patchMenuMutation={patchMenuMutation}
      />
    </div>
  );
}
