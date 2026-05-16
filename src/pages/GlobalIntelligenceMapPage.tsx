import React from 'react';
import { Link } from 'react-router-dom';
import { PlatformTopCommandBar } from '../../components/platform/PlatformTopCommandBar';
import { GlobalIntelligenceMapPreview } from '../../components/platform/GlobalIntelligenceMapPreview';

export interface GlobalIntelligenceMapPageProps {
  onBack: () => void;
  onOpenGlobalSignals: () => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

/** Full-screen Global Intelligence Map workspace — linked from platform sidebar. */
export default function GlobalIntelligenceMapPage({
  onBack,
  onOpenGlobalSignals,
  onOpenMobileNav,
  useMobileLayout,
}: GlobalIntelligenceMapPageProps): React.ReactElement {
  return (
    <div className="w-full pb-24">
      <div className="mx-auto w-full max-w-[min(100%,1280px)] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <PlatformTopCommandBar onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined} />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-emerald-800 hover:underline"
          >
            Planetary home
          </Link>
        </div>

        <div className="mb-4 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">Deep Owl Intelligence</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Global Intelligence Map</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Operational preview of world-scale layers and live signal routing. Layers connect through existing DPAL engines when
            operators enable them — this panel does not assert verified detections on its own.
          </p>
        </div>

        <GlobalIntelligenceMapPreview onOpenGlobalSignals={onOpenGlobalSignals} />
      </div>
    </div>
  );
}
