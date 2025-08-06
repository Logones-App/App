"use client";

import { useCallback } from "react";

import { z } from "zod";

export function useFormSubmission<T>(
  schema: z.ZodSchema<T>,
  onSubmit: (data: T) => void,
  onError?: (errors: z.ZodError) => void,
) {
  const handleSubmit = useCallback(
    (e: React.FormEvent, formData: Record<string, unknown>) => {
      e.preventDefault();

      try {
        const validatedData = schema.parse(formData);
        onSubmit(validatedData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          onError?.(error);
        }
      }
    },
    [schema, onSubmit, onError],
  );

  return { handleSubmit };
}
