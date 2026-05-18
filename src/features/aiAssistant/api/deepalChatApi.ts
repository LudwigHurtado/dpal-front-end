import { API_ROUTES, apiUrl } from '../../../../constants';
import type { DeepAlChatRequest, DeepAlChatResponse } from '../conversation/conversationTypes';

export async function postDeepAlChat(req: DeepAlChatRequest): Promise<DeepAlChatResponse> {
  const res = await fetch(apiUrl(API_ROUTES.DEEPAL_CHAT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const data = (await res.json().catch(() => ({}))) as DeepAlChatResponse & { error?: string };

  if (!res.ok) {
    return {
      ok: false,
      mode: 'offline',
      answer: data.answer ?? data.error ?? `DeepAL chat failed (${res.status}).`,
      spokenText: data.spokenText ?? '',
      rationale: data.rationale ?? {
        userRequest: req.question,
        detectedIntent: 'general_assistance',
        workspaceModule: req.workspace ?? req.module ?? 'dpal_workspace',
        modelProvider: 'none',
        projectDataConsidered: '',
        missingInformation: [],
        actionRecommended: '',
        finalAnswer: data.error ?? 'Request failed.',
        spokenText: '',
        voiceStatus: 'unavailable',
      },
      provider: 'none',
      error: data.error ?? `HTTP ${res.status}`,
    };
  }

  return data;
}
