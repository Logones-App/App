"use client";

import { NotificationsCenter } from "@/components/realtime/notifications-center";
import { RealtimeConnectionStatus } from "@/components/realtime/connection-status";
import { AccountSwitcher } from "./account-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { SearchDialog } from "./search-dialog";
import { LayoutControls } from "./layout-controls";

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
