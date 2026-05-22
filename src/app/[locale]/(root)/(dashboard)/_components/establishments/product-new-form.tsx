"use client";

import { ProductNewWizard } from "./product-new-wizard";

export function ProductNewForm({
  establishmentId,
  organizationId,
  backHref,
}: {
  establishmentId: string;
  organizationId: string;
  backHref: string;
  /** @deprecated non utilisé dans le wizard, conservé pour compatibilité */
  redirectBase?: string;
}) {
  return <ProductNewWizard establishmentId={establishmentId} organizationId={organizationId} backHref={backHref} />;
}
