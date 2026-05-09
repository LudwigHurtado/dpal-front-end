/**
 * DPAL Navigator — global store
 * ----------------------------------------------------------------------------
 * Lightweight Zustand store that owns:
 *   - panel open/closed state
 *   - the most recently planned flow (so a helper card can read it after
 *     navigation)
 *   - last raw input + interpretation (for transparency in the UI)
 *
 * The store is intentionally state-only — all logic lives in
 * `guidedFlowEngine.ts`. The store does not navigate by itself; it exposes
 * the data, and a React component performs the routing.
 */
import { create } from "zustand";
import type { GuidedFlow, NavigatorInterpretation } from "./types";
import { planFlow } from "./guidedFlowEngine";

interface NavigatorState {
  /** Whether the floating panel is currently visible. */
  isOpen: boolean;
  /** Last input the user submitted. */
  rawInput: string;
  /** Last parser/classifier result, or null. */
  interpretation: NavigatorInterpretation | null;
  /** Last planned guided flow, or null. */
  flow: GuidedFlow | null;
  /** Stable id for the active flow — used by helper cards. */
  flowId: string | null;
  /** ISO timestamp when the active flow was planned. */
  flowStartedAt: string | null;

  open(): void;
  close(): void;
  toggle(): void;
  /** Update the input without running the engine yet. */
  setRawInput(raw: string): void;
  /** Run the engine and persist the result. */
  submit(raw: string): { flow: GuidedFlow; interpretation: NavigatorInterpretation; flowId: string };
  /** Wipe the current flow but keep the panel open if the user wants. */
  reset(): void;
}

export const useDpalNavigatorStore = create<NavigatorState>((set, get) => ({
  isOpen: false,
  rawInput: "",
  interpretation: null,
  flow: null,
  flowId: null,
  flowStartedAt: null,

  open() {
    set({ isOpen: true });
  },
  close() {
    set({ isOpen: false });
  },
  toggle() {
    set({ isOpen: !get().isOpen });
  },
  setRawInput(raw) {
    set({ rawInput: raw });
  },
  submit(raw) {
    const planned = planFlow(raw);
    set({
      rawInput: raw,
      interpretation: planned.interpretation,
      flow: planned.flow,
      flowId: planned.flowId,
      flowStartedAt: new Date().toISOString(),
    });
    return planned;
  },
  reset() {
    set({
      rawInput: "",
      interpretation: null,
      flow: null,
      flowId: null,
      flowStartedAt: null,
    });
  },
}));
