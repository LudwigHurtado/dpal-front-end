
/**
 * @file This service handles all interactions with the Google Gemini API.
 */
import { GoogleGenAI, Type } from "@google/genai";
import {
  Category,
  NftTheme,
  type Report,
  IntelItem,
  type Hero,
  type TrainingScenario,
  SimulationMode,
  SimulationDifficulty,
  type IntelAnalysis,
  type AiDirective,
  Archetype,
  TacticalIntel,
  MissionApproach,
  MissionGoal,
  type FieldPrompt,
} from "../types";
import { CATEGORIES } from "../constants";
import {
  OFFLINE_DIRECTIVES,
  OFFLINE_INTEL,
  OFFLINE_TRAINING,
  OFFLINE_MISSION_TEMPLATES,
} from "./offlineAiData";
import { searchLiveIntelWithBrave, isBraveSearchEnabled } from "./braveSearchService";

const FLASH_TEXT_MODEL = "gemini-3-flash-preview";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

/** When true, Gemini runs on your API (GEMINI_API_KEY) via POST /api/ai/gemini — no browser key. */
const useServerGemini = () => import.meta.env.VITE_USE_SERVER_AI === "true";

/** Client key in bundle OR explicit server-AI mode (see VITE_USE_SERVER_AI). */
export const isAiEnabled = () => Boolean(getApiKey()) || useServerGemini();

import { getApiBase, apiUrl as buildApiUrl, API_ROUTES } from "../constants";

const getApiBaseLocal = () => getApiBase();

const DEBUG_AI = false;
const debugLog = (...args: any[]) => {
  if (DEBUG_AI) console.log("[AI DEBUG]", ...args);
};

export type AiErrorType = "NOT_CONFIGURED" | "TEMPORARY_FAILURE" | "RATE_LIMITED" | "NETWORK_ERROR" | "FORBIDDEN";

export class AiError extends Error {
  constructor(public type: AiErrorType, message: string) {
    super(message);
    this.name = "AiError";
  }
}

const getAiClient = () => {
  const key = getApiKey();
  if (!key) throw new AiError("NOT_CONFIGURED", "Neural link unconfigured. Device has no AI key.");
  return new GoogleGenAI({ apiKey: key });
};

type GeminiGenerateParams = {
  model: string;
  contents: unknown;
  config?: unknown;
};

/**
 * Prefer in-browser key when set (existing behavior). Otherwise POST to /api/ai/gemini when VITE_USE_SERVER_AI=true.
 */
async function runGeminiGenerate(params: GeminiGenerateParams): Promise<{ text: string }> {
  if (getApiKey()) {
    const response = await getAiClient().models.generateContent({
      model: params.model,
      contents: params.contents as any,
      config: params.config as any,
    });
    return { text: response.text ?? "" };
  }
  if (!useServerGemini()) {
    throw new AiError("NOT_CONFIGURED", "Neural link unconfigured. Device has no AI key.");
  }
  let res: Response;
  try {
    res = await fetch(buildApiUrl(API_ROUTES.AI_GEMINI), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        contents: params.contents,
        config: params.config,
      }),
    });
  } catch (e) {
    return handleApiError(e);
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = String((errBody as { error?: string }).error || `HTTP ${res.status}`);
    const synthetic = new Error(msg);
    (synthetic as any).status = res.status;
    if (res.status === 503 || /not configured/i.test(msg)) {
      throw new AiError("NOT_CONFIGURED", msg);
    }
    return handleApiError(synthetic);
  }
  const data = (await res.json()) as { text?: string };
  return { text: String(data.text ?? "") };
}

