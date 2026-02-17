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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
