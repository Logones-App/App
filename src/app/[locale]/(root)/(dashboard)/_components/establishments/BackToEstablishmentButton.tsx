import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToEstablishmentButton({
  establishmentId,
  organizationId,
  label = "Retour à l'établissement",
}: {
  establishmentId: string;
  organizationId: string;
  label?: string;
}) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");
  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;
  return (
    <Link href={backLink}>
      <Button variant="outline" size="sm">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
