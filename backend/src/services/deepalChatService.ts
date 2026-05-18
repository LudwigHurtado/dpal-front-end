/**
 * DeepAL chat — structured assistant replies with audit-safe rationale (no chain-of-thought).
 */
import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export type DeepAlChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type DeepAlChatRequest = {
  question: string;
  messages?: DeepAlChatMessage[];
  context?: string;
  workspace?: string;
  module?: string;
  projectId?: string;
};

export type DeepAlRationale = {
  userRequest: string;
  detectedIntent: string;
  workspaceModule: string;
  modelProvider: string;
  projectDataConsidered: string;
  missingInformation: string[];
  actionRecommended: string;
  finalAnswer: string;
  spokenText: string;
  voiceStatus: 'pending' | 'ready' | 'unavailable' | 'skipped';
};

export type DeepAlChatResult = {
  ok: boolean;
  mode: 'live' | 'offline';
  answer: string;
  spokenText: string;
  rationale: DeepAlRationale;
  provider: string;
  error?: string;
};

function readGeminiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? '';
}

function modelCandidates(requested?: string): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const chain = [requested, fromEnv, DEFAULT_MODEL, 'gemini-2.0-flash'].filter(
    (m): m is string => Boolean(m && m.trim()),
  );
  return [...new Set(chain)];
}

function isModelUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('not supported') ||
    m.includes('invalid model') ||
    m.includes('model is not')
  );
}

