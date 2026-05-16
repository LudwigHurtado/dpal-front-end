import React, { useId } from 'react';
import { Link } from 'react-router-dom';

export interface PlatformTopCommandBarProps {
  onOpenMobileNav?: () => void;
  /** Optional trailing actions (e.g. compact status on narrow layouts). */
  extraTrailing?: React.ReactNode;
}

export function PlatformTopCommandBar({
  onOpenMobileNav,
  extraTrailing,
}: PlatformTopCommandBarProps): React.ReactElement {
  const hintId = useId();

  return (
    <div className="mb-8 border-b border-slate-200/80 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-center">
          {onOpenMobileNav ? (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              aria-label="Open navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <label className="relative mx-auto w-full max-w-xl min-w-0 flex-1">
            <span className="sr-only">Search locations, projects, facilities</span>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              readOnly
              placeholder="Search locations, projects, facilities…"
              className="w-full cursor-text rounded-2xl border border-slate-200/90 bg-white py-2.5 pl-11 pr-4 text-center text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/60 sm:text-left"
              tabIndex={0}
              aria-describedby={hintId}
            />
          </label>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:justify-end lg:gap-3">
          {extraTrailing}
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Node Status: Online
          </span>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" strokeLinecap="round" />
              <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
            </svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden />
          </button>
          <Link
            to="/account"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-900"
            title="Account"
          >
            <span aria-hidden>U</span>
            <span className="sr-only">Account</span>
          </Link>
        </div>
      </div>
      <p id={hintId} className="sr-only">
        Use sidebar workspaces to jump to satellite, water, emissions, or evidence tooling.
      </p>
    </div>
  );
}
