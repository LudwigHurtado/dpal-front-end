/**
 * AutopilotSpotlight — soft glowing ring around the active target.
 * --------------------------------------------------------------------------
 * A pointer-events: none overlay that traces the bounding rect of the
 * autopilot's current target. The ring uses the same cyan-amber palette as
 * the rest of the Navigator so users can map the spotlight to "DPAL is
 * looking at this".
 *
 * The spotlight does *not* darken the background (no full-screen scrim)
 * because the user must still be able to read the surrounding context as
 * DPAL works. A subtle outer ring is enough.
 */
import React from "react";

interface AutopilotSpotlightProps {
  visible: boolean;
  targetRect: DOMRect | null;
  reduceMotion: boolean;
}

const PADDING = 8;

export default function AutopilotSpotlight({
  visible,
  targetRect,
  reduceMotion,
}: AutopilotSpotlightProps): React.ReactElement | null {
  if (!visible || !targetRect) return null;

  const left = targetRect.left - PADDING;
  const top = targetRect.top - PADDING;
  const width = targetRect.width + PADDING * 2;
  const height = targetRect.height + PADDING * 2;

  return (
    <div
      aria-hidden="true"
      data-dpal-autopilot-spotlight
      style={{
        position: "fixed",
        left,
        top,
        width,
        height,
        zIndex: 1170,
        pointerEvents: "none",
        borderRadius: 14,
        transition: reduceMotion ? "none" : "left 0.55s ease-out, top 0.55s ease-out, width 0.4s ease-out, height 0.4s ease-out",
      }}
      className="dpal-autopilot-spotlight"
    />
  );
}
