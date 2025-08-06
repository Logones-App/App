"use client";

import React from "react";

import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getDialogTitle } from "./utils";

export function ModalHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogHeader>
      <DialogTitle>{getDialogTitle(isEdit)}</DialogTitle>
    </DialogHeader>
  );
}
