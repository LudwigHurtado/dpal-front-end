import path from 'path';
import { promises as fs } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { getRun } from './commandCenter/commandCenterRunEngine';

const ROOMS_FILE = path.resolve(process.cwd(), 'data', 'situation', 'rooms.json');
const MESSAGES_FILE = path.resolve(process.cwd(), 'data', 'situation', 'messages.json');

export type ReportReaderChatMode =
  | 'report_reader'
  | 'evidence_audit'
  | 'validator_review'
  | 'next_steps';

export type ReportReaderChatMessage = { role: 'user' | 'assistant'; content: string };

export type ReportReaderChatRequest = {
  reportId?: string;
  roomId?: string;
  runId?: string;
  evidencePacket?: unknown;
  reportSnapshot?: unknown;
  commandCenterRun?: unknown;
  messages?: ReportReaderChatMessage[];
  question?: string;
  mode?: ReportReaderChatMode;
};

export type ReportReaderChatResponse = {
  ok: true;
  answer: string;
  groundedSummary: string;
  evidenceUsed: string[];
  missingEvidence: string[];
  cannotConclude: string[];
  recommendedNextSteps: string[];
  safetyWarnings: string[];
  modulesReferenced: string[];
  generatedAt: string;
  fallbackUsed?: boolean;
};

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function loadRoomByRoomId(roomId: string): Promise<Record<string, unknown> | null> {
  const rooms = await readJsonArray<Record<string, unknown>>(ROOMS_FILE);
  const hit = rooms.find((r) => String(r.roomId ?? '') === roomId);
  if (!hit) return null;
  const messages = await readJsonArray<Record<string, unknown>>(MESSAGES_FILE);
  const roomMsgs = messages
    .filter((m) => String(m.roomId ?? '') === roomId)
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    .slice(-40)
    .map((m) => ({
      id: m.id,
      type: m.type,
      text: m.text,
      senderName: m.senderName,
      createdAt: m.createdAt,
    }));
  return {
    ...(hit as Record<string, unknown>),
    messagesSummary: roomMsgs,
    media: Array.isArray((hit as any).media)
      ? (hit as any).media.map((x: Record<string, unknown>) => ({
          id: x.id,
          filename: x.filename,
          mimeType: x.mimeType,
          size: x.size,
          caption: x.caption,
          createdAt: x.createdAt,
        }))
      : [],
  };
}

async function loadRoomByReportId(reportId: string): Promise<Record<string, unknown> | null> {
  const rooms = await readJsonArray<Record<string, unknown>>(ROOMS_FILE);
  const hit = rooms.find((r) => String(r.reportId ?? '') === reportId || String(r.roomId ?? '') === reportId);
  if (!hit) return null;
  const rid = String(hit.roomId ?? hit.id ?? '').trim();
  return rid ? loadRoomByRoomId(rid) : { ...hit, messagesSummary: [], media: [] };
}

function deepBool(obj: unknown, keys: string[]): boolean {
  if (obj == null) return false;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some((x) => deepBool(x, keys));
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    if (rec[k] === true) return true;
  }
  return Object.values(rec).some((v) => deepBool(v, keys));
}

function deepCollectModules(obj: unknown, out: Set<string>): void {
  if (obj == null) return;
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((x) => deepCollectModules(x, out));
    return;
  }
  const rec = obj as Record<string, unknown>;
  if (typeof rec.moduleKey === 'string') out.add(rec.moduleKey);
  if (typeof rec.module === 'string') out.add(rec.module);
  Object.values(rec).forEach((v) => deepCollectModules(v, out));
}

