import React, { useEffect } from 'react';
import { PlatformSidebar } from '../components/platform/PlatformSidebar';

export interface DPALPlatformShellProps {
  currentPathname: string;
  onSelectView: (view: string) => void;
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
 * Desktop: persistent left rail for carbon/environment IA.
 * Mobile: sidebar renders in an overlay drawer toggled from the command bar.
 */
export default function DPALPlatformShell({
  currentPathname,
  onSelectView,
  useMobileLayout,
  hideSidebar,
  mobileNavOpen,
  onMobileNavOpenChange,
  sidebarStickyTop = 'top-[4.5rem]',
  mainColumnClassName = '',
  children,
}: DPALPlatformShellProps): React.ReactElement {
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

  const sidebar = (
    <PlatformSidebar
      stickyTop={useMobileLayout ? '' : sidebarStickyTop}
      currentPath={currentPathname}
      onSelectView={(v) => {
        onSelectView(v);
        if (useMobileLayout) onMobileNavOpenChange(false);
      }}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 bg-slate-100/90">
      {!useMobileLayout ? sidebar : null}

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

      <div className={`min-w-0 flex-1 bg-slate-100/90 ${mainColumnClassName}`.trim()}>{children}</div>

      {useMobileLayout && !hideSidebar ? (
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
