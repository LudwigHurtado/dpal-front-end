export type ConversationPhase =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'AUTO_SENDING'
  | 'AI_THINKING'
  | 'GENERATING_VOICE'
  | 'SPEAKING'
  | 'PAUSED'
  | 'ERROR';

export type AssistantInteractionMode = 'manual' | 'conversation';

export type ConversationSettings = {
  autoSendAfterSilenceMs: number;
  minTranscriptLength: number;
  autoSpeakAnswer: boolean;
  reopenMicAfterSpeech: boolean;
  allowBargeIn: boolean;
  pauseMicWhileSpeaking: boolean;
  showSpokenText: boolean;
  showRationaleSummary: boolean;
};

export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  autoSendAfterSilenceMs: 1100,
  minTranscriptLength: 3,
  autoSpeakAnswer: true,
  reopenMicAfterSpeech: true,
  allowBargeIn: true,
  pauseMicWhileSpeaking: true,
  showSpokenText: true,
  showRationaleSummary: true,
};

export type DeepAlChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type DeepAlVoiceStatus = 'pending' | 'ready' | 'unavailable' | 'skipped' | 'playing' | 'failed';

export type DeepAlRationale = {
  userRequest: string;
  detectedIntent: string;
  workspaceModule: string;
  modelProvider: string;
  projectDataConsidered: string;
  missingInformation: string[];
  actionRecommended: string;
  finalAnswer: string;
  spokenText: string;
  voiceStatus: DeepAlVoiceStatus;
};

export type DeepAlChatRequest = {
  question: string;
  messages?: DeepAlChatMessage[];
  context?: string;
  workspace?: string;
  module?: string;
  projectId?: string;
};

export type DeepAlChatResponse = {
  ok: boolean;
  mode: 'live' | 'offline';
  answer: string;
  spokenText: string;
  rationale: DeepAlRationale;
  provider: string;
  error?: string;
};

export type { DeepAlVoiceSynthesizeResponse } from '../../../shared/api/deepalVoiceApi';

export type ConversationUiStatus =
  | 'Ready'
  | 'Listening'
  | 'Transcribing'
  | 'Sending'
  | 'Thinking'
  | 'Generating voice'
  | 'Speaking'
  | 'Paused'
  | 'Error';

export type ConversationTurnResult = {
  userText: string;
  answer: string;
  spokenText: string;
  rationale: DeepAlRationale;
  voiceError?: string | null;
};
