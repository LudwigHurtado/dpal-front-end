/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  // add more VITE_* vars here if you use them
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


