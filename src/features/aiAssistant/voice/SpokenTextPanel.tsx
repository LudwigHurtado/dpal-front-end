import React from 'react';

export type SpokenTextPanelProps = {
  spokenText: string;
  visible?: boolean;
  className?: string;
};

export function SpokenTextPanel({
  spokenText,
  visible = true,
  className = '',
}: SpokenTextPanelProps): React.ReactElement | null {
  if (!visible) return null;

  const trimmed = spokenText.trim();
  if (!trimmed) return null;

  return (
    <section
      className={`rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-3 ${className}`.trim()}
      aria-label="Speaking text"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900/80">Speaking text</p>
      <p className="mt-1.5 text-sm leading-relaxed text-indigo-950">{trimmed}</p>
    </section>
  );
}
