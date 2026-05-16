import React from 'react';
import { Layout, Play, Sparkles } from '../../../../components/icons';

type Props = {
  onStartMission: () => void;
  onDrawArea: () => void;
  onLoadDemo: () => void;
  onExplainPage: () => void;
};

export function PlasticMissionHero({
  onStartMission,
  onDrawArea,
  onLoadDemo,
  onExplainPage,
}: Props): React.ReactElement {
  const primary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-900';
  const secondary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50';

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/40 to-white p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-800">DPAL Planetary Intelligence</p>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">DPAL Plastic Watch</h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-700">
        Satellite-backed plastic-risk intelligence for oceans, rivers, beaches, ports, and coastal cleanup evidence.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onStartMission} className={primary}>
          <Play className="h-3.5 w-3.5" />
          Start Plastic Mission
        </button>
        <button type="button" onClick={onDrawArea} className={secondary}>
          <Layout className="h-3.5 w-3.5" />
          Draw Scan Area
        </button>
        <button type="button" onClick={onLoadDemo} className={secondary}>
          Load Demo Mission
        </button>
        <button type="button" onClick={onExplainPage} className={secondary}>
          <Sparkles className="h-3.5 w-3.5" />
          Explain This Page
        </button>
      </div>

      <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-snug text-amber-950">
        Satellite scans identify <strong>candidate plastic-risk zones</strong>. Field validation is recommended before
        final claims.
      </p>
    </section>
  );
}
