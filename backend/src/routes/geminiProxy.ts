/**
 * Proxies Gemini generateContent to keep GEMINI_API_KEY on the server only.
 * Front end calls POST /api/ai/gemini when VITE_USE_SERVER_AI=true and no VITE_GEMINI_API_KEY.
 */
import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const OFFLINE_GUIDANCE_TEXT =
  'Live AI guidance is temporarily unavailable. DPAL is showing offline guidance using current project context.';

function modelCandidates(requested?: string): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const chain = [requested, fromEnv, DEFAULT_GEMINI_MODEL, 'gemini-2.0-flash'].filter(
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

function readGeminiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? '';
}

function buildHealthPayload() {
  const configured = Boolean(readGeminiKey());
  if (!configured) {
    return {
      ok: false,
      configured: false,
      provider: 'gemini' as const,
      mode: 'server' as const,
      missing: ['GEMINI_API_KEY'],
    };
  }
  return {
    ok: true,
    configured: true,
    provider: 'gemini' as const,
    mode: 'server' as const,
    missing: [] as string[],
  };
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
      if (!isModelUnavailableError(msg)) {
        throw e;
      }
      console.warn('[api/ai/gemini] model unavailable, trying fallback:', candidate, msg);
    }
  }

  throw Object.assign(new Error(lastError || 'All Gemini model candidates failed'), {
    code: 'AI_PROVIDER_UNAVAILABLE',
  });
}

router.get('/health', (_req, res) => {
  res.json(buildHealthPayload());
});

router.get('/status', (_req, res) => {
  const { configured } = buildHealthPayload();
  res.json({ ok: true, gemini: configured });
});

router.post('/guidance', async (req, res) => {
  const { prompt, model } = req.body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: OFFLINE_GUIDANCE_TEXT,
      error: { code: 'AI_EMPTY_PROMPT', message: 'Missing prompt' },
    });
  }

  if (!readGeminiKey()) {
    return res.json({
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: OFFLINE_GUIDANCE_TEXT,
      error: {
        code: 'AI_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY not configured on server',
      },
    });
  }

  try {
    const text = await runGeminiText(prompt.trim(), typeof model === 'string' ? model : undefined);
    return res.json({
      ok: true,
      mode: 'live',
      provider: 'gemini',
      text,
      suggestions: [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e && typeof e === 'object' && 'code' in e && typeof (e as { code: string }).code === 'string'
        ? (e as { code: string }).code
        : 'AI_PROVIDER_UNAVAILABLE';
    console.error('[api/ai/guidance]', msg);
    return res.json({
      ok: false,
      mode: 'offline',
      provider: 'gemini',
      text: OFFLINE_GUIDANCE_TEXT,
      error: {
        code,
        message: 'Gemini could not be reached.',
      },
    });
  }
});

router.post('/gemini', async (req, res) => {
  try {
    const { model, contents, config } = req.body ?? {};
    if (contents === undefined) {
      return res.status(400).json({ error: 'Missing contents' });
    }

    if (!readGeminiKey()) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const ai = new GoogleGenAI({ apiKey: readGeminiKey() });
    let lastError: string | null = null;

    for (const candidate of modelCandidates(typeof model === 'string' ? model : undefined)) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config,
        } as Parameters<GoogleGenAI['models']['generateContent']>[0]);
        return res.json({ text: response.text ?? '' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        lastError = msg;
        if (!isModelUnavailableError(msg)) {
          throw e;
        }
        console.warn('[api/ai/gemini] model unavailable, trying fallback:', candidate, msg);
      }
    }

    return res.status(500).json({
      error: lastError || 'All Gemini model candidates failed',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/ai/gemini]', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
