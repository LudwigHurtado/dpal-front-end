import React from 'react';

const STEPS = [
  {
    n: '1',
    title: 'Set AOI',
    body: 'Search, click the map, or enter coordinates. Circle radius defines the scan area (polygon draw coming soon).',
  },
  {
    n: '2',
    title: 'Satellite scan',
    body: 'PACE / EMIT / Landsat context from NASA catalogs — metadata and screening signals, not confirmed plastic on the water.',
  },
  {
    n: '3',
    title: 'AI explanation',
    body: 'Report assistant and Chat tab translate results in plain English with honest limits on what is not proven.',
  },
  {
    n: '4',
    title: 'Evidence packet',
    body: 'Exportable packet with claims language, provider status, and SHA-256 integrity hash for audit workflows.',
  },
  {
    n: '5',
    title: 'Validation & ledger',
    body: 'Field sampling and drone prep before any attribution claim. Hash-ready summary supports validator review and ledger anchoring when deployed.',
  },
] as const;

export function PlasticWatchValueStrip({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <section
      className={`rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/60 p-4 shadow-sm ${className}`}
      aria-label="How DPAL Plastic Watch works"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">How DPAL helps</p>
      <p className="mt-1 text-xs text-slate-700 leading-relaxed max-w-4xl">
        Screening and evidence support only — satellite hits are not proof of plastic pollution until field teams confirm.
      </p>
      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-sm"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-bold text-white">
              {step.n}
            </span>
            <p className="mt-1.5 text-xs font-semibold text-slate-900">{step.title}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
