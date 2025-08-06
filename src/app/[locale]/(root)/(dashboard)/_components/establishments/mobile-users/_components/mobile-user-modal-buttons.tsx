"use client";

import React from "react";

import { Button } from "@/components/ui/button";

import { getButtonText } from "./utils";

export function FormButtons({
  onClose,
  isLoading,
  isEdit,
}: {
  onClose: () => void;
  isLoading: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="flex justify-end space-x-2">
      <Button type="button" variant="outline" onClick={onClose}>
        Annuler
      </Button>
      <Button type="submit" disabled={isLoading}>
        {getButtonText(isLoading, isEdit)}
      </Button>
    </div>
  );
}
