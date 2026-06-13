import { Building2 } from "lucide-react";

import { CommercialOrganizationsList } from "./_components/commercial-organizations-list";

export default function CommercialPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6" />
          Mes clients
        </h1>
        <p className="text-muted-foreground">Organisations assignées à votre portefeuille</p>
      </div>
      <CommercialOrganizationsList />
    </div>
  );
}
