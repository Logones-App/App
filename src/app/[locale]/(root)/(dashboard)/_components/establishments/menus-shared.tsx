"use client";
import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstablishmentMenus, useEstablishmentMenusWithSchedules } from "@/lib/queries/establishments";

import { MenusDisplay } from "./_components/menus-display";
import { OtherTabs } from "./_components/other-tabs";
import { useMenusManagement } from "./_components/use-menus-management";
import { BackToEstablishmentButton } from "./back-to-establishment-button";

export function MenusShared({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const { data: menus } = useEstablishmentMenus(establishmentId, organizationId);
  const [activeTab, setActiveTab] = useState("menus");
  const { data: menusWithSchedules } = useEstablishmentMenusWithSchedules(establishmentId, organizationId);

  const {
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
  } = useMenusManagement({ establishmentId, organizationId, menus });

  const handleDateClick = (date: Date) => {
    console.log("Date clicked:", date);
  };

  const handleEventClick = (event: { id: string; title: string; start: string; end: string }) => {
    console.log("Event clicked:", event);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <Button onClick={() => setShowMenuForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un menu
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="menus">Menus</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="space-y-4">
          <MenusDisplay
            establishmentId={establishmentId}
            organizationId={organizationId}
            menus={menus}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            showMenuForm={showMenuForm}
            setShowMenuForm={setShowMenuForm}
            editMenu={editMenu}
            setEditMenu={setEditMenu}
            deleteMenuId={deleteMenuId}
            setDeleteMenuId={setDeleteMenuId}
            activeMenu={activeMenu}
            addMenuMutation={addMenuMutation}
            editMenuMutation={editMenuMutation}
            deleteMenuMutation={deleteMenuMutation}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <OtherTabs
            establishmentId={establishmentId}
            organizationId={organizationId}
            menusWithSchedules={menusWithSchedules}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="stocks" className="space-y-4">
          <OtherTabs
            establishmentId={establishmentId}
            organizationId={organizationId}
            menusWithSchedules={menusWithSchedules}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <OtherTabs
            establishmentId={establishmentId}
            organizationId={organizationId}
            menusWithSchedules={menusWithSchedules}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
