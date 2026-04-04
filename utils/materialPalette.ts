/**
 * Material Design 3–aligned accent topics (primary/secondary hues).
 * Applied via `data-dpal-palette` on `document.documentElement`; tokens live in `styles/material-palettes.css`.
 */

export const DPAL_MATERIAL_PALETTE_STORAGE_KEY = 'dpal-material-palette-v1';

export const MATERIAL_PALETTE_OPTIONS = [
  { id: 'teal', label: 'Teal & cyan', hint: 'Default civic ledger' },
  { id: 'green', label: 'Green', hint: 'Trust & environment' },
  { id: 'blue', label: 'Blue', hint: 'Professional & clarity' },
  { id: 'bluegrey', label: 'Blue grey', hint: 'Neutral authority' },
  { id: 'purple', label: 'Purple', hint: 'Focus & depth' },
  { id: 'orange', label: 'Orange', hint: 'Alert & warmth' },
] as const;

export type MaterialPaletteId = (typeof MATERIAL_PALETTE_OPTIONS)[number]['id'];

export function getStoredMaterialPaletteId(): MaterialPaletteId {
  if (typeof window === 'undefined') return 'teal';
  try {
    const raw = localStorage.getItem(DPAL_MATERIAL_PALETTE_STORAGE_KEY);
    if (raw && MATERIAL_PALETTE_OPTIONS.some((o) => o.id === raw)) {
      return raw as MaterialPaletteId;
    }
  } catch {
    /* ignore */
  }
  return 'teal';
}

/** Apply palette to <html>; `teal` clears the attribute so base :root tokens from material-web-theme.css apply. */
export function applyMaterialPalette(id: MaterialPaletteId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (id === 'teal') {
    root.removeAttribute('data-dpal-palette');
  } else {
    root.setAttribute('data-dpal-palette', id);
  }
  try {
    localStorage.setItem(DPAL_MATERIAL_PALETTE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function initMaterialPaletteFromStorage(): void {
  applyMaterialPalette(getStoredMaterialPaletteId());
}
