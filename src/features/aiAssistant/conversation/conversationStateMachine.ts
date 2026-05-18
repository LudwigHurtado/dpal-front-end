import type { ConversationPhase, ConversationUiStatus } from './conversationTypes';

export const CONVERSATION_PHASE_LABEL: Record<ConversationPhase, ConversationUiStatus> = {
  IDLE: 'Ready',
  LISTENING: 'Listening',
  TRANSCRIBING: 'Transcribing',
  AUTO_SENDING: 'Sending',
  AI_THINKING: 'Thinking',
  GENERATING_VOICE: 'Generating voice',
  SPEAKING: 'Speaking',
  PAUSED: 'Paused',
  ERROR: 'Error',
};

export function phaseToUiStatus(phase: ConversationPhase): ConversationUiStatus {
  return CONVERSATION_PHASE_LABEL[phase];
}

export function isConversationStartable(phase: ConversationPhase): boolean {
  return phase === 'IDLE' || phase === 'PAUSED' || phase === 'ERROR';
}

export function isListeningPhase(phase: ConversationPhase): boolean {
  return phase === 'LISTENING' || phase === 'TRANSCRIBING';
}

export function isBusyPhase(phase: ConversationPhase): boolean {
  return (
    phase === 'AUTO_SENDING' ||
    phase === 'AI_THINKING' ||
    phase === 'GENERATING_VOICE' ||
    phase === 'SPEAKING'
  );
}

export function shouldSuppressAutoSend(phase: ConversationPhase): boolean {
  return (
    phase === 'SPEAKING' ||
    phase === 'GENERATING_VOICE' ||
    phase === 'AI_THINKING' ||
    phase === 'AUTO_SENDING' ||
    phase === 'PAUSED'
  );
}

export function transitionOnStart(): ConversationPhase {
  return 'LISTENING';
}

export function transitionOnSilenceDetected(current: ConversationPhase): ConversationPhase | null {
  if (current === 'LISTENING' || current === 'TRANSCRIBING') return 'AUTO_SENDING';
  return null;
}

export function transitionOnSendStart(): ConversationPhase {
  return 'AI_THINKING';
}

export function transitionOnAnswerReady(autoSpeak: boolean): ConversationPhase {
  return autoSpeak ? 'GENERATING_VOICE' : 'LISTENING';
}

export function transitionOnVoiceStart(): ConversationPhase {
  return 'SPEAKING';
}

export function transitionOnVoiceEnd(reopenMic: boolean): ConversationPhase {
  return reopenMic ? 'LISTENING' : 'IDLE';
}

export function transitionOnBargeIn(): ConversationPhase {
  return 'LISTENING';
}

export function transitionOnPause(): ConversationPhase {
  return 'PAUSED';
}

export function transitionOnStop(): ConversationPhase {
  return 'IDLE';
}

export function transitionOnError(): ConversationPhase {
  return 'ERROR';
}
