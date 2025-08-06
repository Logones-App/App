import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  setShowAddForm: (show: boolean) => void;
  showAddForm: boolean;
}

export function SectionHeader({ setShowAddForm, showAddForm }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">Horaires d&apos;ouverture</h2>
      <Button onClick={() => setShowAddForm(!showAddForm)}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un créneau
      </Button>
    </div>
  );
}
