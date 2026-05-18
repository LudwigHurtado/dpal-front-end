import { Router } from 'express';
import { runDeepAlChat } from '../services/deepalChatService';
import { isChatterboxConfigured, synthesizeDeepAlVoice } from '../services/deepalVoiceService';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'dpal-assistant',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    chatterboxConfigured: isChatterboxConfigured(),
  });
});

router.post('/chat', async (req, res) => {
  try {
    const body = req.body ?? {};
    const question = typeof body.question === 'string' ? body.question : '';
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (m: unknown) =>
              m &&
              typeof m === 'object' &&
              (m as { role?: string }).role &&
              typeof (m as { text?: string }).text === 'string',
          )
          .map((m: { role: string; text: string }) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            text: String(m.text),
          }))
      : undefined;

    const result = await runDeepAlChat({
      question,
      messages,
      context: typeof body.context === 'string' ? body.context : undefined,
      workspace: typeof body.workspace === 'string' ? body.workspace : undefined,
      module: typeof body.module === 'string' ? body.module : undefined,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    });

    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : 'DPAL Assistant chat failed.',
    });
  }
});

router.post('/voice/synthesize', async (req, res) => {
  try {
    const body = req.body ?? {};
    const text = typeof body.text === 'string' ? body.text : '';
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId : undefined;
    const result = await synthesizeDeepAlVoice({ text, voiceId });
    res.status(result.ok ? 200 : 503).json(result);
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      provider: 'none',
      error: e instanceof Error ? e.message : 'Voice synthesis failed.',
    });
  }
});

export default router;