async function runGeminiText(prompt: string, model?: string): Promise<string> {
  const key = readGeminiKey();
  if (!key) {
    throw Object.assign(new Error('GEMINI_API_KEY not configured on server'), {
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const ai = new GoogleGenAI({ apiKey: key });
  let lastError: string | null = null;

  for (const candidate of modelCandidates(model)) {
    try {
      const response = await ai.models.generateContent({
        model: candidate,
        contents: prompt,
      } as Parameters<GoogleGenAI['models']['generateContent']>[0]);
      return response.text ?? '';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg;
      if (!isModelUnavailableError(msg)) throw e;
    }
  }

  throw Object.assign(new Error(lastError || 'All Gemini model candidates failed'), {
    code: 'AI_PROVIDER_UNAVAILABLE',
  });
}

function detectIntent(question: string): string {
  const q = question.toLowerCase();
  if (/\b(fill|autofill|suggest|configure|setup)\b/.test(q)) return 'configuration_assist';
  if (/\b(missing|required|checklist|evidence)\b/.test(q)) return 'evidence_gap_review';
  if (/\b(validator|verify|review|audit)\b/.test(q)) return 'validator_guidance';
  if (/\b(methodology|calculation|formula|tco2)\b/.test(q)) return 'methodology_counsel';
  if (/\b(satellite|ndvi|imagery|lidar|aoi)\b/.test(q)) return 'remote_sensing_guidance';
  if (/\b(explain|what is|how does)\b/.test(q)) return 'explain_concept';
  return 'general_assistance';
}

function summarizeContextConsidered(context: string): string {
  const trimmed = context.trim();
  if (!trimmed) return 'No project configuration context was supplied.';
  const lines = trimmed.split('\n').filter(Boolean);
  const preview = lines.slice(0, 6).join(' · ');
  const suffix = lines.length > 6 ? ` (+${lines.length - 6} more context lines)` : '';
  return `Configuration snapshot (${trimmed.length} chars): ${preview}${suffix}`;
}

function inferMissingInformation(context: string, question: string): string[] {
  const missing: string[] = [];
  const ctx = context.toLowerCase();
  if (!ctx.trim()) missing.push('Project or workspace configuration context');
  if (/\b(aoi|coordinates|latitude|longitude)\b/i.test(question) && !/\blat|lng|coordinate|aoi\b/i.test(ctx)) {
    missing.push('AOI coordinates or map boundary');
  }
  if (/\b(satellite|imagery)\b/i.test(question) && !/\bsentinel|landsat|mission|imagery\b/i.test(ctx)) {
    missing.push('Satellite mission / imagery configuration');
  }
  if (/\b(evidence|packet)\b/i.test(question) && !/\bevidence|packet|attachment\b/i.test(ctx)) {
    missing.push('Evidence packet or attachment references');
  }
  return missing.slice(0, 5);
}

function buildSpokenText(answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed) return '';
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return trimmed.slice(0, 600);
  return sentences.slice(0, 2).join(' ').slice(0, 600);
}

function firstActionSentence(answer: string): string {
  const line = answer.split('\n').map((l) => l.trim()).find(Boolean) ?? answer;
  const sentence = line.split(/(?<=[.!?])\s+/)[0] ?? line;
  return sentence.slice(0, 240);
}

function buildOfflineAnswer(context: string, question: string): string {
  const intent = detectIntent(question);
  const ctxNote = context.trim()
    ? 'I used the configuration context you provided.'
    : 'No live AI key is configured — add GEMINI_API_KEY on the API host for full answers.';
  switch (intent) {
    case 'evidence_gap_review':
      return `${ctxNote} Review required fields, validation rules, and attachments before claiming verification. Your question: "${question.slice(0, 120)}"`;
    case 'methodology_counsel':
      return `${ctxNote} Compare methodology presets and document assumptions before validator review. Your question: "${question.slice(0, 120)}"`;
    default:
      return `${ctxNote} DeepAL is in offline mode. Your question: "${question.slice(0, 160)}"`;
  }
}

function buildPrompt(req: DeepAlChatRequest): string {
  const thread = (req.messages ?? [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  const workspace = req.workspace ?? req.module ?? 'dpal_workspace';

  return `You are DeepAL, the DPAL civic-tech assistant. Answer in plain English (2–8 sentences unless the user asks for a list).

Rules:
- Use only facts from the configuration context; do not invent verification, certified credits, or blockchain anchoring.
- Never expose hidden reasoning or chain-of-thought — give a direct, audit-safe answer only.
- Stress human review before save, publish, or validator claims.

Workspace: ${workspace}
${req.projectId ? `Project id: ${req.projectId}` : ''}

Configuration context:
${req.context?.trim() || '(none supplied)'}

${thread ? `Recent conversation:\n${thread}\n\n` : ''}User: ${req.question.trim()}

Assistant:`;
}

export async function runDeepAlChat(req: DeepAlChatRequest): Promise<DeepAlChatResult> {
  const question = req.question?.trim() ?? '';
  const context = req.context?.trim() ?? '';
  const workspaceModule = req.workspace ?? req.module ?? 'dpal_workspace';
  const detectedIntent = detectIntent(question);
  const missingInformation = inferMissingInformation(context, question);
  const projectDataConsidered = summarizeContextConsidered(context);

  const baseRationale = {
    userRequest: question,
    detectedIntent,
    workspaceModule,
    modelProvider: 'gemini',
    projectDataConsidered,
    missingInformation,
    actionRecommended: '',
    finalAnswer: '',
    spokenText: '',
    voiceStatus: 'pending' as const,
  };

  if (!question) {
    return {
      ok: false,
      mode: 'offline',
      answer: 'Please ask a question first.',
      spokenText: '',
      provider: 'none',
      rationale: {
        ...baseRationale,
        finalAnswer: 'Please ask a question first.',
        voiceStatus: 'skipped',
      },
      error: 'empty_question',
    };
  }

  const key = readGeminiKey();
  if (!key) {
    const offline = buildOfflineAnswer(context, question);
    const spokenText = buildSpokenText(offline);
    return {
      ok: true,
      mode: 'offline',
      answer: offline,
      spokenText,
      provider: 'offline',
      rationale: {
        ...baseRationale,
        modelProvider: 'offline_rules',
        actionRecommended: firstActionSentence(offline),
        finalAnswer: offline,
        spokenText,
        voiceStatus: 'unavailable',
      },
    };
  }

  try {
    const raw = await runGeminiText(buildPrompt(req));
    const answer = raw.trim() || 'No response from the assistant.';
    const spokenText = buildSpokenText(answer);
    return {
      ok: true,
      mode: 'live',
      answer,
      spokenText,
      provider: 'gemini',
      rationale: {
        ...baseRationale,
        actionRecommended: firstActionSentence(answer),
        finalAnswer: answer,
        spokenText,
        voiceStatus: 'ready',
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const offline = buildOfflineAnswer(context, question);
    const spokenText = buildSpokenText(offline);
    return {
      ok: true,
      mode: 'offline',
      answer: offline,
      spokenText,
      provider: 'gemini',
      rationale: {
        ...baseRationale,
        modelProvider: 'gemini',
        actionRecommended: firstActionSentence(offline),
        finalAnswer: offline,
        spokenText,
        voiceStatus: 'unavailable',
      },
      error: msg,
    };
  }
}
