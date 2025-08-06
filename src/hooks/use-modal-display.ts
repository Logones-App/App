"use client";

import { useCallback } from "react";

export function useModalDisplay(isOpen: boolean) {
  const shouldRender = useCallback(() => {
    return isOpen;
  }, [isOpen]);

  return { shouldRender };
}
