import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Category, type SeverityLevel } from '../types';
import { Loader, Mic, Play, Square, X, MapPin } from './icons';

type Theme = {
  ring: string;
  bg: string;
  title: string;
  subtitle: string;
  buttonPrimary: string;
  buttonSecondary: string;
};

const themeForCategory = (category: Category): Theme => {
  if (category === Category.Allergies) {
    return {
      ring: 'ring-rose-400/30',
      bg: 'bg-gradient-to-br from-rose-950/30 via-[var(--dpal-background-secondary)] to-cyan-950/20',
      title: 'text-rose-200',
      subtitle: 'text-rose-200/70',
      buttonPrimary: 'bg-rose-600 border-rose-400 hover:bg-rose-500',
      buttonSecondary: 'bg-[var(--dpal-background-secondary)] border-[color:var(--dpal-border)] hover:border-[color:var(--dpal-border-strong)]',
    };
  }
  return {
    ring: 'ring-cyan-400/30',
    bg: 'bg-[var(--dpal-background-secondary)]',
    title: 'text-cyan-200',
    subtitle: 'text-cyan-200/60',
    buttonPrimary: 'bg-cyan-600 border-cyan-400 hover:bg-cyan-500',
    buttonSecondary: 'bg-[var(--dpal-background-secondary)] border-[color:var(--dpal-border)] hover:border-[color:var(--dpal-border-strong)]',
  };
};

export interface AudioReportDraft {
  locationText: string;
  severity: SeverityLevel;
  transcript: string;
  audioFile: File;
}

export interface AudioReportModalProps {
  open: boolean;
  category: Category;
  initialLocationText?: string;
  initialSeverity?: SeverityLevel;
  onClose: () => void;
  onSubmit: (draft: AudioReportDraft) => void;
}

