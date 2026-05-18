import { API_ROUTES, apiUrl } from '../../../constants';

export type DeepAlVoiceSynthesizeResponse = {
  ok: boolean;
  audioBase64?: string;
  contentType?: string;
  durationMs?: number;
  provider: string;
  error?: string;
  reason?: string;
};

export async function postDeepAlVoiceSynthesize(
  text: string,
  voiceId?: string,
): Promise<DeepAlVoiceSynthesizeResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      provider: 'none',
      error: 'No text to synthesize.',
      reason: 'empty_text',
    };
  }

  const body: { text: string; voiceId?: string } = { text: trimmed };
  const envVoiceId = import.meta.env.VITE_CHATTERBOX_VOICE_ID?.trim();
  const resolvedVoiceId = voiceId?.trim() || envVoiceId;
  if (resolvedVoiceId) body.voiceId = resolvedVoiceId;

  try {
    const res = await fetch(apiUrl(API_ROUTES.DEEPAL_VOICE_SYNTHESIZE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as DeepAlVoiceSynthesizeResponse;
    return data;
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'none',
      error: e instanceof Error ? e.message : 'Voice synthesis request failed.',
      reason: 'network_error',
    };
  }
}
