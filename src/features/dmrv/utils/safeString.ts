/** Coerce unknown values to a trimmed string (avoids `.trim()` on undefined). */
export function safeTrim(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}
