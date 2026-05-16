import React from 'react';

export type DmrvBlockchainSymbolProps = {
  size?: number;
  className?: string;
  /** Accent for block highlights (category color). */
  accentColor?: string;
};

/**
 * Linked-blocks blockchain glyph — used on DMRV categories, rows, inputs, and footer.
 */
export function DmrvBlockchainSymbol({
  size = 40,
  className = '',
  accentColor = '#1e3a5f',
}: DmrvBlockchainSymbolProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      role="presentation"
    >
      <rect width="48" height="48" rx="10" fill="#0f172a" />
      <rect x="8" y="14" width="12" height="12" rx="2" fill={accentColor} opacity="0.95" />
      <rect x="28" y="14" width="12" height="12" rx="2" fill={accentColor} opacity="0.75" />
      <rect x="18" y="26" width="12" height="12" rx="2" fill={accentColor} opacity="0.85" />
      <path
        d="M20 20h8M32 20h-4v4M16 26h2v4"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="10" r="2" fill="#22d3ee" />
      <path d="M24 12v2" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export type DmrvBlockchainBadgeProps = {
  accentColor?: string;
  className?: string;
  label?: string;
};

/** Compact badge for category cards and infographic rows. */
export function DmrvBlockchainBadge({
  accentColor = '#1e3a5f',
  className = '',
  label = 'Blockchain',
}: DmrvBlockchainBadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 px-1.5 py-0.5 shadow-sm ${className}`}
      title="Blockchain evidence timestamp and audit trail"
    >
      <DmrvBlockchainSymbol size={16} accentColor={accentColor} className="rounded overflow-hidden" />
      <span className="text-[8px] font-black uppercase tracking-wide text-slate-700">{label}</span>
    </span>
  );
}
