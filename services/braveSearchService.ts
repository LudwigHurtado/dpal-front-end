import { Category, type IntelItem } from "../types";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

type BraveWebResult = {
  title?: string;
  description?: string;
  url?: string;
  age?: string;
  page_age?: string;
};

type BraveWebSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

const getBraveSearchApiKey = (): string | undefined => {
  const key = import.meta.env.VITE_BRAVE_SEARCH_API_KEY?.trim();
  return key || undefined;
};

export const isBraveSearchEnabled = (): boolean => Boolean(getBraveSearchApiKey());

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  [Category.GoodDeeds]: ["good deeds", "community volunteers", "mutual aid", "public service"],
  [Category.Travel]: ["travel", "transport disruption", "flight delays"],
  [Category.ElderlyCare]: ["elderly care", "senior care", "nursing home"],
  [Category.ProfessionalServices]: ["professional services", "consumer complaint", "service misconduct"],
  [Category.NonProfit]: ["nonprofit", "charity accountability", "charity fraud"],
  [Category.Events]: ["public event safety", "event transparency", "crowd safety"],
  [Category.PoliceMisconduct]: ["police misconduct", "civil rights", "use of force"],
  [Category.HousingIssues]: ["housing violations", "tenant rights", "unsafe living conditions"],
  [Category.MedicalNegligence]: ["medical negligence", "hospital safety", "care failures"],
  [Category.ConsumerScams]: ["consumer scam", "fraud alert", "deceptive practices"],
  [Category.Education]: ["school safety", "education policy", "campus misconduct"],
  [Category.Environment]: ["environmental hazard", "pollution", "cleanup", "contamination"],
  [Category.EcologicalConservation]: ["ecological conservation", "habitat restoration", "forest canopy", "foliage monitoring"],
  [Category.WorkplaceIssues]: ["workplace safety", "labor violations", "employee rights"],
  [Category.VeteransServices]: ["veterans services", "benefits delays", "veteran care"],
  [Category.PublicTransport]: ["public transit incident", "transport safety", "service outage"],
  [Category.Infrastructure]: ["infrastructure failure", "road hazard", "utility outage"],
  [Category.Allergies]: ["allergy alert", "food safety", "air quality alert"],
  [Category.InsuranceFraud]: ["insurance fraud", "claims scam", "policy abuse"],
  [Category.Clergy]: ["clergy abuse", "faith institution accountability", "religious misconduct"],
  [Category.WaterViolations]: ["water contamination", "water violations", "drinking water safety"],
  [Category.Other]: ["community safety", "local incident", "public accountability"],
  [Category.IndependentDiscoveries]: ["independent discovery", "research breakthrough", "data anomaly", "observation report"],
  [Category.CivicDuty]: ["civic duty", "community action", "public participation"],
  [Category.AccidentsRoadHazards]: ["traffic collision", "road hazard", "street safety"],
  [Category.FireEnvironmentalHazards]: ["fire hazard", "wildfire risk", "chemical spill"],
  [Category.PublicSafetyAlerts]: ["public safety alert", "active incident", "urgent warning"],
  [Category.StolenPropertyRegistry]: ["stolen property registry", "ownership verification", "theft report"],
  [Category.P2PEscrowVerification]: ["escrow dispute", "p2p fraud", "transaction verification"],
  [Category.ProofOfLifeBiometric]: ["biometric verification", "identity check", "proof of life"],
  [Category.DpalHelp]: ["public assistance", "community aid request", "help network"],
  [Category.DpalLifts]: ["mobility assistance", "transport access", "ride support"],
  [Category.DpalWorkNetwork]: ["community work network", "task marketplace", "local work opportunities"],
};

const buildSearchQuery = (categories: Category[], location: string): string => {
  const safeLocation = location?.trim() || "United States";
  const selected = categories.length > 0 ? categories : [Category.Other];
  const categoryTerms = selected
    .flatMap((c) => CATEGORY_KEYWORDS[c] ?? [c])
    .slice(0, 6)
    .join(" OR ");

  return `${categoryTerms} ${safeLocation} latest verified reports`;
};

const resolveCategoryForResult = (categories: Category[]): Category => {
  if (categories.length > 0) return categories[0];
  return Category.Other;
};

export async function searchLiveIntelWithBrave(categories: Category[], location: string): Promise<IntelItem[]> {
  const apiKey = getBraveSearchApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: buildSearchQuery(categories, location),
    country: "US",
    search_lang: "en",
    ui_lang: "en-US",
    count: "10",
    offset: "0",
    safesearch: "moderate",
    spellcheck: "true",
    result_filter: "web",
    text_decorations: "false",
  });

  const response = await fetch(`${BRAVE_WEB_SEARCH_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const payload = (await response.json()) as BraveWebSearchResponse;
  const webResults = payload.web?.results ?? [];
  const category = resolveCategoryForResult(categories);

  return webResults
    .filter((r) => r?.title && r?.url)
    .slice(0, 10)
    .map((r, idx) => ({
      id: `brv-${Date.now()}-${idx}`,
      category,
      title: r.title || "Untitled",
      location: location || "Global",
      time: r.age || r.page_age || "recent",
      summary: r.description || "Source discovered via Brave web search.",
      source: r.url || "",
      links: r.url ? [{ uri: r.url, title: r.title || "Source" }] : [],
    }));
}
