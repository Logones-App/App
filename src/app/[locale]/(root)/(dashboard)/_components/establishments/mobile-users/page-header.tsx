"use client";

import React from "react";

import { UserPlus } from "lucide-react";

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
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
      </div>
      <Button className="flex items-center gap-2" onClick={onCreateClick} disabled={isCreateLoading}>
        <UserPlus className="h-4 w-4" />
        Ajouter un utilisateur
      </Button>
    </div>
  );
}
