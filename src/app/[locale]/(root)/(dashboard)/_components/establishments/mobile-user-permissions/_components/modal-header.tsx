"use client";

import React from "react";

import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalHeaderProps {
  isEdit: boolean;
}

export function ModalHeader({ isEdit }: ModalHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? "Modifier la Permission" : "Ajouter une Permission"}</DialogTitle>
    </DialogHeader>
  );
}
