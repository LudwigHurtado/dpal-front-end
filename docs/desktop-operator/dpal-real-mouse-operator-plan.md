# Plan — Real OS mouse for DPAL (local desktop operator)

## What the hosted web app cannot do

A normal browser tab on **Vercel** (or any remote HTTPS site) **cannot** move the user’s physical Windows, macOS, or Linux mouse pointer. Browser security sandboxes block programmatic control of the OS cursor except for locking/pointer capture inside the page for games — not for driving the whole desktop.

The **DPAL Visible Autopilot** in `dpal-front-end` therefore uses an **in-page virtual cursor** (`VisibleAutopilotCursor.tsx`: `pointer-events: none`, fixed overlay). It is honest automation: the user sees DPAL highlight real DOM nodes and trigger the same API calls as manual actions, without pretending to control the OS.

## Why a separate local operator is needed

To move the **real** mouse or send OS-level keyboard input (e.g. for screen recording demos, accessibility labs, or legacy desktop apps), you need a **local agent** that runs outside the browser sandbox:

- **UI-TARS Desktop** (or similar vision-language desktop agents)
- **Electron** shell with `desktopCapturer` + privileged input APIs (with explicit user consent)
- **Playwright**-driven local Chromium (already in this repo as a devDependency) for scripted pointer paths
- **Node** desktop automation (`nut.js`, `robotjs`, etc.) on the user machine only

## Recommended architecture

```text
┌─────────────────────────┐     WSS / localhost      ┌──────────────────────────────┐
│  DPAL Web App (Vite)    │ ◄──────────────────────► │  DPAL Desktop Operator       │
│  Command + timeline UI   │   JSON command envelope  │  Real mouse / keyboard       │
│  (no OS mouse control)   │   TLS optional; loopback │  OS-level automation         │
└─────────────────────────┘                          └──────────────────────────────┘
```

- **Web app**: shows status, diagnostics timeline, **human approval gates**, and sends **allowlisted** commands only when the user opts in.
- **Desktop operator**: executes **MOVE_AND_CLICK**, **TYPE_TEXT**, etc., on the local machine.
- **Bridge**: **localhost-only** WebSocket (or native messaging) so remote sites cannot silently connect.

## Safety controls (non-negotiable)

1. **Explicit user consent** before the operator attaches (one-time + per session).
2. **Local-only** bind address (`127.0.0.1`) and optional mutual auth for the bridge.
3. **Allowlist** of command types (`MOVE_AND_CLICK`, `SCROLL_INTO_VIEW`, `READ_SCREEN_REGION`); reject unknown `type` values.
4. **Emergency stop** hotkey and UI button that immediately disconnects the operator and clears pending commands.
5. **No** autonomous: payments, blockchain anchoring, public publishing, legal escalation, or bypassing **human approval gates** defined in product flows.

## First local operator protocol (example envelope)

```json
{
  "type": "DPAL_OPERATOR_COMMAND",
  "command": "MOVE_AND_CLICK",
  "targetLabel": "Run Water Evidence Scan",
  "route": "/water-intelligence/water-alert-evidence",
  "safetyLevel": "read_only",
  "requiresHumanApproval": false
}
```

- `safetyLevel: "read_only"` means the operator must not execute destructive or committing actions even if the web UI suggests them.
- `requiresHumanApproval: true` should wrap any command that could change external state beyond the user’s own machine.

## Implementation phases (suggested)

1. **Proof**: Playwright E2E against local Vite (already added under `tests/e2e/`) — proves DOM + API wiring without OS mouse.
2. **Operator MVP**: local Node service + WebSocket that accepts the envelope above and calls Playwright to perform the click inside a dedicated browser window.
3. **Hardening**: rate limits, signed intents, audit log, and UX that mirrors autopilot timeline events on the web side.

This document is planning-only; no production feature in this repo should claim real OS mouse control until an operator like the above exists and passes security review.