const handleApiError = (error: any): never => {
  console.error(`Backend API Error:`, error);

  if (error?.message?.includes("Failed to fetch") || error?.message?.includes("NetworkError") || error?.name === "TypeError") {
    const apiBase = getApiBaseLocal();
    throw new AiError("NETWORK_ERROR", `Backend API connection failed.\n\nBackend URL: ${apiBase || 'Not configured'}\n\nThis could be due to:\n1. Backend server is not running or not deployed\n2. Incorrect VITE_API_BASE environment variable\n3. CORS configuration issue on backend\n4. Internet connectivity problems\n\nPlease check:\n- Backend is deployed and running\n- VITE_API_BASE is set correctly in Vercel/Railway\n- Backend CORS allows your frontend origin`);
  }

  if (error?.status === 403 || error?.statusCode === 403 || error?.message?.includes("403") || error?.message?.includes("Forbidden")) {
    throw new AiError(
      "FORBIDDEN",
      "API authentication failed (403). Check VITE_GEMINI_API_KEY (browser) or GEMINI_API_KEY on your API server (server-side AI).",
    );
  }

  if (error?.message?.includes("API_KEY_INVALID") || error?.type === "NOT_CONFIGURED") {
    throw new AiError("NOT_CONFIGURED", "AI is off. Your device has no valid AI key configured.");
  }

  if (error?.message?.includes("429") || error?.message?.includes("QUOTA")) {
    throw new AiError("RATE_LIMITED", "Neural link saturated. Frequency limits reached.");
  }

  throw new AiError("TEMPORARY_FAILURE", `Transient neural disruption: ${error?.message || 'Unknown error'}. Link stability low.`);
};

function normalizeDirectiveItems(items: any[]): AiDirective[] {
  return items.map((item: any) => {
    const phases = (item.phases || []).map((phase: any, phaseIdx: number) => ({
      id: phase.id || `phase-${phaseIdx}`,
      name: phase.name,
      description: phase.description,
      phaseType: phase.phaseType,
      steps: (phase.steps || []).map((step: any, stepIdx: number) => ({
        id: step.id || `step-${phaseIdx}-${stepIdx}`,
        name: step.name,
        task: step.task,
        instruction: step.instruction,
        isComplete: false,
        requiresProof: step.requiresProof || false,
        proofType: step.proofType,
        order: step.order !== undefined ? step.order : stepIdx,
      })),
      compensation: {
        hc: phase.compensation?.hc || 0,
        xp: phase.compensation?.xp || 0,
        bonusMultiplier: phase.compensation?.bonusMultiplier,
      },
      isComplete: false,
      estimatedDuration: phase.estimatedDuration || "1-2 hours",
    }));

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      instruction: item.instruction,
      rewardHc: item.rewardHc,
      rewardXp: item.rewardXp,
      difficulty: item.difficulty,
      category: item.category,
      phases,
      currentPhaseIndex: 0,
      status: "available" as const,
      timestamp: Date.now(),
      recommendedNextAction: "Begin RECON phase",
      packet: item.packet,
    };
  });
}

