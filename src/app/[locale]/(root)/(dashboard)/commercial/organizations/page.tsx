import { Building2 } from "lucide-react";

import { CommercialOrganizationsList } from "../_components/commercial-organizations-list";

export default function CommercialOrganizationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6" />
          Organisations
        </h1>
        <p className="text-muted-foreground">Toutes vos organisations clientes</p>
      </div>
      <CommercialOrganizationsList />
    </div>
  );
}
