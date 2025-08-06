"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ModalContentProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ModalContent({ isOpen, onClose, children, className }: ModalContentProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={className}>
        {children}
      </DialogContent>
    </Dialog>
  );
} 