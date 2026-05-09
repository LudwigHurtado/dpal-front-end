/**
 * DPAL Navigator — scenario interpreter
 * ----------------------------------------------------------------------------
 * Phase 1 is rule-based on purpose:
 *   - works offline / during AI provider outages
 *   - is auditable (we can show the user *which* keywords matched)
 *   - never invents a category — falls back to `unknown` when uncertain
 *
 * If two categories tie, we pick the first one in declaration order, which is
 * deliberately ordered by public-safety priority (water/flood first).
 */
import type { ScenarioDetection, ScenarioType } from "./types";

interface CategoryRule {
  scenarioType: ScenarioType;
  /**
   * Lowercase, word-bounded keywords. A keyword can be a single word or a
   * short phrase. Matching is whole-word for single tokens and substring for
   * phrases (we still escape regex metacharacters).
   */
  keywords: string[];
}

const RULES: CategoryRule[] = [
  {
    scenarioType: "water_flood",
    keywords: [
      "water",
      "flood",
      "flooded",
      "flooding",
      "river",
      "creek",
      "canal",
      "rain",
      "rainfall",
      "storm",
      "drainage",
      "wet",
      "inundation",
      "runoff",
      "watershed",
      "levee",
      "dike",
      "overflow",
      "stormwater",
      "spillway",
    ],
  },
  {
    scenarioType: "pollution_waste",
    keywords: [
      "pollution",
      "polluted",
      "toxic",
      "chemical",
      "dumping",
      "dump site",
      "hazardous",
      "waste",
      "spill",
      "spilled",
      "contamination",
      "contaminated",
      "fumes",
      "odor",
      "smell",
      "smoke",
      "smog",
      "emission",
      "emissions",
      "leak",
      "leakage",
      "asbestos",
      "tailings",
    ],
  },
  {
    scenarioType: "carbon_land",
    keywords: [
      "carbon",
      "co2",
      "co₂",
      "forest",
      "tree",
      "trees",
      "land",
      "restoration",
      "biomass",
      "offset",
      "viu",
      "conservation",
      "reforestation",
      "deforestation",
      "afforestation",
      "ndvi",
      "canopy",
      "wildfire",
      "burn scar",
      "afolu",
    ],
  },
  {
    scenarioType: "public_report",
    keywords: [
      "report",
      "complaint",
      "evidence",
      "misconduct",
      "issue",
      "violation",
      "accountability",
      "claim",
      "proof",
      "incident",
      "fraud",
      "abuse",
      "corruption",
      "audit",
    ],
  },
  {
    scenarioType: "locator",
    keywords: [
      "missing",
      "lost",
      "found",
      "pet",
      "dog",
      "cat",
      "person",
      "child",
      "item",
      "wallet",
      "phone",
      "last seen",
      "kidnap",
      "kidnapped",
      "abducted",
    ],
  },
  {
    scenarioType: "transport_help",
    keywords: [
      "ride",
      "rideshare",
      "transport",
      "transportation",
      "pickup",
      "pick-up",
      "passenger",
      "driver",
      "lift",
      "shuttle",
      "carpool",
      "good wheels",
    ],
  },
];

function escapeRegex(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word match for single tokens, substring (boundary-aware) for phrases.
 * We use `\b` only when the keyword starts/ends with a word character so we
 * don't accidentally fail on tokens like "co₂" or "co2".
 */
function makeKeywordRegex(keyword: string): RegExp {
  const escaped = escapeRegex(keyword);
  const startBoundary = /^\w/.test(keyword) ? "\\b" : "";
  const endBoundary = /\w$/.test(keyword) ? "\\b" : "";
  return new RegExp(`${startBoundary}${escaped}${endBoundary}`, "i");
}

/**
 * Detect the most likely scenario for a free-form input.
 *
 * Confidence is intentionally simple:
 *   - 0 when no keywords matched
 *   - 0.4 with one keyword
 *   - +0.15 per additional unique keyword in the same category, capped at 0.95
 *
 * Coordinate presence does *not* boost confidence because coordinates can
 * accompany any category — that boost happens in the guided flow engine.
 */
export function detectScenario(rawInput: string): ScenarioDetection {
  const text = (rawInput || "").toLowerCase();
  if (!text.trim()) {
    return { scenarioType: "unknown", confidence: 0, matchedKeywords: [] };
  }

  let best: ScenarioDetection = {
    scenarioType: "unknown",
    confidence: 0,
    matchedKeywords: [],
  };

  for (const rule of RULES) {
    const matched: string[] = [];
    for (const kw of rule.keywords) {
      if (makeKeywordRegex(kw).test(text)) matched.push(kw);
    }
    if (matched.length === 0) continue;

    const confidence = Math.min(0.95, 0.4 + (matched.length - 1) * 0.15);
    if (confidence > best.confidence) {
      best = {
        scenarioType: rule.scenarioType,
        confidence,
        matchedKeywords: matched,
      };
    }
  }

  return best;
}

/** Human-readable label used in panel UI / helper cards. */
export function scenarioLabel(type: ScenarioType): string {
  switch (type) {
    case "water_flood":
      return "Water / Flood";
    case "pollution_waste":
      return "Pollution / Waste";
    case "carbon_land":
      return "Carbon / Land";
    case "public_report":
      return "Public Report";
    case "locator":
      return "DPAL Locator";
    case "transport_help":
      return "Transport / Help";
    default:
      return "Not yet classified";
  }
}