const AudioReportModal: React.FC<AudioReportModalProps> = ({
  open,
  category,
  initialLocationText,
  initialSeverity,
  onClose,
  onSubmit,
}) => {
  const t = useMemo(() => themeForCategory(category), [category]);
  const [locationText, setLocationText] = useState(initialLocationText || '');
  const [severity, setSeverity] = useState<SeverityLevel>(initialSeverity || 'Standard');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const sttSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!open) return;
    setLocationText(initialLocationText || '');
    setSeverity(initialSeverity || 'Standard');
    setIsRecording(false);
    setIsPreparing(false);
    setTranscript('');
    setMicError(null);
    setAudioFile(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
      try {
        streamRef.current?.getTracks?.().forEach((tr) => tr.stop());
      } catch {}
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setMicError(null);
    setIsPreparing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        setIsPreparing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          const file = new File([blob], `dpal-audio-${category.toLowerCase()}-${Date.now()}.webm`, {
            type: 'audio/webm',
          });
          setAudioFile(file);
        } finally {
          try {
            stream.getTracks().forEach((tr) => tr.stop());
          } catch {}
          streamRef.current = null;
          setIsPreparing(false);
        }
      };

      mr.start();
      setIsRecording(true);

      if (sttSupported) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const r = new SpeechRecognition();
        r.lang = 'en-US';
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (event: any) => {
          let out = '';
          for (let i = event.resultIndex; i < event.results.length; i++) out += event.results[i][0].transcript;
          setTranscript(out.trim());
        };
        r.onend = () => {};
        recognitionRef.current = r;
        r.start();
      }
    } catch (e: any) {
      const msg = String(e?.message || e || 'Microphone unavailable');
      setMicError(msg);
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    setIsRecording(false);
  };

  const canSubmit = Boolean(audioFile) && locationText.trim().length > 0;

  if (!open) return null;

  return (
    <div className="dpal-modal-backdrop z-[500] p-4">
      <div className={`w-full max-w-2xl rounded-[2.5rem] border border-[color:var(--dpal-border)] shadow-2xl ring-1 ${t.ring} ${t.bg}`}>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${t.subtitle}`}>Report by audio</p>
              <h2 className={`mt-2 text-2xl sm:text-3xl font-black tracking-tighter ${t.title}`}>
                {category === Category.Allergies ? 'Allergy incident' : 'Incident'} voice capture
              </h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest dpal-text-secondary max-w-xl leading-relaxed">
                Hit record. Talk. Stop. Submit. We’ll attach your audio and (if supported) a live transcript.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isRecording) stopRecording();
                onClose();
              }}
              className="p-2 rounded-2xl border border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_70%,transparent)] text-[var(--dpal-text-secondary)] hover:text-white hover:border-[color:var(--dpal-border-strong)]"
              aria-label="Close audio report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-[2rem] border border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_60%,transparent)] p-5 space-y-3">
              <label className="text-[10px] font-black text-cyan-300 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 dpal-text-muted" />
                Location
              </label>
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="w-full dpal-bg-deep border-2 dpal-border-subtle px-4 py-4 rounded-2xl outline-none focus:border-cyan-500 text-white font-black uppercase tracking-widest text-xs"
                placeholder="Address, venue, or lat/lng"
              />
              <p className="text-[9px] font-bold uppercase tracking-widest dpal-text-muted">
                Tip: you can paste coordinates.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_60%,transparent)] p-5 space-y-3">
              <label className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Severity</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Informational', 'Standard', 'Critical', 'Catastrophic'] as SeverityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSeverity(lvl)}
                    className={`py-3 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                      severity === lvl
                        ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                        : 'bg-[var(--dpal-background)] border-[color:var(--dpal-border)] dpal-text-muted hover:border-[color:var(--dpal-border-strong)] hover:text-[var(--dpal-text-secondary)]'
                    }`}
                    aria-pressed={severity === lvl}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest dpal-text-muted">
                Choose the closest match. You can clarify in audio.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[2rem] border border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-background-secondary)_60%,transparent)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--dpal-text-secondary)]">Audio capture</p>
                <p className="text-[9px] font-bold uppercase tracking-widest dpal-text-muted">
                  {isRecording ? 'Recording… keep going.' : audioFile ? 'Ready to submit.' : 'Press record to begin.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) stopRecording();
                    else void startRecording();
                  }}
                  disabled={isPreparing}
                  className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all ${
                    isRecording ? 'bg-rose-600 border-rose-400 text-white' : `${t.buttonPrimary} text-white`
                  } ${isPreparing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isPreparing ? <Loader className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Stop' : 'Record'}
                </button>

                {audioUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = audioElRef.current;
                      if (!el) return;
                      if (el.paused) void el.play();
                      else el.pause();
                    }}
                    className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${t.buttonSecondary} text-[var(--dpal-text-secondary)]`}
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                )}
              </div>
            </div>

            {micError && (
              <div className="mt-3 rounded-2xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-[10px] font-bold text-rose-200">
                Mic error: <span className="font-black">{micError}</span>
              </div>
            )}

            {audioUrl && <audio ref={(r) => (audioElRef.current = r)} src={audioUrl} className="hidden" />}

            <div className="mt-4 grid grid-cols-12 gap-1 h-8 items-end">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full ${isRecording ? 'bg-rose-500/50 animate-pulse' : audioFile ? 'bg-emerald-500/30' : 'bg-[var(--dpal-border-strong)]'}`}
                  style={{ height: `${8 + ((i * 13) % 24)}px` }}
                />
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-overlay-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest dpal-text-secondary">Transcript</p>
                <p className="text-[9px] font-bold uppercase tracking-widest dpal-text-muted">
                  {sttSupported ? 'live (browser)' : 'not supported'}
                </p>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="mt-2 w-full min-h-[90px] dpal-bg-deep border-2 dpal-border-subtle p-4 rounded-2xl text-[11px] font-bold text-white outline-none focus:border-cyan-500 transition-all placeholder:text-[var(--dpal-placeholder)]"
                placeholder="If your browser supports it, your speech will appear here. You can also type."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (isRecording) stopRecording();
                onClose();
              }}
              className="px-6 py-4 rounded-2xl border border-[color:var(--dpal-border)] dpal-bg-deep text-[var(--dpal-text-secondary)] text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-[color:var(--dpal-border-strong)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || isRecording || isPreparing}
              onClick={() => {
                if (!audioFile) return;
                onSubmit({
                  locationText: locationText.trim(),
                  severity,
                  transcript: transcript.trim(),
                  audioFile,
                });
              }}
              className={`px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all ${
                canSubmit && !isRecording && !isPreparing ? `${t.buttonPrimary} text-white` : 'bg-[var(--dpal-panel)] border-[color:var(--dpal-border)] dpal-text-muted opacity-70 cursor-not-allowed'
              }`}
            >
              Submit audio report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioReportModal;

