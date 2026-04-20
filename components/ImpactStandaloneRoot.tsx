import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ArrowLeft } from './icons';
import ImpactApp from '../src/impact/app/ImpactApp';

/**
 * Impact Registry uses react-router's RouterProvider (a MemoryRouter), which cannot nest
 * inside the app's BrowserRouter. Mounting via a separate React root avoids that conflict.
 */
const ImpactStandaloneRoot: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  const returnToDpal = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('dpal-navigate', {
        detail: { view: 'mainMenu', replaceHome: true },
      })
    );
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = createRoot(host);
    rootRef.current = root;
    root.render(
      <React.StrictMode>
        <ImpactApp />
      </React.StrictMode>
    );
    return () => {
      root.unmount();
      rootRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col">
      <header
        className="sticky top-0 z-[500] flex shrink-0 items-center justify-between gap-3 border-b border-emerald-500/35 bg-zinc-950/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-6"
        role="banner"
      >
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/90">DPAL Impact Registry</p>
          <p className="truncate text-xs font-semibold text-zinc-200">Track, verify, and prove environmental outcomes</p>
        </div>
        <button
          type="button"
          onClick={returnToDpal}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-emerald-500/60 bg-emerald-950/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-100 shadow-lg transition hover:border-emerald-400 hover:bg-emerald-900/90 active:scale-[0.98]"
          aria-label="Return to DPAL main app"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Return to DPAL
        </button>
      </header>
      <div ref={hostRef} className="min-h-0 flex-1" />
    </div>
  );
};

export default ImpactStandaloneRoot;
