"use client";

import { type CreationIntent, ProductNewWizard } from "./product-new-wizard";

export function ProductNewForm({
  establishmentId,
  organizationId,
  backHref,
  intent,
}: {
  establishmentId: string;
  organizationId: string;
  backHref: string;
  intent?: CreationIntent;
  /** @deprecated non utilisé dans le wizard, conservé pour compatibilité */
  redirectBase?: string;
}) {
  return (
    <ProductNewWizard
      establishmentId={establishmentId}
      organizationId={organizationId}
      backHref={backHref}
      intent={intent}
    />
  );
}
