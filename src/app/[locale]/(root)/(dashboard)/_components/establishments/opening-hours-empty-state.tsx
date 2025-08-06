import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  setShowAddForm: (show: boolean) => void;
}

export function EmptyState({ setShowAddForm }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">Aucun horaire configuré</p>
        <Button onClick={() => setShowAddForm(true)} className="mt-4">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter le premier créneau
        </Button>
      </CardContent>
    </Card>
  );
}
