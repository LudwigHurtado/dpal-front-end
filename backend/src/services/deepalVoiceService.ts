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
  /** True when GET {CHATTERBOX_API_URL}/health succeeds. */
  chatterboxReachable?: boolean;
  chatterboxUpstreamStatus?: number | null;
  chatterboxUpstreamService?: string | null;
  chatterboxUpstreamHint?: string;
  /** Hostname only — helps debug wiring without exposing secrets or full URL. */
  chatterboxUpstreamHost?: string | null;
};

const DEFAULT_VOICE_MAX_CHARS = 2500;
const DEFAULT_CHATTERBOX_PROBE_MS = 8_000;
const DEFAULT_CHATTERBOX_SYNTHESIZE_MS = 120_000;

let configLogged = false;

function envTrim(key: string): string {
  return (process.env[key] ?? '').trim();
}

function normalizeChatterboxBaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/synthesize\/?$/i, '')
    .replace(/\/+$/, '');
}

function readChatterboxUrl(): string {
  const raw =
    envTrim('CHATTERBOX_API_URL') ||
    envTrim('CHATTERBOX_URL') ||
    envTrim('CHATTERBOX_BASE_URL') ||
    envTrim('DEEPAL_CHATTERBOX_URL') ||
    envTrim('DEEPAL_CHATTERBOX_API_URL');
  return normalizeChatterboxBaseUrl(raw);
}

function chatterboxProbeTimeoutMs(): number {
  const n = Number.parseInt(envTrim('CHATTERBOX_PROBE_TIMEOUT_MS'), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CHATTERBOX_PROBE_MS;
}

function chatterboxSynthesizeTimeoutMs(): number {
  const n = Number.parseInt(envTrim('CHATTERBOX_FETCH_TIMEOUT_MS'), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CHATTERBOX_SYNTHESIZE_MS;
}

function buildChatterboxAuthHeaders(): Record<string, string> {
  const apiKey = readChatterboxApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, audio/*',
  };
  if (apiKey && apiKey.toLowerCase() !== 'none') {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
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

function chatterboxUpstreamHost(): string | null {
  const url = readChatterboxUrl();
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return 'invalid-url';
  }
}

export function getChatterboxHealthStatus(): ChatterboxHealthStatus {
  const url = readChatterboxUrl();
  const voiceId = readChatterboxVoiceId();
  const chatterboxUrlConfigured = Boolean(url);
  return {
    chatterboxConfigured: chatterboxUrlConfigured,
    chatterboxUrlConfigured,
    chatterboxVoiceIdConfigured: Boolean(voiceId),
    chatterboxUpstreamHost: chatterboxUpstreamHost(),
  };
}

export function isChatterboxConfigured(): boolean {
  return getChatterboxHealthStatus().chatterboxConfigured;
}

/** Ping the Chatterbox TTS host (GET /health). Does not log secrets. */
export async function probeChatterboxUpstream(): Promise<{
  reachable: boolean;
  status: number | null;
  service: string | null;
  error: string | null;
}> {
  const baseUrl = readChatterboxUrl();
  if (!baseUrl) {
    return { reachable: false, status: null, service: null, error: 'not_configured' };
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: buildChatterboxAuthHeaders(),
      signal: AbortSignal.timeout(chatterboxProbeTimeoutMs()),
    });
    if (!response.ok) {
      return {
        reachable: false,
        status: response.status,
        service: null,
        error: `upstream_http_${response.status}`,
      };
    }
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const service = typeof data.service === 'string' ? data.service : null;
    return {
      reachable: true,
      status: response.status,
      service,
      error: null,
    };
  } catch (e: unknown) {
    return {
      reachable: false,
      status: null,
      service: null,
      error: e instanceof Error ? e.message : 'upstream_unreachable',
    };
  }
}

export async function getChatterboxHealthStatusAsync(): Promise<ChatterboxHealthStatus> {
  const base = getChatterboxHealthStatus();
  if (!base.chatterboxUrlConfigured) {
    return { ...base, chatterboxReachable: false, chatterboxUpstreamStatus: null };
  }
  const probe = await probeChatterboxUpstream();
  const hint = probe.reachable
    ? 'Chatterbox TTS upstream is online.'
    : probe.error === 'not_configured'
      ? 'Set CHATTERBOX_API_URL to your Python TTS service (services/chatterbox-tts-service), not the Vercel front-end.'
      : `Chatterbox upstream not ready (${probe.error ?? 'unreachable'}). If Railway shows Deploying, wait until Active.`;
  return {
    ...base,
    chatterboxReachable: probe.reachable,
    chatterboxUpstreamStatus: probe.status,
    chatterboxUpstreamService: probe.service,
    chatterboxUpstreamHint: hint,
  };
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
  if (message) {
    console.warn('[deepal-voice] synthesis unavailable:', message);
  }
  return {
    ok: false,
    error: 'VOICE_UNAVAILABLE',
    fallback: 'text-only',
    ...(message ? { message } : {}),
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

function resolveAudioUrl(audioUrl: string, chatterboxBaseUrl: string): string {
  const trimmed = audioUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('/')) return `${chatterboxBaseUrl}${trimmed}`;
  return trimmed;
}

function pickAudioFromJson(
  data: Record<string, unknown>,
  chatterboxBaseUrl: string,
): {
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
    return { audioUrl: resolveAudioUrl(data.audioUrl, chatterboxBaseUrl), contentType };
  }
  if (typeof data.audio_url === 'string' && data.audio_url.trim()) {
    return { audioUrl: resolveAudioUrl(data.audio_url, chatterboxBaseUrl), contentType };
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
  const endpoint = `${baseUrl}/synthesize`;
  const generatedAt = new Date().toISOString();

  const headers = buildChatterboxAuthHeaders();

  const chatterboxBody: Record<string, unknown> = { text };
  if (voiceId) {
    chatterboxBody.voice_id = voiceId;
    chatterboxBody.voice = voiceId;
  }
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
      signal: AbortSignal.timeout(chatterboxSynthesizeTimeoutMs()),
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

      const audio = pickAudioFromJson(data, baseUrl);
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
