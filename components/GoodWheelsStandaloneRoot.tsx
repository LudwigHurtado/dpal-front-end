import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import GoodWheelsApp from '../src/good-wheels/app/GoodWheelsApp';
import {
  NavigatorHelperCard,
  useNavigatorOutcomeTracking,
} from '../src/features/dpalNavigator';

/**
 * Good Wheels uses react-router's RouterProvider (a Router), which cannot nest inside the
 * app's BrowserRouter. Mounting via a separate React root breaks that nesting and fixes
 * runtime crashes when opening DPAL Good Wheels from DPAL Lifts or elsewhere.
 *
 * The DPAL "Return to DPAL" header was removed by user request — the Good Wheels app
 * provides its own three-line menu and sign-out chrome and acts as the full screen.
 *
 * The DPAL Navigator helper card is rendered *outside* the Good Wheels root so it can read
 * sessionStorage from the parent app context. Good Wheels owns its own router and chrome.
 */
const GoodWheelsStandaloneRoot: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);
  const navOutcome = useNavigatorOutcomeTracking('transport_help');

  /**
   * Module-opened milestone. We intentionally do not track the inner ride
   * request draft from here because Good Wheels runs in a separate React
   * root — deeper instrumentation would require coupling we want to avoid.
   * The standalone-root level only records that the user opened the module.
   */
  useEffect(() => {
    if (!navOutcome.hasActiveNavigatorSession) return;
    navOutcome.trackOutcomeOnce({
      moduleId: 'good_wheels',
      eventType: 'module_opened',
      label: 'Opened DPAL Good Wheels',
      status: 'observed',
      metadata: {
        rideConfirmedAutomatic: false,
        paymentProcessedAutomatic: false,
      },
    });
  }, [navOutcome]);

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
    <>
      <div className="px-4 pt-3">
        <NavigatorHelperCard expectedScenario="transport_help" />
      </div>
      <div ref={hostRef} className="min-h-[100dvh]" />
    </>
  );
};

export default GoodWheelsStandaloneRoot;
