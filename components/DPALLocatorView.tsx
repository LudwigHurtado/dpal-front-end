import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '../i18n';
import type { Report } from '../types';
import { Category } from '../types';
import { ArrowLeft, Search, Upload, MapPin, Mic, Info } from './icons';

type LocatorMode = 'person' | 'pet' | 'item';

type VerificationLevel = 'Unverified' | 'Community-Verified' | 'Official';

export interface LocatorEntry {
  id: string;
  mode: LocatorMode;
  description: string;
  lastSeen: string;
  locationText: string;
  coords?: { lat: number; lng: number };
  createdAt: number;
  verification: VerificationLevel;
  photoDataUrl?: string;
}

const STORAGE_KEY = 'dpal-locator-entries-v1';

const modeMeta: Record<LocatorMode, { label: string; iconSrc: string; accent: string }> = {
  person: { label: 'Find Person', iconSrc: '/locator/icon-person.png', accent: 'from-blue-600/40 to-blue-400/10' },
  pet: { label: 'Find Pet', iconSrc: '/locator/icon-pet.png', accent: 'from-emerald-600/40 to-emerald-400/10' },
  item: { label: 'Find Item', iconSrc: '/locator/icon-item.png', accent: 'from-amber-600/40 to-amber-400/10' },
};

interface DPALLocatorViewProps {
  onReturn: () => void;
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
}

