"use client";

import { RealtimeConnectionStatus } from "@/components/realtime/connection-status";
import { NotificationsCenter } from "@/components/realtime/notifications-center";

import { AccountSwitcher } from "./account-switcher";
import { LayoutControls } from "./layout-controls";
import { SearchDialog } from "./search-dialog";
import { ThemeSwitcher } from "./theme-switcher";

export function NavUser() {
  return (
    <div className="flex items-center gap-2">
      <SearchDialog />
      <NotificationsCenter />
      <RealtimeConnectionStatus />
      <ThemeSwitcher />
      <LayoutControls />
      <AccountSwitcher />
    </div>
  );
}
