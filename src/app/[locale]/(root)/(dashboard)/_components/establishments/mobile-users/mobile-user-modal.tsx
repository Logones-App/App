"use client";

import React from "react";

import { ModalContent } from "@/components/ui/modal-content";
import { useFormSubmission } from "@/hooks/use-form-submission";
import { useModalDisplay } from "@/hooks/use-modal-display";
import { mobileUserSchema, type MobileUserFormData } from "@/lib/schemas/mobile-user-schema";
import type { Database } from "@/lib/supabase/database.types";

import { ModalHeader, FormButtons } from "./_components";
import { useMobileUserForm } from "./_components/use-mobile-user-form";
import { FormFields } from "./mobile-user-form";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

export function MobileUserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MobileUserFormData) => void;
  initialData?: MobileUser;
  isEdit: boolean;
  isLoading: boolean;
}) {
  const { formData, handleInputChange } = useMobileUserForm(initialData);
  const { handleSubmit } = useFormSubmission(mobileUserSchema, onSubmit);
  const { shouldRender } = useModalDisplay(isOpen);

  if (!shouldRender()) return null;

  return (
    <ModalContent isOpen={isOpen} onClose={onClose} className="sm:max-w-[425px]">
      <ModalHeader isEdit={isEdit} />
      <form onSubmit={(e) => handleSubmit(e, formData)} className="space-y-4">
        <FormFields formData={formData} handleInputChange={handleInputChange} isEdit={isEdit} />
        <FormButtons onClose={onClose} isLoading={isLoading} isEdit={isEdit} />
      </form>
    </ModalContent>
  );
}
