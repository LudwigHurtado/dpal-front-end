import { API_ROUTES, apiUrl } from '../../../constants';

export type DeepAlVoiceSynthesizeResponse =
  | {
      ok: true;
      voiceEngine: 'chatterbox';
      audioUrl: string;
      ttsText: string;
      generatedAt: string;
      contentType?: string;
    }
  | {
      ok: false;
      error: string;
      fallback?: 'text-only';
      message?: string;
    };

export type DeepAlVoiceSynthesizeOptions = {
  workspace?: string;
  module?: string;
  conversationId?: string;
  messageId?: string;
  signal?: AbortSignal;
  /** Client-side wait before giving up (default 25000ms). */
  timeoutMs?: number;
};

const DEFAULT_CLIENT_TIMEOUT_MS = 120_000;

export async function postDeepAlVoiceSynthesize(
  text: string,
  options: DeepAlVoiceSynthesizeOptions = {},
): Promise<DeepAlVoiceSynthesizeResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'VALIDATION_ERROR',
      fallback: 'text-only',
      message: 'No text to synthesize.',
    };
  }

  const body: Record<string, string> = { text: trimmed };
  if (options.workspace) body.workspace = options.workspace;
  if (options.module) body.module = options.module;
  if (options.conversationId) body.conversationId = options.conversationId;
  if (options.messageId) body.messageId = options.messageId;

  const timeoutMs = options.timeoutMs ?? DEFAULT_CLIENT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        error: 'VOICE_UNAVAILABLE',
        fallback: 'text-only',
        message: 'Voice request cancelled.',
      };
    }
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(apiUrl(API_ROUTES.DEEPAL_VOICE_SYNTHESIZE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as DeepAlVoiceSynthesizeResponse &
      Record<string, unknown>;

    if (data.ok === true) {
      const audioUrl =
        typeof data.audioUrl === 'string' && data.audioUrl.trim()
          ? data.audioUrl.trim()
          : resolveVoiceAudioUrl(data);
      if (audioUrl) {
        return {
          ok: true,
          voiceEngine: 'chatterbox',
          audioUrl,
          ttsText: typeof data.ttsText === 'string' ? data.ttsText : trimmed,
          generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
          contentType:
            typeof data.contentType === 'string'
              ? data.contentType
              : typeof data.content_type === 'string'
                ? data.content_type
                : undefined,
        };
      }
      return {
        ok: false,
        error: 'VOICE_UNAVAILABLE',
        fallback: 'text-only',
        message: 'Chatterbox returned ok without a playable audioUrl.',
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : 'VOICE_UNAVAILABLE',
        fallback: data.fallback === 'text-only' ? 'text-only' : 'text-only',
        message:
          typeof data.message === 'string' ? data.message : `Voice API HTTP ${res.status}`,
      };
    }

    return {
      ok: false,
      error: 'VOICE_UNAVAILABLE',
      fallback: 'text-only',
      message: 'Unexpected voice API response.',
    };
  } catch (e: unknown) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      ok: false,
      error: 'VOICE_UNAVAILABLE',
      fallback: 'text-only',
      message: aborted
        ? 'Chatterbox is still loading — using browser voice.'
        : e instanceof Error
          ? e.message
          : 'Voice synthesis request failed.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Resolve playable audio URL from API response (prefers audioUrl; supports legacy base64 fields). */
export function resolveVoiceAudioUrl(data: Record<string, unknown>): string | null {
  if (typeof data.audioUrl === 'string' && data.audioUrl.trim()) {
    return data.audioUrl.trim();
  }
  const b64 =
    typeof data.audioBase64 === 'string'
      ? data.audioBase64
      : typeof data.audio_base64 === 'string'
        ? data.audio_base64
        : null;
  if (!b64) return null;
  const mime =
    typeof data.contentType === 'string'
      ? data.contentType
      : typeof data.content_type === 'string'
        ? data.content_type
        : 'audio/wav';
  return `data:${mime};base64,${b64}`;
}
