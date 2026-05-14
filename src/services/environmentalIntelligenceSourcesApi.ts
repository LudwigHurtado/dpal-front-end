import { apiUrl, API_ROUTES } from '../../constants';

export type EnvironmentalSourceStatusPayload = {
  ok: true;
  allSources: number;
  runnable: number;
  publicRecords: number;
  commercial: number;
  future: number;
  sourcesByCategory: Record<string, unknown[]>;
  useCasesCount: number;
  safetyRules: { rules: string[]; blocksAutomaticClaims: string[] };
};

export type EnvironmentalUseCasesPayload = {
  ok: true;
  useCases: Array<{
    id: string;
    name: string;
    description: string;
    requiredSources: string[];
    optionalSources: string[];
    validationRequired: boolean;
    safetyLanguage: string;
  }>;
};

export async function fetchEnvironmentalSourceStatus(): Promise<EnvironmentalSourceStatusPayload | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_SOURCES_STATUS));
    if (!res.ok) return null;
    const j = (await res.json()) as EnvironmentalSourceStatusPayload;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function fetchEnvironmentalUseCases(): Promise<EnvironmentalUseCasesPayload | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_SOURCES_USE_CASES));
    if (!res.ok) return null;
    const j = (await res.json()) as EnvironmentalUseCasesPayload;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}
