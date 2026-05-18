import { sendAiGuidance } from '../../services/dpalAiClient';
import { postDeepAlChat } from './api/deepalChatApi';
import type { DeepAlChatMessage, DeepAlRationale } from './conversation/conversationTypes';

export type SendDeepAlMessageOptions = {
  question: string;
  messages?: DeepAlChatMessage[];
  context?: string;
  workspace: string;
  projectId?: string;
  /** Legacy prompt builder when DeepAL route is unavailable. */
  buildLegacyPrompt?: (question: string, history: DeepAlChatMessage[]) => string;
};

export type SendDeepAlMessageResult = {
  answer: string;
  spokenText: string;
  rationale: DeepAlRationale | null;
  usedDeepAlRoute: boolean;
};

export async function sendDeepAlMessage(
  options: SendDeepAlMessageOptions,
): Promise<SendDeepAlMessageResult> {
  const { question, messages = [], context, workspace, projectId, buildLegacyPrompt } = options;

  try {
    const res = await postDeepAlChat({
      question,
      messages,
      context,
      workspace,
      module: workspace,
      projectId,
    });

    if (res.answer?.trim()) {
      return {
        answer: res.answer.trim(),
        spokenText: res.spokenText?.trim() || res.answer.trim(),
        rationale: res.rationale,
        usedDeepAlRoute: true,
      };
    }
  } catch {
    /* fall through to legacy guidance */
  }

  if (buildLegacyPrompt) {
    const prompt = buildLegacyPrompt(question, messages);
    const guidance = await sendAiGuidance({ prompt, context });
    const text =
      guidance.ok && guidance.mode === 'live'
        ? guidance.text.trim()
        : guidance.text.trim() || 'No response from the assistant.';
    return {
      answer: text,
      spokenText: text.slice(0, 600),
      rationale: {
        userRequest: question,
        detectedIntent: 'legacy_guidance',
        workspaceModule: workspace,
        modelProvider: guidance.provider,
        projectDataConsidered: context?.trim()
          ? `Legacy guidance context (${context.length} chars)`
          : 'No context',
        missingInformation: [],
        actionRecommended: text.split(/(?<=[.!?])\s+/)[0] ?? text,
        finalAnswer: text,
        spokenText: text.slice(0, 600),
        voiceStatus: 'unavailable',
      },
      usedDeepAlRoute: false,
    };
  }

  return {
    answer: 'Assistant is temporarily unavailable.',
    spokenText: '',
    rationale: null,
    usedDeepAlRoute: false,
  };
}
