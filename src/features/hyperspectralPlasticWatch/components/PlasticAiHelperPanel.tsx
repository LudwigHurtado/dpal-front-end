import React, { useCallback, useState } from 'react';
import { Bot } from '../../../../components/icons';
import { isAiEnabled, runGeminiPrompt } from '../../../../services/geminiService';
import { AiVoiceReplyControls } from '../../../shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../../shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../../shared/hooks/useAiVoiceAssistant';
import { getPlasticMissionType, type PlasticMissionTypeId } from '../data/plasticMissionTypes';
import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';
import { buildPlasticWatchReportBrief, briefToPromptContext } from '../utils/plasticWatchReportBrief';

const DEFAULT_MESSAGE =
  'Start by choosing the plastic mission type. Then draw the area you want DPAL to scan. I will recommend the satellite stack, explain scan readiness, and help you generate an evidence packet.';

type Props = {
  missionTypeId: PlasticMissionTypeId;
  scan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
  hasSavedAoi: boolean;
};

const QUICK_ACTIONS: { id: string; label: string; prompt: string }[] = [
  { id: 'explain', label: 'Explain this page', prompt: 'Explain the DPAL Plastic Watch workflow in plain English for a first-time operator.' },
  { id: 'stack', label: 'Recommend satellite stack', prompt: 'Recommend the satellite stack for this mission type and explain what each source can and cannot prove.' },
  { id: 'draw', label: 'What should I draw?', prompt: 'What should I draw on the map for this mission type? How tight should the polygon be?' },
  { id: 'result', label: 'What does this result mean?', prompt: 'Explain the current scan result using honest language about candidate plastic-risk zones.' },
  { id: 'investor', label: 'Generate investor explanation', prompt: 'Write a short investor-safe explanation of this plastic watch mission without overstating certainty.' },
  { id: 'field', label: 'Generate field validation checklist', prompt: 'List field validation steps needed before any plastic attribution claim.' },
];

export function PlasticAiHelperPanel({ missionTypeId, scan, evidence, hasSavedAoi }: Props): React.ReactElement {
  const mission = getPlasticMissionType(missionTypeId);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const voice = useAiVoiceAssistant();

  const runHelper = useCallback(
    async (userPrompt: string) => {
      const context = scan
        ? briefToPromptContext(buildPlasticWatchReportBrief(scan, evidence))
        : `Mission: ${mission.title}. AOI saved: ${hasSavedAoi}. ${mission.helperFocus}`;

      if (!isAiEnabled()) {
        setMessage(
          `${mission.helperFocus} ${hasSavedAoi ? 'AOI is saved — check satellite readiness, then run scan.' : 'Draw and save a polygon on the map first.'} AI enrichment requires VITE_USE_SERVER_AI or VITE_GEMINI_API_KEY.`,
        );
        return;
      }

      setBusy(true);
      try {
        const text = await runGeminiPrompt(
          `You are the DPAL Plastic Watch AI Helper. Be honest: never claim confirmed plastic from satellites alone. Use "candidate plastic-risk zone" language.\n\nContext:\n${context}\n\nUser request: ${userPrompt}`,
        );
        const reply = text.trim() || 'No response from AI helper.';
        voice.speakReply(reply);
        setMessage(reply);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'AI helper unavailable — use the workflow steps on the left.');
      } finally {
        setBusy(false);
      }
    },
    [evidence, hasSavedAoi, mission.helperFocus, mission.title, scan, voice],
  );

  React.useEffect(() => {
    setMessage(
      `${DEFAULT_MESSAGE} ${mission.helperFocus} Recommended stack: ${mission.recommendedStack.slice(0, 2).join('; ')}…`,
    );
  }, [missionTypeId, mission.helperFocus, mission.recommendedStack]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <HelperHeader />
      <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-[11px] leading-relaxed text-slate-800">{message}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={busy}
            onClick={() => void runHelper(action.prompt)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) void runHelper(input.trim());
          }}
          placeholder="Ask the Plastic Watch helper…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        />
        <VoiceInputButton
          onTranscript={(t) => setInput((prev) => appendVoiceTranscript(prev, t))}
          disabled={busy}
          label="Speak"
        />
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() => void runHelper(input.trim())}
          className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Ask
        </button>
      </div>
      <AiVoiceReplyControls
        className="mt-2"
        replyText={message}
        autoSpeak={voice.autoSpeak}
        onAutoSpeakChange={voice.setAutoSpeak}
        isSpeaking={voice.isSpeaking}
        speak={voice.speak}
        stopSpeaking={voice.stopSpeaking}
        ttsSupported={voice.ttsSupported}
        ttsUnsupportedMessage={voice.ttsUnsupportedMessage}
      />
      {!isAiEnabled() ? (
        <p className="mt-2 text-[10px] text-slate-500">AI helper uses rule-based fallbacks when Gemini is not configured.</p>
      ) : null}
    </div>
  );
}

function HelperHeader() {
  return (
    <div className="flex items-center gap-2">
      <Bot className="h-5 w-5 text-sky-800" />
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Plastic Watch AI Helper</h2>
        <p className="text-[10px] text-slate-600">Guided assistance — not automated claims or dispatch.</p>
      </div>
    </div>
  );
}
