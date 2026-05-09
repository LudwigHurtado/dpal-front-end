/**
 * VisibleAutopilotCursor — virtual on-screen pointer.
 * --------------------------------------------------------------------------
 * A non-interactive overlay (`pointer-events: none`) that animates to the
 * autopilot's current target and shows a short bubble explaining what DPAL
 * is doing. This is *not* a real OS-level cursor — it cannot click, drag,
 * or move anywhere outside the React tree. Real desktop mouse control will
 * be handled later by an optional desktop operator (e.g. UI-TARS).
 *
 * Visual safety:
 *   - `aria-hidden` so screen readers do not double-narrate the bubble
 *     (the AutopilotControlBar carries the live region for AT users).
 *   - Respects `prefers-reduced-motion` via `reduceMotion` flag.
 */
import React from "react";

interface VisibleAutopilotCursorProps {
  /** Whether the cursor should be rendered at all. */
  visible: boolean;
  /** Where to point — the spotlighted element's bounding rect (viewport coords). */
  targetRect: DOMRect | null;
  /** Plain-language explanation shown above the cursor. */
  bubble: string;
  /** When true the cursor jumps without animating (a11y). */
  reduceMotion: boolean;
}

const CURSOR_SIZE = 28;

export default function VisibleAutopilotCursor({
  visible,
  targetRect,
  bubble,
  reduceMotion,
}: VisibleAutopilotCursorProps): React.ReactElement | null {
  if (!visible || !targetRect) return null;

  /**
   * Aim a few pixels inside the target's top-left so the cursor visually
   * "lands on" the element rather than centering inside it (which can hide
   * the pointer behind text inputs and buttons).
   */
  const x = targetRect.left + Math.min(24, targetRect.width / 2);
  const y = targetRect.top + Math.min(20, targetRect.height / 2);

  /** Clamp the bubble to keep it on-screen even when the target is at the edge. */
  const bubbleMaxWidth = 260;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const bubbleLeft = Math.max(8, Math.min(viewportW - bubbleMaxWidth - 8, x - 8));

  return (
    <div
      aria-hidden="true"
      data-dpal-autopilot-cursor
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1180,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bubbleLeft,
          top: Math.max(8, y - 64),
          maxWidth: bubbleMaxWidth,
          transition: reduceMotion ? "none" : "left 0.55s ease-out, top 0.55s ease-out",
        }}
        className="rounded-xl border border-cyan-400/60 bg-slate-950/95 px-3 py-2 text-[11px] leading-snug text-cyan-50 shadow-2xl shadow-cyan-900/40"
      >
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
          DPAL Autopilot
        </p>
        <p className="mt-1">{bubble}</p>
      </div>

      <div
        style={{
          position: "absolute",
          left: x - CURSOR_SIZE / 2,
          top: y - CURSOR_SIZE / 2,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          transition: reduceMotion ? "none" : "left 0.55s ease-out, top 0.55s ease-out",
        }}
        className="dpal-autopilot-cursor"
      >
        <div
          className="absolute inset-0 rounded-full border-2 border-cyan-300 bg-cyan-400/30 dpal-autopilot-cursor-ring"
          aria-hidden="true"
        />
        <div className="absolute inset-1 rounded-full bg-cyan-200" aria-hidden="true" />
        <span
          className="absolute left-full top-full -translate-x-1 translate-y-1 whitespace-nowrap rounded-md border border-cyan-400/60 bg-slate-950/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100 shadow"
        >
          DPAL
        </span>
      </div>
    </div>
  );
}
