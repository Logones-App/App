"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // localStorage indisponible
    }
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // localStorage indisponible (mode privé strict, etc.)
      }
    },
    [key],
  );

  return [value, set];
}
