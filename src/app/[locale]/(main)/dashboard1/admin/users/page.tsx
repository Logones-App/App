"use client";

import { useTranslations } from "next-intl";
import { UserManagement } from "@/components/admin/user-management";

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <UserManagement />
    </div>
  );
}
