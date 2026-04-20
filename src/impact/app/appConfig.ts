export const IMPACT_APP_NAME = 'DPAL Impact Registry';
export const IMPACT_PRODUCT_NAME = 'Impact Registry';
export const IMPACT_TAGLINE = 'Track, verify, and prove environmental outcomes';
export const IMPACT_DEMO_MODE =
  (import.meta as any).env?.VITE_IMPACT_DEMO_MODE === 'true' ||
  (import.meta as any).env?.VITE_DEMO_MODE === 'true';
