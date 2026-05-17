/**
 * Proxies Gemini generateContent to keep GEMINI_API_KEY on the server only.
 * Front end calls POST /api/ai/gemini when VITE_USE_SERVER_AI=true and no VITE_GEMINI_API_KEY.
 */
import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

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

router.get('/status', (_req, res) => {
  const gemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({ ok: true, gemini });
});

router.post('/gemini', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    }
    const { model, contents, config } = req.body ?? {};
    if (contents === undefined) {
      return res.status(400).json({ error: 'Missing contents' });
    }
    const ai = new GoogleGenAI({ apiKey: key });
    let lastError: string | null = null;

    for (const candidate of modelCandidates(typeof model === 'string' ? model : undefined)) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config,
        } as any);
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