export async function generateAiDirectives(
  location: string,
  workCategory: Category,
  count: number = 3
): Promise<AiDirective[]> {
  if (!isAiEnabled())
    return OFFLINE_DIRECTIVES[workCategory] || OFFLINE_DIRECTIVES[Category.Environment];

  try {
    const prompt = `
            ACT AS: DPAL Tactical Dispatcher.
            TARGET LOCATION: ${location}.
            SECTOR: ${workCategory}.
            TASK: Generate ${count} structured "Directives" for field operatives with PHASED WORK STRUCTURE.
            
            Each directive MUST have 4 phases:
            1. RECON - Initial investigation and planning (2-3 steps)
            2. EXECUTION - Main work tasks (3-5 steps)
            3. VERIFICATION - Proof submission and validation (2-3 steps)
            4. COMPLETION - Final review and reward distribution (1-2 steps)
            
            Each phase must have:
            - Clear name and description
            - 2-5 actionable steps with specific tasks
            - Compensation breakdown (hc and xp per phase)
            - Estimated duration
            
            Steps should require proof where appropriate (photo, video, text, or location).
            Total compensation should be distributed across phases (RECON: 20%, EXECUTION: 50%, VERIFICATION: 20%, COMPLETION: 10%).
            
            RESPONSE FORMAT: JSON Array.
        `;

    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.85,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              instruction: { type: Type.STRING },
              rewardHc: { type: Type.NUMBER },
              rewardXp: { type: Type.NUMBER },
              difficulty: { type: Type.STRING, enum: ["Entry", "Standard", "Elite"] },
              category: { type: Type.STRING },
              phases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    phaseType: { type: Type.STRING, enum: ["RECON", "EXECUTION", "VERIFICATION", "COMPLETION"] },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          task: { type: Type.STRING },
                          instruction: { type: Type.STRING },
                          requiresProof: { type: Type.BOOLEAN },
                          proofType: { type: Type.STRING, enum: ["photo", "video", "text", "location"] },
                          order: { type: Type.NUMBER },
                        },
                      },
                    },
                    compensation: {
                      type: Type.OBJECT,
                      properties: {
                        hc: { type: Type.NUMBER },
                        xp: { type: Type.NUMBER },
                        bonusMultiplier: { type: Type.NUMBER },
                      },
                    },
                    estimatedDuration: { type: Type.STRING },
                  },
                  required: ["id", "name", "description", "phaseType", "steps", "compensation", "estimatedDuration"],
                },
              },
              // Legacy packet structure (optional for backward compatibility)
              packet: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  confidence: { type: Type.NUMBER },
                  timeWindow: { type: Type.STRING },
                  geoRadiusMeters: { type: Type.NUMBER },
                  primaryAction: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        verb: { type: Type.STRING },
                        actor: { type: Type.STRING },
                        detail: { type: Type.STRING },
                        eta: { type: Type.STRING },
                        safety: { type: Type.STRING },
                      },
                    },
                  },
                  escalation: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT, properties: { trigger: { type: Type.STRING }, action: { type: Type.STRING } } },
                  },
                  evidenceMissing: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT, properties: { item: { type: Type.STRING }, howToCaptureSafely: { type: Type.STRING } } },
                  },
                  safetyFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            required: [
              "id",
              "title",
              "description",
              "instruction",
              "rewardHc",
              "rewardXp",
              "difficulty",
              "category",
              "phases",
            ],
          },
        },
      },
    });

    const items = JSON.parse(response.text || "[]");
    return normalizeDirectiveItems(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateAiDirectivesBudget(
  location: string,
  workCategory: Category,
  count: number = 3
): Promise<AiDirective[]> {
  const apiBase = getApiBaseLocal();
  const prompt = `
    You are DPAL Work Screen Job Planner.
    Generate ${count} high-quality civic jobs for this city: ${location}.
    Category: ${workCategory}.
    Jobs MUST be related to common real incidents in that city/category (transport issues, sanitation, local safety, consumer scams, public works, etc).
    Return JSON array with fields:
    id,title,description,instruction,rewardHc,rewardXp,difficulty,category,phases.
    Each directive needs phases: RECON, EXECUTION, VERIFICATION, COMPLETION.
    Each phase needs steps with proof requirements when relevant.
  `;

  try {
    const response = await fetch(`${apiBase}/api/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, tier: "cheap" }),
    });

    if (!response.ok) {
      throw new Error(`Budget AI request failed (${response.status})`);
    }

    const data = await response.json();
    const raw = String(data?.answer || "[]");

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return OFFLINE_DIRECTIVES[workCategory] || OFFLINE_DIRECTIVES[Category.Environment];
    }

    return normalizeDirectiveItems(parsed);
  } catch {
    return OFFLINE_DIRECTIVES[workCategory] || OFFLINE_DIRECTIVES[Category.Environment];
  }
}

export async function generateMissionFromIntel(
  intel: IntelItem,
  approach: MissionApproach,
  goal: MissionGoal
): Promise<any> {
  if (!isAiEnabled()) {
    const template = OFFLINE_MISSION_TEMPLATES[approach];
    return {
      title: `OFFLINE: ${intel.title}`,
      backstory: intel.summary,
      category: intel.category,
      approach,
      goal,
      successProbability: 0.85,
      steps: template.map((t) => ({ ...t, isComplete: false })),
      finalReward: { hc: 200, nft: { name: "Offline Shard", icon: "💾" } },
    };
  }

  try {
    const prompt = `
            ARCHITECT A MISSION.
            INTEL: ${JSON.stringify(intel)}.
            APPROACH: ${approach}.
            GOAL: ${goal}.
            
            INSTRUCTIONS:
            - Generate field operator prompts that require real-world confirmation or evidence. 
            - Avoid abstract analysis like "Evaluate" or "Analyze".
            - Use action words: "Identify", "Confirm", "Observe", "Capture", "Verify".
            - Assume the user is physically present.
            - Every step MUST have 1-3 FieldPrompts.
            - Prompt types: confirmation, evidence, observation, safety.
            - Output 5 specific steps.
        `;

    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            backstory: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  task: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  prompts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["confirmation", "evidence", "observation", "safety"] },
                        promptText: { type: Type.STRING },
                        required: { type: Type.BOOLEAN },
                        responseType: { type: Type.STRING, enum: ["checkbox", "photo", "video", "text", "multi-select"] },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        storedAs: {
                          type: Type.OBJECT,
                          properties: {
                            entity: { type: Type.STRING, enum: ["report", "evidence", "missionLog", "riskAssessment"] },
                            field: { type: Type.STRING },
                          },
                          required: ["entity", "field"],
                        },
                      },
                      required: ["id", "type", "promptText", "required", "responseType", "storedAs"],
                    },
                  },
                },
                required: ["name", "task", "whyItMatters", "icon", "priority", "prompts"],
              },
            },
            finalReward: {
              type: Type.OBJECT,
              properties: {
                hc: { type: Type.NUMBER },
                nft: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, icon: { type: Type.STRING } } },
              },
            },
          },
          required: ["title", "backstory", "steps"],
        },
      },
    });

    const m = JSON.parse(response.text || "{}");
    // Only include known/required properties in the result
    return {
      title: m.title,
      backstory: m.backstory,
      steps: m.steps,
      finalReward: m.finalReward,
      approach,
      goal,
      category: intel.category,
      successProbability: 0.9
    };
  } catch (e) {
    return handleApiError(e);
  }
}

export async function analyzeIntelSource(intel: IntelItem): Promise<IntelAnalysis> {
  if (!isAiEnabled())
    return {
      threatScore: 42,
      communityImpact: "Moderate - Local Mode.",
      investigativeComplexity: "Low",
      verificationDifficulty: "Simple",
      aiAssessment: "Cached Analysis.",
      targetEntity: "LOCAL",
    };

  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `Deep-scan: ${JSON.stringify(intel)}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            threatScore: { type: Type.INTEGER },
            communityImpact: { type: Type.STRING },
            investigativeComplexity: { type: Type.STRING },
            verificationDifficulty: { type: Type.STRING, enum: ["Simple", "Complex", "Classified"] },
            aiAssessment: { type: Type.STRING },
            targetEntity: { type: Type.STRING },
          },
          required: ["threatScore", "communityImpact", "investigativeComplexity", "verificationDifficulty", "aiAssessment"],
        },
      },
    });
    const out = JSON.parse(response.text || "{}") as IntelAnalysis;
    // Only known properties according to required keys and type
    return {
      threatScore: out.threatScore,
      communityImpact: out.communityImpact,
      investigativeComplexity: out.investigativeComplexity,
      verificationDifficulty: out.verificationDifficulty,
      aiAssessment: out.aiAssessment,
      targetEntity: out.targetEntity
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export async function fetchLiveIntelligence(categories: Category[], location: string): Promise<any> {
  try {
    if (isBraveSearchEnabled()) {
      const braveItems = await searchLiveIntelWithBrave(categories, location);
      if (braveItems.length > 0) return braveItems;
    }
  } catch (error) {
    console.warn("Brave search unavailable, falling back to existing intelligence provider.", error);
  }

  if (!isAiEnabled()) return OFFLINE_INTEL;
  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              title: { type: Type.STRING },
              location: { type: Type.STRING },
              time: { type: Type.STRING },
              summary: { type: Type.STRING },
              source: { type: Type.STRING },
            },
            required: ["id", "category", "title", "location", "time", "summary", "source"],
          },
        },
      },
      contents: `Accountability incidents in ${location}.`,
    });
    // return an array of only known/required fields
    const arr = JSON.parse(response.text || "[]");
    return Array.isArray(arr)
      ? arr.map((item: any) => ({
          id: item.id,
          category: item.category,
          title: item.title,
          location: item.location,
          time: item.time,
          summary: item.summary,
          source: item.source,
        }))
      : [];
  } catch (e) {
    return handleApiError(e);
  }
}

