import { Target } from "lucide-react";

import { AdminLeadsContent } from "./_components/admin-leads-content";

export default function AdminLeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Target className="h-6 w-6" />
          Leads — Vue globale
        </h1>
        <p className="text-muted-foreground">Tous les leads, file d&apos;attente et attribution</p>
      </div>
      <AdminLeadsContent />
    </div>
  );
}
