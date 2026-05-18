/**
 * DeepAL voice — Chatterbox TTS proxy (server-held credentials).
 * API keys never leave this module or appear in HTTP responses.
 */

export type DeepAlVoiceSynthesizeRequest = {
  text: string;
  workspace?: string;
  module?: string;
  conversationId?: string;
  messageId?: string;
};

export type DeepAlVoiceSynthesizeSuccess = {
  ok: true;
  voiceEngine: 'chatterbox';
  audioUrl: string;
  ttsText: string;
  generatedAt: string;
  contentType?: string;
};

export type DeepAlVoiceSynthesizeFailure = {
  ok: false;
  error: 'VOICE_UNAVAILABLE' | 'VALIDATION_ERROR';
  fallback: 'text-only';
  message?: string;
};

export type DeepAlVoiceSynthesizeResult = DeepAlVoiceSynthesizeSuccess | DeepAlVoiceSynthesizeFailure;

export type ChatterboxHealthStatus = {
  chatterboxConfigured: boolean;
  chatterboxUrlConfigured: boolean;
  chatterboxVoiceIdConfigured: boolean;
};

const DEFAULT_VOICE_MAX_CHARS = 2500;

let configLogged = false;

function envTrim(key: string): string {
  return (process.env[key] ?? '').trim();
}

function readChatterboxUrl(): string {
  return (
    envTrim('CHATTERBOX_API_URL') ||
    envTrim('CHATTERBOX_URL') ||
    envTrim('CHATTERBOX_BASE_URL') ||
    envTrim('DEEPAL_CHATTERBOX_URL') ||
    envTrim('DEEPAL_CHATTERBOX_API_URL')
  ).replace(/\/+$/, '');
}

function readChatterboxApiKey(): string {
  return (
    envTrim('CHATTERBOX_API_KEY') ||
    envTrim('CHATTERBOX_KEY') ||
    envTrim('DEEPAL_CHATTERBOX_API_KEY') ||
    envTrim('DEEPAL_CHATTERBOX_KEY')
  );
}

function readChatterboxVoiceId(): string {
  return (
    envTrim('CHATTERBOX_VOICE_ID') ||
    envTrim('CHATTERBOX_VOICE') ||
    envTrim('DEEPAL_CHATTERBOX_VOICE_ID')
  );
}

function voiceMaxChars(): number {
  const raw = envTrim('VOICE_MAX_CHARS');
  if (!raw) return DEFAULT_VOICE_MAX_CHARS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VOICE_MAX_CHARS;
}

function debugVoiceLogs(): boolean {
  return envTrim('DEBUG_VOICE_LOGS').toLowerCase() === 'true';
}

export function getChatterboxHealthStatus(): ChatterboxHealthStatus {
  const url = readChatterboxUrl();
  const voiceId = readChatterboxVoiceId();
  const chatterboxUrlConfigured = Boolean(url);
  return {
    chatterboxConfigured: chatterboxUrlConfigured,
    chatterboxUrlConfigured,
    chatterboxVoiceIdConfigured: Boolean(voiceId),
  };
}

export function isChatterboxConfigured(): boolean {
  return getChatterboxHealthStatus().chatterboxConfigured;
}

/** Safe startup diagnostic — never logs API key or full user text. */
export function logChatterboxConfigStatus(): void {
  if (configLogged) return;
  configLogged = true;
  const { chatterboxUrlConfigured, chatterboxVoiceIdConfigured } = getChatterboxHealthStatus();
  const apiKey = readChatterboxApiKey();
  const apiKeyConfigured = Boolean(apiKey) && apiKey.toLowerCase() !== 'none';
  console.info(
    `[deepal-voice] Chatterbox URL configured: ${chatterboxUrlConfigured}; voice ID configured: ${chatterboxVoiceIdConfigured}; API key configured: ${apiKeyConfigured}`,
  );
}

function voiceUnavailable(message?: string): DeepAlVoiceSynthesizeFailure {
  if (debugVoiceLogs() && message) {
    console.warn('[deepal-voice] synthesis unavailable:', message);
  } else if (!debugVoiceLogs()) {
    console.warn('[deepal-voice] synthesis unavailable (set DEBUG_VOICE_LOGS=true for details)');
  }
  return {
    ok: false,
    error: 'VOICE_UNAVAILABLE',
    fallback: 'text-only',
    ...(debugVoiceLogs() && message ? { message } : {}),
  };
}

