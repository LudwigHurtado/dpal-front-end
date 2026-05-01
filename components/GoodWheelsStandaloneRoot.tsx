import React, { useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import GoodWheelsApp from '../src/good-wheels/app/GoodWheelsApp';

/**
 * Good Wheels uses react-router's RouterProvider (a Router), which cannot nest inside the
 * app's BrowserRouter. Mounting via a separate React root breaks that nesting and fixes
 * runtime crashes when opening DPAL Good Wheels from DPAL Lifts or elsewhere.
 *
 * The DPAL "Return to DPAL" header was removed by user request — the Good Wheels app
 * provides its own three-line menu and sign-out chrome and acts as the full screen.
 */
const GoodWheelsStandaloneRoot: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

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

  return <div ref={hostRef} className="min-h-[100dvh]" />;
};

export default GoodWheelsStandaloneRoot;