function truncateJson(value: unknown, max = 28000): string {
  const s = JSON.stringify(value ?? {});
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…(truncated for model context)`;
}

function mergeHydratedContext(body: ReportReaderChatRequest): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    reportSnapshot: body.reportSnapshot,
    evidencePacket: body.evidencePacket,
    commandCenterRun: body.commandCenterRun,
    reportId: body.reportId,
    roomId: body.roomId,
    runId: body.runId,
  };
  return merged;
}

export async function hydrateReportReaderContext(body: ReportReaderChatRequest): Promise<Record<string, unknown>> {
  const base = mergeHydratedContext(body);
  if (body.roomId) {
    try {
      const room = await loadRoomByRoomId(String(body.roomId).trim());
      if (room) {
        base.situationRoomHydrated = room;
        if (body.evidencePacket == null && room.evidencePacket != null) base.evidencePacket = room.evidencePacket;
      }
    } catch {
      base.situationRoomHydrated = { error: 'room_load_failed' };
    }
  }
  if (body.reportId && !base.situationRoomHydrated) {
    try {
      const room = await loadRoomByReportId(String(body.reportId).trim());
      if (room) {
        base.situationRoomHydrated = room;
        if (body.evidencePacket == null && room.evidencePacket != null) base.evidencePacket = room.evidencePacket;
      }
    } catch {
      /* ignore */
    }
  }
  if (body.runId) {
    const doc = getRun(String(body.runId).trim());
    if (doc) {
      base.commandCenterRunHydrated = {
        runId: doc.runId,
        status: doc.status,
        runMode: doc.runMode,
        modules: doc.modules,
        context: doc.context,
        results: doc.results,
        warnings: doc.warnings,
        safetyLabels: doc.safetyLabels,
        currentStep: doc.currentStep,
        updatedAtIso: doc.updatedAtIso,
      };
    }
  }
  return base;
}

function deriveFlags(ctx: Record<string, unknown>): {
  humanVerified: boolean;
  blockchainAnchored: boolean;
  evidenceHashPresent: boolean;
  ledgerStatus?: string;
} {
  const humanVerified = deepBool(ctx, ['human_verified', 'humanVerified']);
  const blockchainAnchored = deepBool(ctx, ['blockchain_anchored', 'blockchainAnchored']);
  const blob = JSON.stringify(ctx);
  const evidenceHashPresent =
    deepBool(ctx, ['evidenceHash', 'evidence_hash']) ||
    /"evidenceHash"\s*:\s*"[^"]+"/.test(blob) ||
    /"evidence_hash"\s*:\s*"[^"]+"/.test(blob);
  let ledgerStatus: string | undefined;
  const walk = (o: unknown): void => {
    if (o == null || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      o.forEach(walk);
      return;
    }
    const l = (o as Record<string, unknown>).ledger;
    if (l && typeof l === 'object' && 'verificationStatus' in (l as object)) {
      ledgerStatus = String((l as Record<string, unknown>).verificationStatus ?? ledgerStatus);
    }
    Object.values(o as object).forEach(walk);
  };
  walk(ctx);
  return { humanVerified, blockchainAnchored, evidenceHashPresent, ledgerStatus };
}

function buildDeterministic(
  ctx: Record<string, unknown>,
  question: string,
  mode: ReportReaderChatMode,
): Omit<ReportReaderChatResponse, 'ok' | 'generatedAt'> & { fallbackUsed: true } {
  const flags = deriveFlags(ctx);
  const modules = new Set<string>();
  deepCollectModules(ctx, modules);
  const modulesReferenced = [...modules].filter(Boolean).slice(0, 24);

  const evidenceUsed = Object.keys(ctx).filter((k) => ctx[k] != null);
  const missingEvidence: string[] = [];
  if (!ctx.evidencePacket && !(ctx.situationRoomHydrated as any)?.evidencePacket) {
    missingEvidence.push('No structured evidencePacket attached in this context.');
  }
  if (!flags.humanVerified) {
    missingEvidence.push('human_verified confirmation from reviewer workflow (not present in supplied context).');
  }
  if (!flags.blockchainAnchored) {
    missingEvidence.push('blockchain_anchored confirmation or authoritative chain transaction reference (not established in supplied context).');
  }

  const cannotConclude: string[] = [
    'Legal, enforcement, medical, emergency, fault, or guilt conclusions.',
    'Registry certification, issued carbon credits, or issued VIUs.',
    'Final verification status unless human_verified is explicitly true in context.',
    'Blockchain anchoring from an evidence hash alone — hashes are integrity digests, not chain commitments.',
  ];

  const safetyWarnings: string[] = [
    'This output is analysis assistance only. It does not verify, publish, certify, or create legal conclusions.',
  ];
  if (JSON.stringify(ctx).toLowerCase().includes('verified') && !flags.humanVerified) {
    safetyWarnings.push(
      'Context may mention verification language; DPAL still treats human_verified as false unless reviewer data explicitly sets human_verified true.',
    );
  }
  if (flags.evidenceHashPresent && !flags.blockchainAnchored) {
    safetyWarnings.push('An evidence or payload hash is present — that is not proof of blockchain anchoring without chain references.');
  }

  const q = `${question} ${mode}`.toLowerCase();
  const groundedParts: string[] = [];
  if (typeof ctx.reportId === 'string') groundedParts.push(`reportId observed: ${ctx.reportId}`);
  if (typeof ctx.roomId === 'string') groundedParts.push(`roomId observed: ${ctx.roomId}`);
  if (typeof ctx.runId === 'string') groundedParts.push(`runId observed: ${ctx.runId}`);
  if (flags.ledgerStatus) groundedParts.push(`ledger.verificationStatus (imported / user_submitted field): ${flags.ledgerStatus}`);
  if (modulesReferenced.length) groundedParts.push(`module keys referenced in structured data: ${modulesReferenced.join(', ')}`);

  const groundedSummary =
    groundedParts.length > 0
      ? groundedParts.join('\n')
      : 'Limited structured identifiers were present in the merged context; answers stay conservative.';

  let answer =
    'Based only on the structured context supplied to this endpoint: ';
  if (q.includes('missing')) {
    answer += `Missing or not established items include: ${missingEvidence.join(' ')}`;
  } else if (q.includes('provider')) {
    answer +=
      'Provider lanes appear only where Command Center module results or similar structures include providerLanes; otherwise provider coverage is not described here.';
  } else if (q.includes('verified') || q.includes('verification')) {
    answer += flags.humanVerified
      ? 'human_verified is explicitly true somewhere in the supplied context — treat all other checks as still required for your workflow.'
      : 'human_verified is not established as true in the supplied context — do not present this as human-verified or officially verified.';
  } else if (q.includes('blockchain') || q.includes('anchor')) {
    answer += flags.blockchainAnchored
      ? 'blockchain_anchored or equivalent chain reference appears true in supplied context — still confirm transaction details out-of-band when required.'
      : 'blockchain anchoring is not established in the supplied context; an evidence hash alone does not prove anchoring.';
  } else if (q.includes('cannot conclude') || q.includes('not conclude')) {
    answer += `What DPAL can conclude is limited to fields present in context. What DPAL cannot conclude includes: ${cannotConclude.join(' ')}`;
  } else if (q.includes('next step')) {
    answer +=
      'Next steps: attach missing evidence, run the authoritative module workspace for live reads, and route to human review before external claims.';
  } else if (q.includes('validator')) {
    answer +=
      'Validator review should confirm source provenance, date/locations, provider lane errors, limitations text, and that no claim upgrades pending_verification.';
  } else if (q.includes('carbon') || q.includes('viu')) {
    answer +=
      'Carbon or VIU readiness can only be discussed as evidence support and review gates — DPAL does not issue credits or VIUs from this assistant.';
  } else if (q.includes('summarize')) {
    answer += `Grounded summary: ${groundedSummary}`;
  } else {
    answer +=
      'Use the grounded summary and evidenceUsed fields for factual anchors. Ask a targeted follow-up about providers, verification, anchoring, or missing evidence.';
  }

  answer += '\n\nWhat I can conclude: only statements directly supported by non-empty fields in the merged JSON context.';
  answer += '\nWhat I cannot conclude: anything requiring off-context knowledge, legal outcomes, or upgraded verification/anchoring without explicit flags.';

  const recommendedNextSteps: string[] = [
    'Cross-check module headlines and limitations against the authoritative workspace scan you ran.',
    'If this is a Command Center batch, open the module workspace for any lane in error, unavailable, or rate_limited.',
    'Prepare reviewer questions from limitations and missingEvidence.',
  ];

  return {
    answer,
    groundedSummary,
    evidenceUsed,
    missingEvidence,
    cannotConclude,
    recommendedNextSteps,
    safetyWarnings,
    modulesReferenced,
    fallbackUsed: true,
  };
}

type GeminiShape = Partial<
  Omit<ReportReaderChatResponse, 'ok' | 'generatedAt' | 'fallbackUsed'> & { fallbackUsed?: boolean }
>;

function normalizeGemini(parsed: GeminiShape, deterministic: Omit<ReportReaderChatResponse, 'ok' | 'generatedAt'>): ReportReaderChatResponse {
  const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  return {
    ok: true,
    answer: str(parsed.answer, deterministic.answer),
    groundedSummary: str(parsed.groundedSummary, deterministic.groundedSummary),
    evidenceUsed: arr(parsed.evidenceUsed).length ? arr(parsed.evidenceUsed) : deterministic.evidenceUsed,
    missingEvidence: arr(parsed.missingEvidence).length ? arr(parsed.missingEvidence) : deterministic.missingEvidence,
    cannotConclude: arr(parsed.cannotConclude).length ? arr(parsed.cannotConclude) : deterministic.cannotConclude,
    recommendedNextSteps: arr(parsed.recommendedNextSteps).length
      ? arr(parsed.recommendedNextSteps)
      : deterministic.recommendedNextSteps,
    safetyWarnings: arr(parsed.safetyWarnings).length ? arr(parsed.safetyWarnings) : deterministic.safetyWarnings,
    modulesReferenced: arr(parsed.modulesReferenced).length ? arr(parsed.modulesReferenced) : deterministic.modulesReferenced,
    generatedAt: new Date().toISOString(),
    fallbackUsed: false,
  };
}

export async function handleReportReaderChat(body: ReportReaderChatRequest): Promise<ReportReaderChatResponse> {
  const question = String(body.question ?? '').trim();
  const mode: ReportReaderChatMode = body.mode ?? 'report_reader';
  const messages = Array.isArray(body.messages) ? body.messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant')) : [];

  if (!question) {
    const empty = buildDeterministic({ note: 'empty_question' }, '(no question provided)', mode);
    return { ok: true, generatedAt: new Date().toISOString(), ...empty };
  }

  const hydrated = await hydrateReportReaderContext(body);
  const deterministic = buildDeterministic(hydrated, question, mode);

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { ok: true, generatedAt: new Date().toISOString(), ...deterministic };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const sys = `You are DPAL AI Report Reader. Only use CONTEXT_JSON. Never invent providers, dates, locations, statuses, or outcomes.
Never say human-verified unless human_verified is explicitly true in CONTEXT_JSON.
Never say blockchain anchored unless blockchain_anchored is true or a real chain transaction reference exists in CONTEXT_JSON.
Evidence hashes are not blockchain anchoring.
Never issue VIUs, carbon credits, or registry certification. No legal/enforcement/medical/emergency conclusions.
Classify provenance mentally as: observed | calculated | imported | user_submitted | ai_inferred | pending_verification | human_verified | blockchain_anchored — but only attribute what CONTEXT_JSON supports.
Return strict JSON with keys: answer, groundedSummary, evidenceUsed, missingEvidence, cannotConclude, recommendedNextSteps, safetyWarnings, modulesReferenced.`;

    const contextJson = truncateJson({ hydrated, recentMessages: messages.slice(-8), question, mode });
    const prompt = `${sys}\nCONTEXT_JSON:\n${contextJson}\nBASELINE_DETERMINISTIC:\n${JSON.stringify(deterministic)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    } as any);

    const text = String(response.text ?? '').trim();
    const parsed = JSON.parse(text || '{}') as GeminiShape;
    return normalizeGemini(parsed, deterministic);
  } catch {
    return { ok: true, generatedAt: new Date().toISOString(), ...deterministic };
  }
}
