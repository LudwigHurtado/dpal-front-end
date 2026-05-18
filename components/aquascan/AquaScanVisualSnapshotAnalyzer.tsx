import React, { useCallback, useId, useState } from 'react';
import { AiError, isAiEnabled, runGeminiWithImagePrompt } from '../../services/geminiService';
import { AiVoiceReplyControls } from '../../src/shared/components/AiVoiceReplyControls';
import { appendVoiceTranscript, VoiceInputButton } from '../../src/shared/components/VoiceInputButton';
import { useAiVoiceAssistant } from '../../src/shared/hooks/useAiVoiceAssistant';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.82;

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Invalid image data URL.');
  }
  return { mimeType: match[1], base64Data: match[2] };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale raster images in-browser so JSON payloads stay under typical API body limits.
 */
async function prepareImageForVision(dataUrl: string): Promise<{ mimeType: string; base64Data: string }> {
  if (typeof document === 'undefined') {
    return parseDataUrl(dataUrl);
  }
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not decode image.'));
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    throw new Error('Image has no dimensions.');
  }
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available in this environment.');
  }
  ctx.drawImage(img, 0, 0, cw, ch);
  const jpegUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return parseDataUrl(jpegUrl);
}

function buildVisionSystemPrompt(workspaceContext: string, userFocus: string): string {
  const focus = userFocus.trim() || 'General interpretation of this map or satellite view for water screening.';
  return `You are assisting an operator using DPAL AquaScan (water MRV screening). They uploaded a screenshot or map snapshot.

Workspace context (numeric indices and metadata — use as supporting context, not as proof of on-the-ground chemistry):
---
${workspaceContext.slice(0, 12000)}
---

Operator question / focus: ${focus}

Your job is to describe what the IMAGE plausibly shows and to separate **visual geometry** from **claims that require field or lab proof**.

Respond with clear sections:

1) **What the image appears to show** — land cover, water bodies, channels, confluences, topography or contours if visible, infrastructure, plumes or color boundaries only if visually credible.

2) **Flow and junction hints (uncertainty explicit)** — If contours or channel shapes are visible, you may discuss *likely* downhill direction or which channel appears wider/mainstem versus tributary. Use language like "appears to", "suggestive geometry", "cannot confirm discharge direction or timing". Never claim measured flow velocity, volume, or legal responsibility.

3) **Contamination, leakage, pollution, deforestation** — Only note these if there are **specific visible cues** (e.g., obvious pipe, unnatural color plume aligned with outfall, large bare patch). Otherwise state that these cannot be confirmed from a static image and require sampling, lab analysis, or multi-temporal satellite products.

4) **Limits of a single snapshot** — Remind that one image cannot prove contamination, leakage, or water chemistry; it can prioritize where to look next.

5) **Recommended next evidence** — e.g., field photos, grab sample, lab panel, second date, higher resolution imagery, hydrology map layers.

Keep the tone professional and cautious. Do not invent facility names or incidents not visible.`;
}

export type AquaScanVisualSnapshotAnalyzerProps = {
  workspaceContextText: string;
  variant?: 'full' | 'compact';
};

