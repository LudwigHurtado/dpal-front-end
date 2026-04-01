/**
 * OpenAI helpers for Politician Transparency — Search & Discover + Evidence workspace.
 * In dev, Vite proxies `/openai-proxy` so the key can stay server-side (see vite.config.ts).
 * In production, calls api.openai.com directly with VITE_OPENAI_API_KEY (may hit CORS; use a backend proxy if needed).
 */

const MODEL = () => import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

export function isPoliticianOpenAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY?.trim());
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function chatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; responseFormatJson?: boolean }
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL(),
    messages,
    temperature: opts?.temperature ?? 0.35,
  };
  if (opts?.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const devProxy = import.meta.env.DEV;
  const url = devProxy
    ? '/openai-proxy/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!devProxy) {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI is not configured. Add VITE_OPENAI_API_KEY to your environment.');
    headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg || `OpenAI error (${res.status})`);
  }

  const data = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('Empty response from OpenAI.');
  return out;
}

/** Single-line DuckDuckGo-oriented query from user text + chips. */
export async function refinePoliticianSearchQuery(input: {
  query: string;
  issueChips: string[];
  misconductChips: string[];
}): Promise<string> {
  const chipLine = [...input.issueChips, ...input.misconductChips].filter(Boolean).join('; ');
  const system = `You help civic researchers build effective web search queries for public information: elected officials, votes, ethics, misconduct, campaign finance, and government records.
Output ONLY the search query string — no quotes, no explanation, max 400 characters. Prefer concrete names, offices, jurisdictions, and years when inferable. You may include site: filters like site:.gov when helpful.`;

  const user = `User typed: ${input.query.trim() || '(empty)'}
Selected topic tags: ${chipLine || '(none)'}`;

  const raw = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.25 }
  );
  return raw.replace(/\s+/g, ' ').trim().slice(0, 400);
}

export type EvidenceAiDraft = {
  saidText: string;
  didText: string;
  proofNote: string;
};

/** Structured draft from rough notes — user must verify all facts. */
export async function suggestEvidenceDraftFromNotes(input: {
  subjectName: string;
  proofNote: string;
  timelineNote: string;
  userHint: string;
}): Promise<EvidenceAiDraft> {
  const system = `You help users draft a neutral "Said vs Did" accountability summary for a public figure.
Return ONLY valid JSON with keys: saidText, didText, proofNote (all strings).
Rules:
- saidText: what was claimed or promised (quote-style if user gave quotes; otherwise paraphrase clearly).
- didText: what the public record shows (votes, actions, outcomes) — do not invent; use placeholders like "[add source]" if unknown.
- proofNote: brief respectful context (who/when/where) merging timeline hints.
- Never fabricate specific dates, vote counts, or URLs. If information is missing, say so briefly in proofNote.
- Keep each field under 1200 characters.`;

  const user = `Subject: ${input.subjectName.trim() || 'Unknown'}
User notes / context: ${input.proofNote.trim() || '(none)'}
Timeline hints: ${input.timelineNote.trim() || '(none)'}
User instructions for this draft: ${input.userHint.trim() || 'Structure my notes into said vs did.'}`;

  const raw = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.35, responseFormatJson: true }
  );

  let parsed: Partial<EvidenceAiDraft>;
  try {
    parsed = JSON.parse(raw) as Partial<EvidenceAiDraft>;
  } catch {
    throw new Error('Could not parse AI response as JSON.');
  }

  return {
    saidText: typeof parsed.saidText === 'string' ? parsed.saidText : '',
    didText: typeof parsed.didText === 'string' ? parsed.didText : '',
    proofNote: typeof parsed.proofNote === 'string' ? parsed.proofNote : '',
  };
}
