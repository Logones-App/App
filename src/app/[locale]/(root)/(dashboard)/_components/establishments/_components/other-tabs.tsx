"use client";

import { MenuCalendar } from "../menus-calendar";

import { ProductsTab } from "./products-tab";
import { StocksTab } from "./stocks-tab";

interface OtherTabsProps {
  establishmentId: string;
  organizationId: string;
  menusWithSchedules: any[] | undefined;
  onDateClick: (date: Date) => void;
  onEventClick: (event: { id: string; title: string; start: string; end: string }) => void;
}

export function OtherTabs({
  establishmentId,
  organizationId,
  menusWithSchedules,
  onDateClick,
  onEventClick,
}: OtherTabsProps) {
  return (
    <>
      <ProductsTab establishmentId={establishmentId} organizationId={organizationId} />
      <StocksTab establishmentId={establishmentId} organizationId={organizationId} />
      <MenuCalendar menus={menusWithSchedules ?? []} onDateClick={onDateClick} onEventClick={onEventClick} />
    </>
  );
}