export async function generateTrainingScenario(
  hero: Hero,
  mode: SimulationMode,
  category: Category,
  difficulty: SimulationDifficulty
): Promise<TrainingScenario> {
  if (!isAiEnabled()) return OFFLINE_TRAINING[0];
  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `Holodeck sim for ${mode} in ${category}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            environment: { type: Type.STRING },
            bgKeyword: { type: Type.STRING },
            objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            masterDebrief: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  successOutcome: { type: Type.STRING },
                  failOutcome: { type: Type.STRING },
                  dc: { type: Type.INTEGER },
                  rationale: { type: Type.STRING },
                },
                required: ["id", "text", "successOutcome", "failOutcome", "dc", "rationale"],
              },
            },
            difficulty: { type: Type.INTEGER },
          },
          required: ["id", "title", "description", "environment", "bgKeyword", "objectives", "options", "difficulty", "masterDebrief"],
        },
      },
    });
    const r = JSON.parse(response.text || "{}") as TrainingScenario;
    // Only return known properties
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      environment: r.environment,
      bgKeyword: r.bgKeyword,
      objectives: r.objectives,
      masterDebrief: r.masterDebrief,
      options: r.options,
      difficulty: r.difficulty,
    };
  } catch (e) {
    return handleApiError(e);
  }
}

export async function performIAReview(report: Report): Promise<{ findings: any[]; outcome: string }> {
  if (!isAiEnabled())
    return {
      findings: [{ id: "1", title: "Offline", value: "Manual check", status: "VERIFIED", hash: "LOCAL" }],
      outcome: "Local Buffer.",
    };

  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `IA review for: ${report.title}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  value: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["VERIFIED", "ANOMALY", "MATCHED"] },
                  hash: { type: Type.STRING },
                },
                required: ["id", "title", "value", "status", "hash"],
              },
            },
            outcome: { type: Type.STRING },
          },
          required: ["findings", "outcome"],
        },
      },
    });
    // Only known properties
    const data = JSON.parse(response.text || "{}");
    return {
      findings: Array.isArray(data.findings)
        ? data.findings.map((f: any) => ({
            id: f.id,
            title: f.title,
            value: f.value,
            status: f.status,
            hash: f.hash
          }))
        : [],
      outcome: data.outcome
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateNftImage(
  hero: Hero,
  reportContext: any,
  prompt: string,
  theme?: NftTheme
): Promise<string> {
  if (!isAiEnabled()) return `https://picsum.photos/seed/${prompt.substring(0, 5)}/400/600`;
  try {
    const apiBase = getApiBaseLocal();
    const response = await fetch(buildApiUrl(API_ROUTES.NFT_GENERATE_IMAGE), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, theme, operativeId: hero.operativeId }),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}`, error: 'unknown' };
      }
      const error = new Error(errorData.message || errorData.error || "IMAGE_SYNC_FAILED");
      (error as any).status = response.status;
      (error as any).errorCode = errorData.error;
      throw error;
    }

    const data = await response.json();
    // Only use known property .imageUrl
    return typeof data.imageUrl === "string" && data.imageUrl.startsWith("/")
      ? `${apiBase}${data.imageUrl}`
      : data.imageUrl;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateNftDetails(description: string): Promise<{ nftTitle: string; nftDescription: string }> {
  if (!isAiEnabled()) return { nftTitle: "Heroic Shard", nftDescription: "A record." };
  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `NFT title/desc for: ${description}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { nftTitle: { type: Type.STRING }, nftDescription: { type: Type.STRING } },
          required: ["nftTitle", "nftDescription"],
        },
      },
    });
    const d = JSON.parse(response.text || "{}");
    return {
      nftTitle: d.nftTitle,
      nftDescription: d.nftDescription
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateNftPromptIdeas(hero: Hero, theme: NftTheme, dpalCategory: Category): Promise<string[]> {
  if (!isAiEnabled()) return ["Decentralized Oversight Shard", "Truth Network Artifact", "Community Governance Token"];
  try {
    const apiBase = getApiBaseLocal();
    const prompt = `Act as the DPAL Oracle. Generate 3 unique, evocative, and conceptually dense short phrases (max 5 words each) for an NFT artifact based on:
    Theme: ${theme}
    Category: ${dpalCategory}
    Role: ${hero.title}
    
    The phrases should sound like fragments of a futuristic accountability ledger.
    Return only a JSON array of strings.`;

    const response = await fetch(buildApiUrl(API_ROUTES.AI_ASK), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.answer || "[]";
    
    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => typeof s === "string");
      }
      // If it's a string that looks like an array, try to extract it
      const arrayMatch = answer.match(/\[.*?\]/);
      if (arrayMatch) {
        const arr = JSON.parse(arrayMatch[0]);
        return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON array:", answer);
    }
    
    // Fallback: return default
    return ["Decentralized Oversight Shard", "Truth Network Artifact", "Community Governance Token"];
  } catch (error: any) {
    console.error("Failed to generate NFT prompt ideas:", error);
    // Return fallback instead of throwing to prevent UI crashes
    return ["Decentralized Oversight Shard", "Truth Network Artifact", "Community Governance Token"];
  }
  
}

