import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ArrowLeft } from './icons';
import GoodWheelsApp from '../src/good-wheels/app/GoodWheelsApp';

/**
 * Good Wheels uses react-router's RouterProvider (a Router), which cannot nest inside the
 * app's BrowserRouter. Mounting via a separate React root breaks that nesting and fixes
 * runtime crashes when opening DPAL Good Wheels from DPAL Lifts or elsewhere.
 */
const GoodWheelsStandaloneRoot: React.FC = () => {
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
        <GoodWheelsApp />
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
        className="sticky top-0 z-[500] flex shrink-0 items-center justify-between gap-3 border-b border-cyan-500/35 bg-zinc-950/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-6"
        role="banner"
      >
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500/90">DPAL Good Wheels</p>
          <p className="truncate text-xs font-semibold text-zinc-200">You are in the ride module — return anytime.</p>
        </div>
        <button
          type="button"
          onClick={returnToDpal}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-cyan-500/60 bg-cyan-950/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-100 shadow-lg transition hover:border-cyan-400 hover:bg-cyan-900/90 active:scale-[0.98]"
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

export default GoodWheelsStandaloneRoot;
