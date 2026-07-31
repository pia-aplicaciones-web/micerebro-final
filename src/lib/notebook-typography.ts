export const NOTEBOOK_FONT_SIZES = [10, 12, 14, 16] as const;
export type NotebookFontSize = (typeof NOTEBOOK_FONT_SIZES)[number];

export const NOTEBOOK_FONTS = [
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif" },
  { id: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif" },
  { id: 'manrope', label: 'Manrope', family: "'Manrope', sans-serif" },
] as const;

export type NotebookFontId = (typeof NOTEBOOK_FONTS)[number]['id'];

export function getNotebookFont(id?: string | null) {
  return NOTEBOOK_FONTS.find((f) => f.id === id) || NOTEBOOK_FONTS[0];
}

export function resolveNotebookFontSize(
  value: unknown,
  fallback: NotebookFontSize = 14
): NotebookFontSize {
  const n = typeof value === 'number' ? value : Number(value);
  if ((NOTEBOOK_FONT_SIZES as readonly number[]).includes(n)) {
    return n as NotebookFontSize;
  }
  return fallback;
}

export function resolveNotebookFontId(
  value: unknown,
  fallback: NotebookFontId = 'space-grotesk'
): NotebookFontId {
  if (typeof value === 'string' && NOTEBOOK_FONTS.some((f) => f.id === value)) {
    return value as NotebookFontId;
  }
  // Compat: si guardaron el CSS family completo
  if (typeof value === 'string') {
    const byFamily = NOTEBOOK_FONTS.find((f) =>
      value.toLowerCase().includes(f.label.toLowerCase().replace(' ', ''))
    );
    if (byFamily) return byFamily.id;
  }
  return fallback;
}

/** Interlineado acorde al tamaño, útil en hojas con renglones. */
export function notebookLineHeightPx(fontSize: number): number {
  if (fontSize <= 10) return 18;
  if (fontSize <= 12) return 20;
  if (fontSize <= 14) return 24;
  return 26;
}