export async function generateHeroBackstory(hero: Hero): Promise<string> {
  if (!isAiEnabled()) return "Redacted.";
  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `Background for: ${hero.name}.`,
      config: { temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } },
    });
    // Only the raw text as backstory
    return (response.text || "").trim();
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getMissionTaskAdvice(
  title: string,
  backstory: string,
  name: string,
  task: string
): Promise<TacticalIntel> {
  if (!isAiEnabled()) return { objective: name, threatLevel: "Medium", keyInsight: "Offline Analysis.", protocol: "Default." };
  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `Advice for mission: ${title}, step: ${name}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objective: { type: Type.STRING },
            threatLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Extreme"] },
            keyInsight: { type: Type.STRING },
            protocol: { type: Type.STRING },
          },
          required: ["objective", "threatLevel", "keyInsight", "protocol"],
        },
      },
    });
    const r = JSON.parse(response.text || "{}") as TacticalIntel;
    // Only return known properties
    return {
      objective: r.objective,
      threatLevel: r.threatLevel,
      keyInsight: r.keyInsight,
      protocol: r.protocol
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateMissionTaskList(input: {
  missionTitle: string;
  missionType: string;
  objective: string;
  location: string;
  issueType: string;
  reportSnapshot: string;
}): Promise<Array<{ title: string; proofRequired: string }>> {
  if (!isAiEnabled()) {
    return [
      { title: "Inspect and secure the affected area", proofRequired: "GPS check-in + photo" },
      { title: "Document key hazards and current conditions", proofRequired: "At least 2 photos" },
      { title: "Coordinate helper actions and cleanup sequence", proofRequired: "Verifier note" },
      { title: "Submit final completion summary", proofRequired: "Beneficiary confirmation" },
    ];
  }

  try {
    const prompt = `
      You are DPAL Mission Planner AI.
      Build a concise task list for a mission based on this report context.

      Mission title: ${input.missionTitle}
      Mission type: ${input.missionType}
      Objective: ${input.objective}
      Location: ${input.location}
      Issue type: ${input.issueType}
      Report snapshot: ${input.reportSnapshot}

      Requirements:
      - Return 4 to 7 tasks.
      - Tasks must be operational and ordered.
      - Each task must have "title" and "proofRequired".
      - Keep title under 80 chars.
      - proofRequired should be short and concrete.
      - Output JSON array only.
    `;

    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              proofRequired: { type: Type.STRING },
            },
            required: ["title", "proofRequired"],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Empty AI task list");
    }

    return parsed
      .filter((item) => item && typeof item.title === "string" && typeof item.proofRequired === "string")
      .slice(0, 7)
      .map((item) => ({
        title: item.title.trim(),
        proofRequired: item.proofRequired.trim(),
      }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateMissionDetailsFromReport(input: {
  title: string;
  description: string;
  category: string;
  severity: string;
  location: string;
}): Promise<{
  missionType: string;
  objective: string;
  deadline: string;
  rewardLabel: string;
  rewardType: 'Coins' | 'Tokens' | 'HC';
  rewardAmount: number;
  escrowLabel: string;
  rules: string[];
  objectivePhases: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; label: string; done: boolean; images: string[] }>;
  }>;
}> {
  if (!isAiEnabled()) {
    return {
      missionType: "Report Response Mission",
      objective: `Resolve and verify: ${input.title}`,
      deadline: "Due in 72 hours",
      rewardLabel: input.severity === "Critical" || input.severity === "Catastrophic" ? "2,000 HC + Escrow Release" : "1,000 HC + Escrow Release",
      rewardType: 'HC',
      rewardAmount: input.severity === "Critical" || input.severity === "Catastrophic" ? 2000 : 1000,
      escrowLabel: "Escrow pending validator lock",
      rules: [
        "Lead approval required before closure.",
        "Verifier sign-off required before payout.",
        "At least one evidence item required for each completed task.",
      ],
      objectivePhases: [
        {
          id: 'phase-beginning-objective',
          title: 'Beginning Objective',
          items: [
            { id: 'obj-1', label: `Resolve and verify: ${input.title}`, done: false, images: [] },
            { id: 'obj-2', label: 'Attach initial phase evidence photos', done: false, images: [] },
          ],
        },
      ],
    };
  }

  try {
    const prompt = `
      You are DPAL Mission Planner.
      Build concise mission metadata from this report:
      Title: ${input.title}
      Description: ${input.description}
      Category: ${input.category}
      Severity: ${input.severity}
      Location: ${input.location}

      Return JSON object with:
      - missionType (short label)
      - objective (single concise sentence)
      - deadline (human friendly)
      - rewardLabel
      - rewardType (Coins, Tokens, or HC)
      - rewardAmount (number only)
      - escrowLabel
      - rules (array of 3 short operational rules)
      - objectivePhases (array of 1-3 phases, each with title and checkbox items)
    `;

    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missionType: { type: Type.STRING },
            objective: { type: Type.STRING },
            deadline: { type: Type.STRING },
            rewardLabel: { type: Type.STRING },
            rewardType: { type: Type.STRING, enum: ["Coins", "Tokens", "HC"] },
            rewardAmount: { type: Type.NUMBER },
            escrowLabel: { type: Type.STRING },
            rules: { type: Type.ARRAY, items: { type: Type.STRING } },
            objectivePhases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        done: { type: Type.BOOLEAN },
                        images: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ["id", "label", "done", "images"],
                    },
                  },
                },
                required: ["id", "title", "items"],
              },
            },
          },
          required: ["missionType", "objective", "deadline", "rewardLabel", "rewardType", "rewardAmount", "escrowLabel", "rules", "objectivePhases"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      missionType: String(parsed.missionType || "Report Response Mission"),
      objective: String(parsed.objective || `Resolve and verify: ${input.title}`),
      deadline: String(parsed.deadline || "Due in 72 hours"),
      rewardLabel: String(parsed.rewardLabel || "1,000 HC + Escrow Release"),
      rewardType: parsed.rewardType === 'Coins' || parsed.rewardType === 'Tokens' || parsed.rewardType === 'HC' ? parsed.rewardType : 'HC',
      rewardAmount: Number(parsed.rewardAmount || 1000),
      escrowLabel: String(parsed.escrowLabel || "Escrow pending validator lock"),
      rules: Array.isArray(parsed.rules) ? parsed.rules.slice(0, 5).map((r: unknown) => String(r)) : [
        "Lead approval required before closure.",
        "Verifier sign-off required before payout.",
        "At least one evidence item required for each completed task.",
      ],
      objectivePhases: Array.isArray(parsed.objectivePhases) && parsed.objectivePhases.length
        ? parsed.objectivePhases.slice(0, 3).map((phase: any, pIdx: number) => ({
            id: String(phase?.id || `phase-${pIdx + 1}`),
            title: String(phase?.title || `Phase ${pIdx + 1}`),
            items: Array.isArray(phase?.items)
              ? phase.items.slice(0, 8).map((item: any, iIdx: number) => ({
                  id: String(item?.id || `item-${pIdx + 1}-${iIdx + 1}`),
                  label: String(item?.label || `Checklist item ${iIdx + 1}`),
                  done: Boolean(item?.done),
                  images: Array.isArray(item?.images) ? item.images.filter((v: unknown) => typeof v === 'string') : [],
                }))
              : [],
          }))
        : [
            {
              id: 'phase-beginning-objective',
              title: 'Beginning Objective',
              items: [
                { id: 'obj-1', label: String(parsed.objective || `Resolve and verify: ${input.title}`), done: false, images: [] },
                { id: 'obj-2', label: 'Attach initial phase evidence photos', done: false, images: [] },
              ],
            },
          ],
    };
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getLiveIntelligenceUpdate(currentState: any): Promise<any> {
  if (!isAiEnabled())
    return { ui: { next: "Offline Analysis", why: "Neural link unconfigured.", need: [], risk: "Low", eta: 0, score: 0 }, patch: {} };

  try {
    const response = await runGeminiGenerate({
      model: FLASH_TEXT_MODEL,
      contents: `Co-pilot update for: ${JSON.stringify(currentState)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ui: {
              type: Type.OBJECT,
              properties: {
                next: { type: Type.STRING },
                why: { type: Type.STRING },
                need: { type: Type.ARRAY, items: { type: Type.STRING } },
                risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                eta: { type: Type.INTEGER },
                score: { type: Type.NUMBER },
              },
              required: ["next", "why", "need", "risk", "eta", "score"],
            },
            patch: { type: Type.OBJECT },
          },
          required: ["ui", "patch"],
        },
      },
    });
    const d = JSON.parse(response.text || "{}");
    // Only include known/required properties
    return {
      ui: d.ui && typeof d.ui === "object" ? {
        next: d.ui.next,
        why: d.ui.why,
        need: Array.isArray(d.ui.need) ? d.ui.need : [],
        risk: d.ui.risk,
        eta: d.ui.eta,
        score: d.ui.score
      } : { next: "", why: "", need: [], risk: "", eta: 0, score: 0 },
      patch: d.patch && typeof d.patch === "object" ? d.patch : {}
    };
  } catch (e) {
    return handleApiError(e);
  }
}

