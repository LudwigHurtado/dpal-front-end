import React from 'react';
import { Link } from 'react-router-dom';
import { PlatformTopCommandBar } from '../../components/platform/PlatformTopCommandBar';
import { DeepOwlServiceLinesList } from '../components/deepOwl/DeepOwlServiceLinesList';

export interface DeepOwlServiceLinesPageProps {
  onBack: () => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

/**
 * Full catalog of Deep Owl planetary intelligence service lines — linked from platform sidebar.
 */
export default function DeepOwlServiceLinesPage({
  onBack,
  onOpenMobileNav,
  useMobileLayout,
}: DeepOwlServiceLinesPageProps): React.ReactElement {
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

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-[#0b1224] to-emerald-950 px-6 py-8 sm:px-10 sm:py-10">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">Deep Owl ECO SYSTEM</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Service lines</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Thirty intelligence categories for monitor, verify, detect, and protect workflows. Each row opens the closest
                DPAL workspace today — sensor scope and partner datasets are defined in each module, not implied by this list.
              </p>
            </div>
          </div>

          <div className="px-5 py-8 sm:px-8">
            <DeepOwlServiceLinesList />
          </div>
        </section>
      </div>
    </div>
  );
}
