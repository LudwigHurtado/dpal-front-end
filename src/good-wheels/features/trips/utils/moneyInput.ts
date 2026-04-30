/**
 * Parse a passenger-entered currency string (e.g. "192.4", "16.59") into whole cents
 * without floating-point drift (e.g. 16.59 → 1659, not 1658.999…).
 */
export function parseUsdInputToCents(raw: string): number | undefined {
  const s = raw.trim().replace(/,/g, '');
  if (!s) return undefined;
  if (s.startsWith('-')) return undefined;
  const t = s;
  const m = /^(\d*)(?:\.(\d{0,2}))?$/.exec(t);
  if (!m) return undefined;
  const fracRaw = m[2];
  const hasFrac = fracRaw !== undefined && fracRaw !== '';
  if ((m[1] === '' || m[1] === undefined) && !hasFrac) return undefined;
  const whole = m[1] !== '' && m[1] != null ? parseInt(m[1], 10) : 0;
  if (!Number.isFinite(whole) || whole < 0) return undefined;
  const fracPadded = (fracRaw ?? '').padEnd(2, '0').slice(0, 2);
  const centsPart = fracPadded === '' ? 0 : parseInt(fracPadded, 10);
  if (!Number.isFinite(centsPart) || centsPart < 0 || centsPart > 99) return undefined;
  const total = whole * 100 + centsPart;
  if (total <= 0) return undefined;
  return total;
}