export async function generateHeroPersonaDetails(prompt: string, arch: Archetype): Promise<any> {
  if (!isAiEnabled())
    return {
      name: "Jordan Lee",
      backstory: "A neighbor who checks in on others and speaks up with kindness when something is wrong.",
      combatStyle: "Calm voice, steady presence, and clear follow-through",
    };
  try {
    const apiBase = getApiBaseLocal();
    const response = await fetch(buildApiUrl(API_ROUTES.PERSONA_GENERATE_DETAILS), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, archetype: arch }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}`, error: 'unknown' }));
      const error = new Error(errorData.message || errorData.error || "PERSONA_DETAILS_SYNC_FAILED");
      (error as any).status = response.status;
      (error as any).errorCode = errorData.error;
      throw error;
    }

    const data = await response.json();
    // Only known persona properties (use direct result as shape is not defined)
    return {
      name: data.name,
      backstory: data.backstory,
      combatStyle: data.combatStyle
    };
  } catch (e: any) {
    // If it's already an AiError, re-throw it
    if (e.type && e.name === "AiError") {
      throw e;
    }
    return handleApiError(e);
  }
}

export async function generateHeroPersonaImage(prompt: string, arch: Archetype, sourceImageData?: string): Promise<string> {
  if (!isAiEnabled()) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
  try {
    const apiBase = getApiBaseLocal();
    const response = await fetch(buildApiUrl(API_ROUTES.PERSONA_GENERATE_IMAGE), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, archetype: arch, sourceImage: sourceImageData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}`, error: 'unknown' }));
      const error = new Error(errorData.message || errorData.error || "PERSONA_SYNC_FAILED");
      (error as any).status = response.status;
      (error as any).errorCode = errorData.error;
      throw error;
    }

    const data = await response.json();
    // Only use imageUrl property
    return typeof data.imageUrl === "string" && data.imageUrl.startsWith("/")
      ? `${apiBase || ''}${data.imageUrl}`
      : data.imageUrl;
  } catch (e: any) {
    // If it's already an AiError, re-throw it
    if (e.type && e.name === "AiError") {
      throw e;
    }
    return handleApiError(e);
  }
}

export async function formatTranscript(text: string): Promise<string> {
  return text;
}
