"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  pageTitle: string;
  pageDescription: string;
  onCreateClick: () => void;
  isCreateLoading: boolean;
}

export function PageHeader({ pageTitle, pageDescription, onCreateClick, isCreateLoading }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="text-muted-foreground">{pageDescription}</p>
      </div>
      <Button onClick={onCreateClick} disabled={isCreateLoading}>
        <Plus className="mr-2 h-4 w-4" />
        {isCreateLoading ? "Création..." : "Ajouter un Device"}
      </Button>
    </div>
  );
}
