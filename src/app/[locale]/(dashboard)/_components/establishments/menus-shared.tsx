"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function MenusShared({ establishmentId, organizationId }: { establishmentId: string; organizationId: string }) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");

  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backLink}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'établissement
          </Button>
        </Link>
      </div>

      <h2 className="text-2xl font-bold">Menus de l'établissement</h2>
      <p className="text-muted-foreground">(À implémenter)</p>
      <p className="mt-2 text-xs">
        establishmentId: <span className="font-mono">{establishmentId}</span>
      </p>
      <p className="text-xs">
        organizationId: <span className="font-mono">{organizationId}</span>
      </p>
    </div>
  );
}
