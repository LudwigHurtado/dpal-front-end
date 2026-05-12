import React from 'react';

type Tone = 'neutral' | 'amber' | 'slate' | 'deep';

const toneClass: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-800',
  amber: 'border-amber-200/80 bg-amber-50/90 text-amber-950/90',
  slate: 'border-slate-300 bg-slate-200/80 text-slate-900',
  deep: 'border-slate-800 bg-slate-900/95 text-slate-300',
};

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

const EnvironmentalDisclaimerBar: React.FC<Props> = ({ children, tone = 'amber', className }) => (
  <footer className={`mt-auto shrink-0 border-t px-4 py-2.5 ${toneClass[tone]} ${className ?? ''}`}>
    <p className="mx-auto max-w-[1920px] text-center text-[11px] leading-snug">{children}</p>
  </footer>
);

export default EnvironmentalDisclaimerBar;
