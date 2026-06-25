import type { ComponentType } from "react";

import * as Flags from "country-flag-icons/react/3x2";

import { COUNTRIES } from "@/lib/constants/countries";

type FlagComponent = ComponentType<{ className?: string; title?: string }>;

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const Flag = (Flags as Record<string, FlagComponent | undefined>)[code];
  const title = COUNTRIES.find((c) => c.code === code)?.name ?? code;
  if (!Flag) return <span className="text-xs">{code}</span>;
  return <Flag className={className} title={title} />;
}