function validationError(message: string): DeepAlVoiceSynthesizeFailure {
  return {
    ok: false,
    error: 'VALIDATION_ERROR',
    fallback: 'text-only',
    ...(debugVoiceLogs() ? { message } : {}),
  };
}

function buildAudioDataUrl(contentType: string, audioBase64: string): string {
  return `data:${contentType};base64,${audioBase64}`;
}

function pickAudioFromJson(data: Record<string, unknown>): {
  audioUrl?: string;
  audioBase64?: string;
  contentType: string;
} | null {
  const contentType =
    typeof data.contentType === 'string'
      ? data.contentType
      : typeof data.content_type === 'string'
        ? data.content_type
        : 'audio/wav';

  if (typeof data.audioUrl === 'string' && data.audioUrl.trim()) {
    return { audioUrl: data.audioUrl.trim(), contentType };
  }
  if (typeof data.audio_url === 'string' && data.audio_url.trim()) {
    return { audioUrl: data.audio_url.trim(), contentType };
  }

  const audioBase64 =
    typeof data.audioBase64 === 'string'
      ? data.audioBase64
      : typeof data.audio_base64 === 'string'
        ? data.audio_base64
        : undefined;

  if (audioBase64) {
    return { audioBase64, contentType };
  }

  return null;
}

export async function synthesizeDeepAlVoice(
  req: DeepAlVoiceSynthesizeRequest,
): Promise<DeepAlVoiceSynthesizeResult> {
  logChatterboxConfigStatus();

  const text = req.text?.trim() ?? '';
  if (!text) {
    return validationError('Text is required.');
  }

  const maxChars = voiceMaxChars();
  if (text.length > maxChars) {
    return validationError(`Text exceeds maximum length of ${maxChars} characters.`);
  }

  const baseUrl = readChatterboxUrl();
  if (!baseUrl) {
    return voiceUnavailable('Chatterbox URL is not configured on this API host.');
  }

  const voiceId = readChatterboxVoiceId();
  const apiKey = readChatterboxApiKey();
  const endpoint = `${baseUrl}/synthesize`;
  const generatedAt = new Date().toISOString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'audio/*,application/json',
  };
  if (apiKey && apiKey.toLowerCase() !== 'none') {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const chatterboxBody: Record<string, unknown> = { text };
  if (voiceId) chatterboxBody.voice_id = voiceId;
  if (req.workspace) chatterboxBody.workspace = req.workspace;
  if (req.module) chatterboxBody.module = req.module;
  if (req.conversationId) chatterboxBody.conversation_id = req.conversationId;
  if (req.messageId) chatterboxBody.message_id = req.messageId;

  if (debugVoiceLogs()) {
    console.info(
      `[deepal-voice] synthesize request chars=${text.length} workspace=${req.workspace ?? '-'} module=${req.module ?? '-'}`,
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatterboxBody),
    });

    const contentTypeHeader = response.headers.get('content-type') ?? '';

    if (contentTypeHeader.includes('application/json')) {
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        const errMsg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : `Chatterbox HTTP ${response.status}`;
        return voiceUnavailable(errMsg);
      }

      const audio = pickAudioFromJson(data);
      if (!audio) {
        return voiceUnavailable('Chatterbox returned JSON without audio.');
      }

      const audioUrl =
        audio.audioUrl ??
        (audio.audioBase64 ? buildAudioDataUrl(audio.contentType, audio.audioBase64) : '');

      if (!audioUrl) {
        return voiceUnavailable('Chatterbox returned no playable audio URL.');
      }

      return {
        ok: true,
        voiceEngine: 'chatterbox',
        audioUrl,
        ttsText: text,
        generatedAt,
        contentType: audio.contentType,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return voiceUnavailable(errText || `Chatterbox HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = contentTypeHeader.split(';')[0]?.trim() || 'audio/wav';
    const audioBase64 = buffer.toString('base64');

    return {
      ok: true,
      voiceEngine: 'chatterbox',
      audioUrl: buildAudioDataUrl(mime, audioBase64),
      ttsText: text,
      generatedAt,
      contentType: mime,
    };
  } catch (e: unknown) {
    return voiceUnavailable(e instanceof Error ? e.message : 'Chatterbox request failed.');
  }
}

logChatterboxConfigStatus();
