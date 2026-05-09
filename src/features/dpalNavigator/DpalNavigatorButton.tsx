/**
 * DpalNavigatorButton — floating launcher.
 * Stays on top of all DPAL views (z-index high). Clicking it toggles the
 * Navigator panel via the Zustand store. Keyboard accessible.
 */
import React from "react";
import { useDpalNavigatorStore } from "./useDpalNavigatorStore";

interface DpalNavigatorButtonProps {
  /** Lower-right by default; pass `"left"` to dock on the bottom-left. */
  position?: "right" | "left";
}

export default function DpalNavigatorButton({
  position = "right",
}: DpalNavigatorButtonProps): React.ReactElement {
  const isOpen = useDpalNavigatorStore((s) => s.isOpen);
  const toggle = useDpalNavigatorStore((s) => s.toggle);

  const dockClass = position === "left" ? "left-4 sm:left-6" : "right-4 sm:right-6";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls="dpal-navigator-panel"
      aria-label={isOpen ? "Close DPAL Navigator" : "Open DPAL Navigator"}
      className={`fixed bottom-4 sm:bottom-6 ${dockClass} z-[1100] flex items-center gap-2 rounded-full border border-cyan-400/50 bg-slate-950/85 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-cyan-100 shadow-lg shadow-cyan-900/30 backdrop-blur transition hover:border-cyan-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70`}
      data-dpal-navigator-button
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full bg-cyan-300 dpal-nav-dot"
      />
      <span>DPAL Navigator</span>
    </button>
  );
}
