/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_SUPPORT_NODE?: string;
  readonly VITE_ADSENSE_SLOT_HOME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
