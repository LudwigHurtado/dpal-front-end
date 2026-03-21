/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_SUPPORT_NODE?: string;
  readonly VITE_ADSENSE_SLOT_HOME?: string;
  readonly VITE_LAYOUT_VERSION?: 'v1' | 'v2';
  readonly VITE_FEATURE_REPUTATION?: 'true' | 'false';
  readonly VITE_FEATURE_AUDIT_TRAIL?: 'true' | 'false';
  readonly VITE_FEATURE_BLOCKCHAIN_ANCHOR?: 'true' | 'false';
  readonly VITE_FEATURE_GOVERNANCE?: 'true' | 'false';
  /** Optional external URLs for Society Game Hub minigames */
  readonly VITE_GAME_URL_INVESTIGATION_NETWORK?: string;
  readonly VITE_GAME_URL_BEACON_COMMUNITY?: string;
  readonly VITE_GAME_URL_SAFE_REPORTING?: string;
  readonly VITE_GAME_URL_SILENT_OBSERVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
