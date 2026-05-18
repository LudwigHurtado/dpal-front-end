import { Router } from 'express';
import { runDeepAlChat } from '../services/deepalChatService';
import {
  getChatterboxHealthStatus,
  logChatterboxConfigStatus,
  synthesizeDeepAlVoice,
} from '../services/deepalVoiceService';

const router = Router();

router.get('/health', (_req, res) => {
  logChatterboxConfigStatus();
  const chatterbox = getChatterboxHealthStatus();
  res.json({
    ok: true,
    service: 'dpal-assistant',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    ...chatterbox,
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

    const result = await synthesizeDeepAlVoice({
      text,
      workspace: typeof body.workspace === 'string' ? body.workspace : undefined,
      module: typeof body.module === 'string' ? body.module : undefined,
      conversationId: typeof body.conversationId === 'string' ? body.conversationId : undefined,
      messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    });

    if (result.ok) {
      res.status(200).json(result);
      return;
    }

    const status = result.error === 'VALIDATION_ERROR' ? 400 : 503;
    res.status(status).json({
      ok: false,
      error: result.error === 'VALIDATION_ERROR' ? 'VALIDATION_ERROR' : 'VOICE_UNAVAILABLE',
      fallback: result.fallback,
      ...(process.env.DEBUG_VOICE_LOGS === 'true' && result.message ? { message: result.message } : {}),
    });
  } catch (e: unknown) {
    console.warn('[deepal-voice] route error:', e instanceof Error ? e.message : 'unknown');
    res.status(503).json({
      ok: false,
      error: 'VOICE_UNAVAILABLE',
      fallback: 'text-only',
    });
  }
});

export default router;
