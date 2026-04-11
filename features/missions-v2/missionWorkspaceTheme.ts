/**
 * Dark teal mission workspace — aligned with `/missions/create` (mission-control, not bright blue).
 * Import fragments in sector components for consistent surfaces and borders.
 */
export const mw = {
  shell: 'min-h-full bg-teal-950 text-slate-100',
  page: 'mx-auto max-w-[1220px] space-y-3 pb-24 text-slate-100',
  /** Main panel under the mission header */
  panel:
    'rounded-b-xl border border-t-0 border-teal-800/45 bg-teal-950/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
  statusLine:
    'rounded-lg border border-teal-900/50 bg-teal-950/70 p-2 text-center text-xs text-teal-200/90',
  btnGhost:
    'rounded-xl border border-teal-900/65 bg-teal-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-teal-700/60 hover:bg-teal-950/90',
  btnPrimary:
    'rounded-xl bg-gradient-to-r from-teal-800 to-teal-600 px-3 py-2 text-xs font-semibold text-teal-50 shadow-[0_0_20px_rgba(13,148,136,0.35)] transition hover:from-teal-700 hover:to-teal-500',
  sectorCard:
    'rounded-xl border border-teal-800/40 bg-teal-950/70 p-3 md:p-4 shadow-[0_0_24px_rgba(13,148,136,0.07)]',
  sectorTitle: 'text-xl font-bold tracking-tight text-teal-100',
  sectorDivider: 'h-px flex-1 bg-teal-800/45',
  sectorSubtitle: 'mb-3 text-[11px] text-teal-600/85',
  innerWell: 'rounded-lg border border-teal-900/50 bg-slate-950/55',
  innerWellTight: 'rounded-md border border-teal-900/55 bg-slate-950/60',
  field:
    'rounded-lg border border-teal-900/55 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-600/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
  textBody: 'text-sm text-slate-300',
  textLabel: 'font-semibold text-teal-200/90',
  textMuted: 'text-xs text-teal-700/90',
} as const;