const DPALLocatorView: React.FC<DPALLocatorViewProps> = ({ onReturn, addReport }) => {
  const { t } = useTranslations();
  const [mode, setMode] = useState<LocatorMode>('person');
  const [description, setDescription] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dictationSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [entries, setEntries] = useState<LocatorEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  }, [entries]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoDataUrl(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(photoFile);
  }, [photoFile]);

  const toggleDictation = () => {
    if (!dictationSupported) return;

    if (isDictating) {
      recognitionRef.current?.stop?.();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setDescription(transcript.trim());
    };
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
  };

  const captureGeolocation = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device/browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setError('Could not get your location. Please allow permissions or enter location manually.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const canSubmit = useMemo(() => {
    if (!description.trim()) return false;
    if (!lastSeen.trim()) return false;
    if (!locationText.trim() && !coords) return false;
    return true;
  }, [description, lastSeen, locationText, coords]);

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Please complete Description, Last Seen, and Location.');
      return;
    }
    setIsSubmitting(true);
    try {
      const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: LocatorEntry = {
        id,
        mode,
        description: description.trim(),
        lastSeen: lastSeen.trim(),
        locationText: locationText.trim(),
        coords,
        createdAt: Date.now(),
        verification: 'Unverified',
        photoDataUrl,
      };
      setEntries((prev) => [entry, ...prev].slice(0, 50));

      const title = `Locator: ${mode === 'person' ? 'Person' : mode === 'pet' ? 'Pet' : 'Item'}`;
      const finalLocation = locationText.trim() || (coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Unknown');
      const reportDescription = [
        `DPAL Locator submission (${mode.toUpperCase()}).`,
        '',
        `Description: ${entry.description}`,
        `Last seen: ${entry.lastSeen}`,
        `Location: ${finalLocation}`,
        coords ? `GPS: ${coords.lat}, ${coords.lng}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');

      addReport({
        title,
        description: reportDescription,
        category: Category.Other,
        location: finalLocation,
        trustScore: 70,
        severity: 'Standard',
        isActionable: true,
        attachments: photoFile ? [photoFile] : undefined,
        imageUrls: photoDataUrl ? [photoDataUrl] : undefined,
        isAuthor: true,
      });

      setDescription('');
      setLastSeen('');
      setLocationText('');
      setCoords(undefined);
      setPhotoFile(null);
      setPhotoDataUrl(undefined);
      if (isDictating) toggleDictation();
    } catch {
      setError('Submit failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeIconSrc = modeMeta[mode].iconSrc;

  return (
    <div className="animate-fade-in relative min-h-[calc(100vh-6rem)] pb-24">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-top"
        style={{ backgroundImage: `url('/tokens/dpal-locator-ui.png')` }}
      />
      <div className="absolute inset-0 -z-10 bg-black/55" />

      <div className="max-w-6xl mx-auto px-4 font-sans">
        <button
          onClick={onReturn}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/80 hover:text-cyan-200 transition-colors pt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return</span>
        </button>

        <div className="pt-8 pb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Decentralized Person, Pets, & Assets Locator
          </h1>
          <p className="mt-1 text-sm text-white/80 font-semibold">
            Locate Lost People, Pets & Items
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <div
              className="rounded-3xl shadow-2xl overflow-hidden"
              style={{ backgroundImage: `url('/locator/panel-form.png')`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
            >
              <div className="px-5 py-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['person', 'pet', 'item'] as LocatorMode[]).map((m) => {
                    const active = m === mode;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm shadow-sm border transition-all ${
                          active
                            ? 'bg-gradient-to-b from-blue-800 to-blue-700 text-white border-blue-900/40'
                            : 'bg-white/90 text-slate-800 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <img src={modeMeta[m].iconSrc} alt="" className="w-6 h-6" draggable={false} />
                        <span className="hidden sm:inline">{modeMeta[m].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-slate-700 font-extrabold text-sm">Enter Details Below:</div>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-700">Description / Photo Upload</div>
                      <div className="text-[11px] text-slate-500">Add a short description and optional photo.</div>
                    </div>
                    <label className="text-[11px] font-black px-3 py-2 rounded-xl bg-slate-900 text-white cursor-pointer hover:bg-slate-800">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder={`Describe the ${mode}...`}
                      className="md:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                    <div className="md:col-span-1">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden h-[110px] flex items-center justify-center">
                        {photoDataUrl ? (
                          <img src={photoDataUrl} alt="Upload preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[11px] text-slate-500 font-semibold">No photo</div>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={captureGeolocation}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-700 hover:bg-slate-200"
                        >
                          <MapPin className="w-4 h-4" />
                          Add Your Location
                        </button>
                        <button
                          type="button"
                          onClick={toggleDictation}
                          disabled={!dictationSupported}
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-black ${
                            !dictationSupported
                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isDictating
                              ? 'bg-blue-800 border-blue-900 text-white'
                              : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                          {isDictating ? 'Listening…' : 'Voice to Text'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <Search className="w-5 h-5 text-slate-500" />
                    <div className="text-xs font-bold text-slate-700">Location Information</div>
                  </div>
                  <div className="p-4">
                    <input
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="City / neighborhood / address landmark..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{coords ? `GPS captured: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'GPS not captured yet'}</span>
                      <button
                        type="button"
                        onClick={() => setCoords(undefined)}
                        className="font-black text-slate-600 hover:text-slate-900"
                      >
                        Clear GPS
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <Info className="w-5 h-5 text-slate-500" />
                    <div className="text-xs font-bold text-slate-700">Last Seen</div>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={lastSeen}
                      onChange={(e) => setLastSeen(e.target.value)}
                      rows={3}
                      placeholder="Enter last seen location & details"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-semibold">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canSubmit}
                  className={`w-full rounded-2xl font-extrabold text-white text-lg shadow-xl transition-all relative overflow-hidden ${
                    isSubmitting || !canSubmit ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.99]'
                  }`}
                  style={{ height: 64, backgroundImage: `url('/locator/btn-submit.png')`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
                >
                  <span className="sr-only">{isSubmitting ? 'Submitting…' : 'Submit Report'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div
              className="rounded-3xl shadow-2xl overflow-hidden"
              style={{ backgroundImage: `url('/locator/panel-map.png')`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-b ${modeMeta[mode].accent} border border-black/10 flex items-center justify-center`}>
                    <img src={modeIconSrc} alt="" className="w-6 h-6" draggable={false} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Live Map Preview</div>
                    <div className="text-[11px] text-slate-500">Pins appear after GPS capture.</div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="relative h-[260px] rounded-3xl bg-white/70 border border-slate-200 overflow-hidden">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.25),transparent_45%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
                  {coords ? (
                    <>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/40 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-blue-700 drop-shadow" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 border border-slate-200 px-4 py-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Pinned Location</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {locationText.trim() ? locationText.trim() : `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <MapPin className="w-10 h-10 text-slate-400 mb-3" />
                      <div className="text-sm font-extrabold text-slate-700">No pin yet</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Tap <span className="font-black">Add Your Location</span> to drop a pin.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/90 backdrop-blur-md shadow-2xl border border-white/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/10">
                <div className="text-sm font-extrabold text-slate-900">Recent Locator Reports</div>
                <div className="text-[11px] text-slate-500">Saved locally + also submitted into your DPAL report feed.</div>
              </div>
              <div className="max-h-[280px] overflow-auto">
                {entries.length === 0 ? (
                  <div className="p-6 text-center text-[11px] text-slate-500 font-semibold">No locator entries yet.</div>
                ) : (
                  entries.slice(0, 10).map((e) => (
                    <div key={e.id} className="px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900">
                            {e.mode === 'person' ? 'Person' : e.mode === 'pet' ? 'Pet' : 'Item'} ·{' '}
                            {new Date(e.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {e.locationText || (e.coords ? `${e.coords.lat.toFixed(3)}, ${e.coords.lng.toFixed(3)}` : 'Unknown')}
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full border border-slate-200 text-slate-600 bg-slate-50">
                          {e.verification}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-700 line-clamp-2">{e.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DPALLocatorView;

