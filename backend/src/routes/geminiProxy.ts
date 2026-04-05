/**
 * Proxies Gemini generateContent to keep GEMINI_API_KEY on the server only.
 * Front end calls POST /api/ai/gemini when VITE_USE_SERVER_AI=true and no VITE_GEMINI_API_KEY.
 */
import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

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
    if (!model || contents === undefined) {
      return res.status(400).json({ error: 'Missing model or contents' });
    }
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    } as any);
    res.json({ text: response.text ?? '' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/ai/gemini]', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
