import type { PaletteGridActionPreset } from "@/lib/menu-grid/category-grid-action";

/** Données attachées aux draggables palette → grille menu. */
export type PaletteDragData =
  | { kind: "category"; categoryId: string; label: string }
  | { kind: "product"; productId: string; label: string }
  | { kind: "grid_action"; actionType: PaletteGridActionPreset; label: string };

export function parseGridCellDroppableId(id: string): { panel: number; row: number; localCol: number } | null {
  if (!id.startsWith("grid-cell-")) return null;
  const rest = id.slice("grid-cell-".length);
  const parts = rest.split("-");
  if (parts.length !== 3) return null;
  const panel = Number.parseInt(parts[0], 10);
  const row = Number.parseInt(parts[1], 10);
  const localCol = Number.parseInt(parts[2], 10);
  if ([panel, row, localCol].some((n) => Number.isNaN(n))) return null;
  return { panel, row, localCol };
}
