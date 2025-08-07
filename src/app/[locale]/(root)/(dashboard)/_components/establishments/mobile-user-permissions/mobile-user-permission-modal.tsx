"use client";

import React from "react";

import { ModalContent } from "@/components/ui/modal-content";
import { useFormSubmission } from "@/hooks/use-form-submission";
import { useModalDisplay } from "@/hooks/use-modal-display";
import {
  mobileUserPermissionSchema,
  type MobileUserPermissionFormData,
} from "@/lib/schemas/mobile-user-permissions-schema";
import type { Database } from "@/lib/supabase/database.types";

import { ModalHeader, FormButtons } from "./_components";
import { useMobileUserPermissionForm } from "./_components/use-mobile-user-permission-form";
import { FormFields } from "./mobile-user-permission-form";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];

interface MobileUserPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MobileUserPermissionFormData) => void;
  initialData?: MobileUserPermission;
  isEdit: boolean;
  isLoading: boolean;
  establishmentId: string;
  organizationId?: string;
}

export function MobileUserPermissionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit,
  isLoading,
  establishmentId,
  organizationId,
}: MobileUserPermissionModalProps) {
  const { formData, handleInputChange } = useMobileUserPermissionForm(initialData);
  const { handleSubmit } = useFormSubmission(mobileUserPermissionSchema, onSubmit);
  const { shouldRender } = useModalDisplay(isOpen);

  if (!shouldRender()) return null;

  return (
    <ModalContent isOpen={isOpen} onClose={onClose} className="sm:max-w-[425px]">
      <ModalHeader isEdit={isEdit} />
      <form onSubmit={(e) => handleSubmit(e, formData)} className="space-y-4">
        <FormFields
          formData={formData}
          handleInputChange={handleInputChange}
          isEdit={isEdit}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
        <FormButtons onClose={onClose} isLoading={isLoading} isEdit={isEdit} />
      </form>
    </ModalContent>
  );
}
