import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../components/icons';
import { PlatformSidebar } from '../components/platform/PlatformSidebar';

const SIDEBAR_COLLAPSED_KEY = 'dpal-platform-sidebar-collapsed';

function readSidebarCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface DPALPlatformShellProps {
  currentPathname: string;
  onSelectView: (view: string) => void;
  onSelectPath: (path: string) => void;
  useMobileLayout: boolean;
  /** Full-width modes (no sidebar column). */
  hideSidebar?: boolean;
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
  /** Tailwind sticky offset for sidebar (clears sticky app header when present). */
  sidebarStickyTop?: string;
  /** Optional canvas treatment for the main column (e.g. rounded top-left). */
  mainColumnClassName?: string;
  children: React.ReactNode;
}

/**
 * Desktop: persistent left rail for carbon/environment IA (collapsible; open by default).
 * Mobile: sidebar renders in an overlay drawer toggled from the command bar.
 */
export default function DPALPlatformShell({
  currentPathname,
  onSelectView,
  onSelectPath,
  useMobileLayout,
  hideSidebar,
  mobileNavOpen,
  onMobileNavOpenChange,
  sidebarStickyTop = 'top-[4.5rem]',
  mainColumnClassName = '',
  children,
}: DPALPlatformShellProps): React.ReactElement {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsedPreference);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!useMobileLayout) onMobileNavOpenChange(false);
  }, [useMobileLayout, onMobileNavOpenChange]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileNavOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, onMobileNavOpenChange]);

  if (hideSidebar) {
    return <>{children}</>;
  }

  const stickyCls = sidebarStickyTop.trim() ? sidebarStickyTop.trim() : 'top-4';
  const showDesktopSidebar = !useMobileLayout && !sidebarCollapsed;

  const sidebar = (
    <PlatformSidebar
      stickyTop={useMobileLayout ? '' : sidebarStickyTop}
      currentPath={currentPathname}
      onSelectView={(v) => {
        onSelectView(v);
        if (useMobileLayout) onMobileNavOpenChange(false);
      }}
      onSelectPath={(path) => {
        onSelectPath(path);
        if (useMobileLayout) onMobileNavOpenChange(false);
      }}
      onCollapse={!useMobileLayout ? toggleSidebarCollapsed : undefined}
    />
  );

  return (
    <div className="relative flex min-h-0 flex-1 bg-slate-100/90">
      {showDesktopSidebar ? (
        <div className="relative shrink-0 transition-[width,margin] duration-300 ease-out">
          {sidebar}
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={`absolute -right-3 z-[96] flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-slate-900 ${stickyCls}`}
            aria-label="Collapse navigation sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {!useMobileLayout && sidebarCollapsed ? (
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className={`sticky ${stickyCls} z-[96] ml-1 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-slate-900`}
          aria-label="Open navigation sidebar"
          title="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {useMobileLayout && mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[140] bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => onMobileNavOpenChange(false)}
        />
      ) : null}

      {useMobileLayout && mobileNavOpen ? (
        <div className="fixed inset-y-0 left-0 z-[150] w-[min(88vw,280px)] shadow-xl lg:hidden">{sidebar}</div>
      ) : null}

      <div className={`min-w-0 flex-1 bg-slate-100/90 transition-[padding] duration-300 ease-out ${mainColumnClassName}`.trim()}>
        {children}
      </div>

      {useMobileLayout ? (
        <button
          type="button"
          className="fixed bottom-20 left-4 z-[95] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg shadow-slate-900/15 md:hidden"
          onClick={() => onMobileNavOpenChange(true)}
          aria-label="Open DPAL platform menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