export default function AquaScanVisualSnapshotAnalyzer({
  workspaceContextText,
  variant = 'full',
}: AquaScanVisualSnapshotAnalyzerProps): React.ReactElement {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userFocus, setUserFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState('');
  const voice = useAiVoiceAssistant();

  const clearImage = useCallback(() => {
    setPreviewUrl(null);
    setReading('');
    setError(null);
  }, []);

  const setImageFromDataUrl = useCallback(async (dataUrl: string) => {
    setError(null);
    setReading('');
    try {
      const prepared = await prepareImageForVision(dataUrl);
      const rebuilt = `data:${prepared.mimeType};base64,${prepared.base64Data}`;
      setPreviewUrl(rebuilt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process image.');
      setPreviewUrl(null);
    }
  }, []);

  const ingestImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Choose an image file (PNG, JPEG, or WebP).');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const raw = await readFileAsDataUrl(file);
        await setImageFromDataUrl(raw);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setBusy(false);
      }
    },
    [setImageFromDataUrl],
  );

  const onFileInput = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;
      void ingestImageFile(file);
    },
    [ingestImageFile],
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const f = item.getAsFile();
          if (f) void ingestImageFile(f);
          return;
        }
      }
    },
    [ingestImageFile],
  );

  const runAnalysis = useCallback(async () => {
    if (!previewUrl) {
      setError('Add a map screenshot first (upload or paste).');
      return;
    }
    if (!isAiEnabled()) {
      setError('AI is not configured. Set VITE_GEMINI_API_KEY or VITE_USE_SERVER_AI with GEMINI_API_KEY on your API host.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { mimeType, base64Data } = parseDataUrl(previewUrl);
      const prompt = buildVisionSystemPrompt(workspaceContextText || '(No workspace summary yet.)', userFocus);
      const text = await runGeminiWithImagePrompt(prompt, [{ mimeType, base64Data }]);
      const reply = text.trim() || 'No text returned from the model.';
      voice.speakReply(reply);
      setReading(reply);
    } catch (e) {
      const msg =
        e instanceof AiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Analysis failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [previewUrl, userFocus, workspaceContextText, voice]);

  const boxClass =
    variant === 'compact'
      ? 'mt-2 rounded-lg border border-teal-500/30 bg-teal-950/15 p-2.5'
      : 'mt-4 rounded-xl border border-teal-500/35 bg-teal-950/15 p-4';

  return (
    <div className={boxClass} onPaste={onPaste} tabIndex={0} role="region" aria-label="Visual snapshot reading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`font-black uppercase tracking-[0.18em] text-teal-200 ${variant === 'compact' ? 'text-[9px]' : 'text-[11px]'}`}>
          Visual snapshot reading
        </p>
        <span className={`rounded-full border border-slate-600 px-2 py-0.5 text-slate-400 ${variant === 'compact' ? 'text-[8px]' : 'text-[10px]'}`}>
          Gemini vision
        </span>
      </div>
      <p className={`mt-1.5 text-slate-400 ${variant === 'compact' ? 'text-[9px] leading-snug' : 'text-[11px]'}`}>
        Capture the map (for example Windows Snipping Tool or Win+Shift+S), then paste here or upload. The model reads visible channels, topography hints, and AOI overlays — not field-verified flow or chemistry.
      </p>
      <div className={`mt-2 flex flex-wrap items-center gap-2 ${variant === 'compact' ? '' : 'gap-3'}`}>
        <label htmlFor={inputId} className="cursor-pointer rounded-lg border border-teal-500/40 bg-teal-900/25 px-3 py-1.5 text-xs font-semibold text-teal-100 hover:bg-teal-900/40">
          Upload screenshot
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onFileInput(e.target.files);
            e.target.value = '';
          }}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={clearImage}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
          >
            Clear image
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || !previewUrl}
          onClick={() => {
            void runAnalysis();
          }}
          className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Analyzing…' : 'Analyze snapshot'}
        </button>
      </div>
      <label className={`mt-2 block ${variant === 'compact' ? 'text-[9px]' : 'text-xs'}`}>
        <span className="text-slate-500">Optional focus (e.g. &quot;Is Waterhole Canyon flowing into the river?&quot;)</span>
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <input
            value={userFocus}
            onChange={(e) => setUserFocus(e.target.value)}
            placeholder="What should the model look for?"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-500/60"
          />
          <VoiceInputButton
            onTranscript={(t) => setUserFocus((prev) => appendVoiceTranscript(prev, t))}
            disabled={busy}
            label="Speak"
          />
        </div>
      </label>
      {previewUrl ? (
        <div className={`mt-2 overflow-hidden rounded-lg border border-slate-700 bg-black/40 ${variant === 'compact' ? 'max-h-28' : 'max-h-56'}`}>
          <img src={previewUrl} alt="Map snapshot preview" className="mx-auto max-h-56 w-auto object-contain" />
        </div>
      ) : (
        <p className={`mt-2 rounded border border-dashed border-slate-700 px-2 py-2 text-slate-500 ${variant === 'compact' ? 'text-[9px]' : 'text-[11px]'}`}>
          Click this panel and paste (Ctrl+V) after copying a screenshot, or use Upload.
        </p>
      )}
      {error ? (
        <p className={`mt-2 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-100 ${variant === 'compact' ? 'px-2 py-1 text-[9px]' : 'px-3 py-2 text-xs'}`}>
          {error}
        </p>
      ) : null}
      <AiVoiceReplyControls
        className="mt-2"
        replyText={reading}
        autoSpeak={voice.autoSpeak}
        onAutoSpeakChange={voice.setAutoSpeak}
        isSpeaking={voice.isSpeaking}
        isGeneratingVoice={voice.isGeneratingVoice}
        speak={voice.speak}
        stopSpeaking={voice.stopSpeaking}
        ttsSupported={voice.ttsSupported}
        ttsUnsupportedMessage={voice.ttsUnsupportedMessage}
      />
      {reading ? (
        <div className={`mt-2 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-200 ${variant === 'compact' ? 'max-h-48 overflow-y-auto p-2 text-[9px] leading-relaxed' : 'max-h-[28rem] overflow-y-auto p-3 text-xs leading-relaxed'}`}>
          <p className={`mb-1 font-semibold text-teal-200 ${variant === 'compact' ? 'text-[9px]' : 'text-[11px]'}`}>Reading</p>
          <div className="whitespace-pre-wrap">{reading}</div>
        </div>
      ) : null}
      <p className={`mt-2 text-amber-100/90 ${variant === 'compact' ? 'text-[8px]' : 'text-[10px]'}`}>
        Indicative visual interpretation only. Not a certified hydrology or environmental assessment. Pair with AquaScan index results, dates, and field or lab evidence.
      </p>
    </div>
  );
}
