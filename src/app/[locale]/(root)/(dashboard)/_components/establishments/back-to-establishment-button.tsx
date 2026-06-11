"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const button = (
    <Link href={backLink}>
      <Button variant="outline" size="sm">
        <ArrowLeft className={label ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {label}
      </Button>
    </Link>
  );

  if (label) return button;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">Retour à l&apos;établissement</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
