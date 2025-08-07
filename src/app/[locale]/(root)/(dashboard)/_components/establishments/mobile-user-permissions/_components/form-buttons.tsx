"use client";

import React from "react";

import { Button } from "@/components/ui/button";

import { getButtonText } from "./utils";

interface FormButtonsProps {
  onClose: () => void;
  isLoading: boolean;
  isEdit: boolean;
}

export function FormButtons({ onClose, isLoading, isEdit }: FormButtonsProps) {
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
