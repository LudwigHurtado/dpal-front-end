/**
 * DeepAL voice — Chatterbox TTS proxy (server-held credentials).
 */

export type DeepAlVoiceSynthesizeRequest = {
  text: string;
  voiceId?: string;
};

export type DeepAlVoiceSynthesizeResult = {
  ok: boolean;
  audioBase64?: string;
  contentType?: string;
  durationMs?: number;
  provider: 'chatterbox' | 'none';
  error?: string;
  reason?: 'not_configured' | 'empty_text' | 'provider_error';
};

function readChatterboxConfig(): { baseUrl: string; apiKey: string; voiceId?: string } | null {
  const baseUrl = (
    process.env.CHATTERBOX_API_URL ??
    process.env.CHATTERBOX_URL ??
    process.env.CHATTERBOX_BASE_URL ??
    process.env.DEEPAL_CHATTERBOX_URL ??
    process.env.DEEPAL_CHATTERBOX_API_URL ??
    ''
  ).trim().replace(/\/+$/, '');
  const apiKey = (
    process.env.CHATTERBOX_API_KEY ??
    process.env.CHATTERBOX_KEY ??
    process.env.DEEPAL_CHATTERBOX_API_KEY ??
    process.env.DEEPAL_CHATTERBOX_KEY ??
    ''
  ).trim();
  const voiceId = (
    process.env.CHATTERBOX_VOICE_ID ??
    process.env.CHATTERBOX_VOICE ??
    process.env.DEEPAL_CHATTERBOX_VOICE_ID ??
    ''
  ).trim();
  if (!baseUrl) return null;
  return { baseUrl, apiKey, voiceId: voiceId || undefined };
}

export async function synthesizeDeepAlVoice(
  req: DeepAlVoiceSynthesizeRequest,
): Promise<DeepAlVoiceSynthesizeResult> {
  const text = req.text?.trim() ?? '';
  if (!text) {
    return {
      ok: false,
      provider: 'none',
      reason: 'empty_text',
      error: 'No text to synthesize.',
    };
  }

  const cfg = readChatterboxConfig();
  if (!cfg) {
    return {
      ok: false,
      provider: 'none',
      reason: 'not_configured',
      error: 'Chatterbox voice is not configured on this API host.',
    };
  }

  const endpoint = `${cfg.baseUrl}/synthesize`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'audio/*,application/json',
  };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        voice_id: req.voiceId ?? cfg.voiceId ?? undefined,
      }),
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as Record<string, unknown>;
      const audioBase64 =
        typeof data.audioBase64 === 'string'
          ? data.audioBase64
          : typeof data.audio_base64 === 'string'
            ? data.audio_base64
            : undefined;
      if (audioBase64) {
        return {
          ok: true,
          audioBase64,
          contentType: typeof data.contentType === 'string' ? data.contentType : 'audio/wav',
          durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
          provider: 'chatterbox',
        };
      }
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
            ? data.message
            : 'Chatterbox returned JSON without audio.';
      return {
        ok: false,
        provider: 'chatterbox',
        reason: 'provider_error',
        error: errMsg,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        ok: false,
        provider: 'chatterbox',
        reason: 'provider_error',
        error: errText || `Chatterbox HTTP ${response.status}`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: true,
      audioBase64: buffer.toString('base64'),
      contentType: contentType || 'audio/wav',
      provider: 'chatterbox',
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'chatterbox',
      reason: 'provider_error',
      error: e instanceof Error ? e.message : 'Chatterbox request failed.',
    };
  }
}

export function isChatterboxConfigured(): boolean {
  return Boolean(readChatterboxConfig());
}
