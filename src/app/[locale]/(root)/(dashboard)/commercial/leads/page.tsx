import { Target } from "lucide-react";

import { LeadsContent } from "./_components/leads-content";

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Target className="h-6 w-6" />
          Leads
        </h1>
        <p className="text-muted-foreground">Gérez vos prospects et votre pipeline commercial</p>
      </div>
      <LeadsContent />
    </div>
  );
}
