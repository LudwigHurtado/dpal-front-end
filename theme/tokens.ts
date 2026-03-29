/**
 * DPAL theme — TypeScript mirror of `styles/dpal-theme.css`
 *
 * Use for:
 * - Inline styles when a component must reference a token: `style={{ color: dpalVar.textPrimary }}`
 * - Documentation / autocomplete
 *
 * Do NOT duplicate business logic here. Colors live in CSS :root — edit `styles/dpal-theme.css` first.
 * Default look: slate paper + indigo primary (high-contrast; avoid mint/teal body text).
 */

/** Maps to `var(--dpal-*)` for use in React inline styles */
export const dpalVar = {
  background: 'var(--dpal-background)',
  backgroundSecondary: 'var(--dpal-background-secondary)',
  surface: 'var(--dpal-surface)',
  surfaceAlt: 'var(--dpal-surface-alt)',
  panel: 'var(--dpal-panel)',
  card: 'var(--dpal-card)',
  cardHover: 'var(--dpal-card-hover)',
  border: 'var(--dpal-border)',
  borderStrong: 'var(--dpal-border-strong)',
  textPrimary: 'var(--dpal-text-primary)',
  textSecondary: 'var(--dpal-text-secondary)',
  textMuted: 'var(--dpal-text-muted)',
  primary: 'var(--dpal-primary)',
  primaryHover: 'var(--dpal-primary-hover)',
  accent: 'var(--dpal-accent)',
  accentHover: 'var(--dpal-accent-hover)',
  /** Secondary civic accent — violet rails, borders, highlights */
  purple: 'var(--dpal-purple)',
  purpleSoft: 'var(--dpal-purple-soft)',
  purpleMuted: 'var(--dpal-purple-muted)',
  /** Cyan support accent — chips, secondary CTAs, nav chrome */
  supportCyan: 'var(--dpal-support-cyan)',
  supportCyanBright: 'var(--dpal-support-cyan-bright)',
  supportCyanHover: 'var(--dpal-support-cyan-hover)',
  supportCyanGlow: 'var(--dpal-support-cyan-glow)',
  success: 'var(--dpal-success)',
  warning: 'var(--dpal-warning)',
  danger: 'var(--dpal-danger)',
  info: 'var(--dpal-info)',
  verified: 'var(--dpal-verified)',
  reward: 'var(--dpal-reward)',
  focusRing: 'var(--dpal-focus-ring)',
  overlay: 'var(--dpal-overlay)',
  sidebar: 'var(--dpal-sidebar)',
  topbar: 'var(--dpal-topbar)',
  inputBg: 'var(--dpal-input-bg)',
  inputBorder: 'var(--dpal-input-border)',
  inputText: 'var(--dpal-input-text)',
  placeholder: 'var(--dpal-placeholder)',
  mapPanel: 'var(--dpal-map-panel)',
  feedCard: 'var(--dpal-feed-card)',
  missionCard: 'var(--dpal-mission-card)',
  reportCard: 'var(--dpal-report-card)',
  ledgerCard: 'var(--dpal-ledger-card)',
  aiPanel: 'var(--dpal-ai-panel)',
  badgeBg: 'var(--dpal-badge-bg)',
  badgeText: 'var(--dpal-badge-text)',
  /** Modal / table shells — prefer CSS classes `.dpal-modal-backdrop`, `.dpal-table` from `dpal-theme.css` */
  zModal: 'var(--dpal-z-modal)',
  zOverlay: 'var(--dpal-z-overlay)',
} as const;

export type DpalCssVarKey = keyof typeof dpalVar;
