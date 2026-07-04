"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

import { ProductEstablishmentDashboard } from "./product-establishment-dashboard";
import { ProductNewForm } from "./product-new-form";

export function ProductNewPageClient() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgFromHook = useOrgaUserOrganizationId();
  const isAdminEstablishmentRoute = pathname.includes("/admin/organizations/");
  const organizationId = isAdminEstablishmentRoute ? (params.id as string) : (orgFromHook ?? "");
  const establishmentId = (params.establishmentId ?? params.id) as string;
  const listHref = pathname.replace(/\/new\/?$/, "");
  const intent = searchParams.get("type") === "ingredient" ? "ingredient" : "product";

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement du contexte organisation…</span>
      </div>
    );
  }

  return (
    <ProductNewForm
      establishmentId={establishmentId}
      organizationId={organizationId}
      backHref={listHref}
      redirectBase={listHref}
      intent={intent}
    />
  );
}

export function ProductEditPageClient() {
  const pathname = usePathname();
  const params = useParams();
  const productId = params.productId as string;
  const establishmentId = (params.establishmentId ?? params.id) as string;
  const orgFromHook = useOrgaUserOrganizationId();
  const isAdminEstablishmentRoute = pathname.includes("/admin/organizations/");
  const organizationId = isAdminEstablishmentRoute ? (params.id as string) : (orgFromHook ?? "");
  const listHref = pathname.replace(/\/[^/]+\/?$/, "");

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement du contexte organisation…</span>
      </div>
    );
  }

  return (
    <ProductEstablishmentDashboard
      productId={productId}
      establishmentId={establishmentId}
      organizationId={organizationId}
      backHref={listHref}
    />
  );
}
