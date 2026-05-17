/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  /** When true, browser uses POST /api/ai/gemini with server GEMINI_API_KEY (no VITE_GEMINI_API_KEY needed). */
  readonly VITE_USE_SERVER_AI?: string;
  /** Optional Gemini text model for DMRV helpers (default gemini-2.5-flash). */
  readonly VITE_GEMINI_MODEL?: string;
  /** OpenAI — Politician Transparency Search refine + Evidence draft (optional). */
  readonly VITE_OPENAI_API_KEY?: string;
  /** Default: gpt-4o-mini */
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_API_BASE?: string;
  /** Integrations client (`dpalIntegrationsApi.ts`). Origin only or ending in `/api`; `/api/api` is deduped. Not the Verifier UI build (that lives in dpal-reviewer-node). */
  readonly VITE_API_BASE_URL?: string;
  /** Legacy alias for integrations API origin (same semantics as `VITE_API_BASE_URL`). */
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_DPAL_API_BASE_URL?: string;
  /** When `true`, logs integrations request URL / path / lifecycle (no secrets, no full provider bodies). */
  readonly VITE_DPAL_API_DEBUG?: string;
  readonly VITE_DPAL_AI_SERVER_URL?: string;
  readonly VITE_DPAL_MEDIA_BASE_URL?: string;
  readonly VITE_DPAL_PUBLIC_FRONTEND_URL?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_SUPPORT_NODE?: string;
  readonly VITE_ADSENSE_SLOT_HOME?: string;
  readonly VITE_BRAVE_SEARCH_API_KEY?: string;
  readonly VITE_LAYOUT_VERSION?: 'v1' | 'v2';
  readonly VITE_FEATURE_REPUTATION?: 'true' | 'false';
  readonly VITE_FEATURE_AUDIT_TRAIL?: 'true' | 'false';
  readonly VITE_FEATURE_BLOCKCHAIN_ANCHOR?: 'true' | 'false';
  readonly VITE_FEATURE_GOVERNANCE?: 'true' | 'false';
  /** When `true`, situation room can remove images from the live filing gallery (history stays). */
  readonly VITE_INCIDENT_IMAGE_ADMIN?: string;
  /** Optional external URLs for Society Game Hub minigames */
  readonly VITE_GAME_URL_INVESTIGATION_NETWORK?: string;
  readonly VITE_GAME_URL_INVESTIGATE_OBSERVE_INTELLIGENT?: string;
  readonly VITE_GAME_URL_BEACON_COMMUNITY?: string;
  readonly VITE_GAME_URL_CLEAN_ZONE_RESTORE_EARTH?: string;
  readonly VITE_GAME_URL_SAFE_REPORTING?: string;
  readonly VITE_GAME_URL_TAKE_THE_WALK_SHARE_MOMENT?: string;
  readonly VITE_GAME_URL_KITTY_COMFORT_VISITS?: string;
  readonly VITE_GAME_URL_SILENT_OBSERVER?: string;
  /** Reviewer Node API base for Field OS Super Agent (e.g. `https://…railway.app/api`). */
  readonly VITE_REVIEWER_NODE_API_BASE?: string;
  /** Validator / Verifier portal URL opened from the main menu (static app, often Vercel). */
  readonly VITE_VALIDATOR_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
