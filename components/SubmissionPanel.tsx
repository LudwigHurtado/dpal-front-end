import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, Report, SeverityLevel } from '../types';
import { 
  MapPin, Send, Loader, Camera, RefreshCw, AlertTriangle, ShieldCheck, Target, Zap, 
  // Added Broadcast, removed non-existent BarChart
  Activity, Info, Briefcase, Database, Scale, Globe, FileText, Trash2, 
  CheckCircle, ChevronLeft, ChevronRight, Maximize2, Clock, Play, Volume2, Paperclip, Plus, X, Sparkles, Broadcast, Mic, Square
} from './icons';
import { FORM_BUNDLE, CATEGORIES_WITH_ICONS } from '../constants';
import { loadGoogleMaps } from '../services/googleMapsLoader';

interface SubmissionPanelProps {
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>, audioUrl?: string) => void;
  preselectedCategory?: Category;
  prefilledDescription?: string;
}

interface AttachedFile {
    file: File;
    preview: string | null;
    type: 'image' | 'video' | 'audio' | 'other';
}

interface UploadTrayItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'ready' | 'failed';
  reason?: string;
}

const STEPS = [
  { id: 'DOMAIN', label: 'Type', icon: <Target className="w-4 h-4"/> },
  { id: 'TEMPORAL', label: 'Location', icon: <Clock className="w-4 h-4"/> },
  { id: 'FORENSIC', label: 'Details', icon: <FileText className="w-4 h-4"/> },
  { id: 'EVIDENCE', label: 'Evidence', icon: <Camera className="w-4 h-4"/> },
  { id: 'SAFETY', label: 'Safety', icon: <ShieldCheck className="w-4 h-4"/> },
  { id: 'COMMIT', label: 'Review', icon: <Database className="w-4 h-4"/> }
];

const ForensicField: React.FC<{ 
    question: any; 
    value: any; 
    onChange: (val: any) => void;
}> = ({ question, value, onChange }) => {
    const { label, help_text, answer_type, options } = question;
    const baseClass = "w-full bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl text-sm font-bold text-white outline-none focus:border-cyan-600 transition-all placeholder:text-zinc-900 shadow-inner";

    switch (answer_type) {
        case 'single_select':
            return (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((opt: string) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => onChange(opt)}
                                className={`px-4 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase text-left truncate ${value === opt ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-700'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 'multi_select':
            return (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {options.map((opt: string) => {
                            const isSel = (value || []).includes(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                        const current = value || [];
                                        onChange(isSel ? current.filter((v: any) => v !== opt) : [...current, opt]);
                                    }}
                                    className={`px-4 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase text-left truncate ${isSel ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-700'}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        case 'datetime':
            return (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
                    <input type="datetime-local" value={value || ''} onChange={e => onChange(e.target.value)} className={baseClass} />
                </div>
            );
        case 'short_text':
            return (
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
                    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={help_text || "Input data..."} />
                </div>
            );
        default:
            return null;
    }
};

const DRAFT_KEY = 'dpal-report-draft-v1';

const SubmissionPanel: React.FC<SubmissionPanelProps> = ({ addReport, preselectedCategory, prefilledDescription }) => {
  // For Accidents & Road Hazards we want to show the first step ("Type") even when
  // the category is already preselected (ReportSubmissionView passes preselectedCategory).
  const [activeStepIndex, setActiveStepIndex] = useState(() => (
    preselectedCategory ? (preselectedCategory === Category.AccidentsRoadHazards ? 0 : 1) : 0
  ));
  const [desktopExpanded, setDesktopExpanded] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1280 : false);
  const [category, setCategory] = useState<Category | ''>(preselectedCategory || '');
  const [severity, setSeverity] = useState<SeverityLevel>('Standard');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [markerKind, setMarkerKind] = useState<'accident' | 'car' | 'deer' | 'tree' | 'health' | 'mountain' | 'warning'>('accident');
  const [description, setDescription] = useState(prefilledDescription || '');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploadTray, setUploadTray] = useState<UploadTrayItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const locationMapDivRef = useRef<HTMLDivElement | null>(null);
  const locationMapRef = useRef<google.maps.Map | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [locationMapStatus, setLocationMapStatus] = useState<'idle' | 'loading' | 'ready' | 'missing_key' | 'error'>('idle');
  const [locationMapErrorDetail, setLocationMapErrorDetail] = useState<string | null>(null);
  const locationMapInitializedRef = useRef(false);

  const schema = useMemo(() => {
    if (!category) return null;
    return FORM_BUNDLE.categories[category] || FORM_BUNDLE.categories['Other'];
  }, [category]);

  const isEscrowCategory = category === Category.P2PEscrowVerification || category === Category.ProofOfLifeBiometric;
  const dictationSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setDesktopExpanded(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.category && !preselectedCategory) setCategory(draft.category);
      if (draft?.severity) setSeverity(draft.severity);
      if (draft?.location) setLocation(draft.location);
      if (draft?.description) setDescription(draft.description);
      if (draft?.answers) setAnswers(draft.answers);
      if (typeof draft?.safetyConfirmed === 'boolean') setSafetyConfirmed(draft.safetyConfirmed);
      if (Array.isArray(draft?.uploadTray)) setUploadTray(draft.uploadTray);
    } catch {
      // ignore corrupted draft
    }
  }, [preselectedCategory]);

  useEffect(() => {
    const payload = {
      category,
      severity,
      location,
      coords,
      markerKind,
      description,
      answers,
      safetyConfirmed,
      uploadTray,
      updatedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [category, severity, location, coords, markerKind, description, answers, safetyConfirmed, uploadTray]);

  useEffect(() => {
    // Preload Google Maps in the background for faster Location step.
    // Uses the same injected script path as Locator.
    if (!category) return;
    if (locationMapStatus === 'ready' || locationMapStatus === 'loading') return;
    void loadGoogleMaps().catch((e: any) => {
      const msg = String(e?.message || e || 'unknown');
      setLocationMapErrorDetail(msg);
      setLocationMapStatus(msg === 'missing_google_maps_key' ? 'missing_key' : 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const markerIconUrl = (kind: typeof markerKind): string => {
    const glyph =
      kind === 'accident' ? '🚨' :
      kind === 'car' ? '🚗' :
      kind === 'deer' ? '🦌' :
      kind === 'tree' ? '🌲' :
      kind === 'health' ? '🏥' :
      kind === 'mountain' ? '⛰️' :
      '⚠️';

    // Simple SVG badge with emoji glyph. Works without extra assets.
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <circle cx="32" cy="32" r="22" fill="#0b1220" stroke="#22d3ee" stroke-width="3" filter="url(#shadow)"/>
  <text x="32" y="38" text-anchor="middle" font-size="22" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji">${glyph}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    // Lazy-load the map only when the Location step is active.
    if (STEPS[activeStepIndex]?.id !== 'TEMPORAL') return;
    if (locationMapStatus === 'loading') return;
    if (!locationMapDivRef.current) return;
    if (locationMapInitializedRef.current) return;

    let cancelled = false;
    const init = async () => {
      setLocationMapStatus('loading');
      setLocationMapErrorDetail(null);
      try {
        await loadGoogleMaps();
        if (cancelled) return;

        const g = (window as any).google as typeof google;
        const center = coords || { lat: 40.7128, lng: -74.006 }; // default NYC

        const map = new g.maps.Map(locationMapDivRef.current!, {
          center,
          zoom: coords ? 15 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        locationMapRef.current = map;

        const marker = new g.maps.Marker({
          map,
          position: center,
          draggable: true,
          icon: {
            url: markerIconUrl(markerKind),
            scaledSize: new g.maps.Size(42, 42),
            anchor: new g.maps.Point(21, 21),
          } as any,
        });
        locationMarkerRef.current = marker;

        const setFromLatLng = (lat: number, lng: number) => {
          const next = { lat, lng };
          setCoords(next);
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        };

        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (!p) return;
          setFromLatLng(p.lat(), p.lng());
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          setFromLatLng(e.latLng.lat(), e.latLng.lng());
        });

        // Places autocomplete binds to the location input by id.
        const input = document.getElementById('report-location-input') as HTMLInputElement | null;
        if (input) {
          const ac = new g.maps.places.Autocomplete(input, {
            fields: ['formatted_address', 'geometry'],
          });
          locationAutocompleteRef.current = ac;
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            const loc = place.geometry?.location;
            if (place.formatted_address) setLocation(place.formatted_address);
            if (loc) {
              const lat = loc.lat();
              const lng = loc.lng();
              const next = { lat, lng };
              marker.setPosition(next);
              map.panTo(next);
              map.setZoom(15);
              setCoords(next);
            }
          });
        }

        locationMapInitializedRef.current = true;
        setLocationMapStatus('ready');
      } catch (e: any) {
        if (cancelled) return;
        const msg = String(e?.message || e || 'unknown');
        setLocationMapErrorDetail(msg);
        setLocationMapStatus(msg === 'missing_google_maps_key' ? 'missing_key' : 'error');
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [activeStepIndex, locationMapStatus]);

  useEffect(() => {
    if (locationMapStatus !== 'ready') return;
    if (!coords || !locationMapRef.current || !locationMarkerRef.current) return;
    locationMarkerRef.current.setPosition(coords);
    locationMapRef.current.panTo(coords);
  }, [coords, locationMapStatus]);

  useEffect(() => {
    if (locationMapStatus !== 'ready') return;
    const g = (window as any).google as typeof google | undefined;
    if (!g || !locationMarkerRef.current) return;
    locationMarkerRef.current.setIcon({
      url: markerIconUrl(markerKind),
      scaledSize: new g.maps.Size(42, 42),
      anchor: new g.maps.Point(21, 21),
    } as any);
  }, [markerKind, locationMapStatus]);

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
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDescription(transcript.trim());
    };

    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
  };

  const fidelityScore = useMemo(() => {
    let score = 0;
    if (category) score += 10;
    if (location) score += 10;
    if (description.length > 50) score += 20;
    if (attachments.length > 0) score += 30;
    if (Object.keys(answers).length >= 3) score += 20;
    if (safetyConfirmed) score += 10;
    return score;
  }, [category, location, description, attachments, answers, safetyConfirmed]);

  const handleNext = () => {
    if (activeStepIndex < STEPS.length - 1) setActiveStepIndex(activeStepIndex + 1);
  };

  const handlePrev = () => {
    if (preselectedCategory && preselectedCategory !== Category.AccidentsRoadHazards && activeStepIndex <= 1) return;
    if (activeStepIndex > 0) setActiveStepIndex(activeStepIndex - 1);
  };

  const startUploadProgress = (id: string, failReason?: string) => {
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + 20);
      setUploadTray((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
      if (progress >= 100) {
        clearInterval(timer);
        setUploadTray((prev) => prev.map((u) => (u.id === id ? { ...u, status: failReason ? 'failed' : 'ready', reason: failReason } : u)));
      }
    }, 180);
  };

  const retryUpload = (id: string) => {
    setUploadTray((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'uploading', reason: undefined, progress: 0 } : u)));
    startUploadProgress(id);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // Explicitly type file as File to resolve unknown type issues
    const pickedFiles = Array.from(files);
    const newAttachments: AttachedFile[] = pickedFiles.map((file: File) => {
        let type: AttachedFile['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        return { file, preview: type === 'image' ? URL.createObjectURL(file) : null, type };
    });
    setAttachments(prev => [...prev, ...newAttachments]);

    const trayItems: UploadTrayItem[] = pickedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name: file.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploadTray((prev) => [...prev, ...trayItems]);
    trayItems.forEach((item, idx) => {
      const file = pickedFiles[idx];
      const failReason = file.size > 12 * 1024 * 1024 ? 'File exceeds 12MB upload reliability threshold.' : undefined;
      startUploadProgress(item.id, failReason);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !safetyConfirmed) return;
    setIsSubmitting(true);
    addReport({
        title: `${isEscrowCategory ? 'Escrow_Receipt' : 'Forensic_Sync'}_${category.toUpperCase()}_${Date.now().toString().slice(-4)}`,
        description,
        category,
        location: location || 'GEO_STAMPED_NODE',
        trustScore: fidelityScore,
        severity,
        isActionable: fidelityScore > 70,
        attachments: attachments.map(a => a.file),
        structuredData: { ...answers, fidelity: fidelityScore, safety_checked: true }
    });
    localStorage.removeItem(DRAFT_KEY);
  };

  const renderStepContent = () => {
    switch (STEPS[activeStepIndex].id) {
      case 'DOMAIN':
        if (category === Category.AccidentsRoadHazards) {
          const typeQuestion = schema?.core_questions?.find((q: any) => q?.id === 'ACC_01');
          const typeOptions: string[] = typeQuestion?.options || [];

          return (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Type</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">
                  What kind of road hazard is it?
                </p>
              </div>

              {typeOptions.length > 0 ? (
                <div className={`grid grid-cols-2 gap-4 overflow-y-auto custom-scrollbar p-2`}>
                  {typeOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, ['ACC_01']: opt }));
                        handleNext();
                      }}
                      className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all ${
                        answers?.ACC_01 === opt
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-2xl scale-105'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-center leading-none">
                        {opt}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-[2rem] bg-zinc-950 border-2 border-zinc-800 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    No type options found for this category.
                  </p>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Report type</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Choose the category that fits your report</p>
            </div>
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${desktopExpanded ? 'xl:grid-cols-4' : ''} gap-4 ${desktopExpanded ? 'max-h-[620px]' : 'max-h-[300px]'} overflow-y-auto custom-scrollbar p-2`}>
              {CATEGORIES_WITH_ICONS.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setCategory(cat.value as Category); handleNext(); }}
                  className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all ${category === cat.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-2xl scale-105' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                >
                  <span className="text-4xl mb-4 grayscale group-hover:grayscale-0">{cat.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-center leading-none">{cat.value}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 'TEMPORAL':
        return (
          <div className="space-y-8 animate-fade-in">
             <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Location</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Where did this happen?</p>
            </div>
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-4">Address or place</label>
                    <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700" />
                        <input id="report-location-input" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-zinc-950 border-2 border-zinc-800 pl-14 pr-6 py-5 rounded-2xl outline-none focus:border-cyan-500 text-white font-black uppercase tracking-widest text-sm shadow-inner" placeholder="Search address or click map to drop a beacon..." />
                    </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-4">Beacon placement</label>
                  <div className="flex flex-wrap gap-2 px-2">
                    {([
                      ['accident', '🚨 Accident'],
                      ['car', '🚗 Car'],
                      ['deer', '🦌 Deer'],
                      ['tree', '🌲 Tree'],
                      ['health', '🏥 Health'],
                      ['mountain', '⛰️ Mountain'],
                      ['warning', '⚠️ Hazard'],
                    ] as const).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setMarkerKind(k)}
                        className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
                          markerKind === k ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                        aria-pressed={markerKind === k}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative rounded-[2rem] overflow-hidden border-2 border-zinc-800 bg-zinc-950 shadow-inner">
                    {locationMapStatus === 'missing_key' ? (
                      <div className="p-6 text-center">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Google Maps API key missing</p>
                        <p className="mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          Set <span className="font-black">VITE_GOOGLE_MAPS_API_KEY</span> in <span className="font-black">.env.local</span> to enable the live map.
                        </p>
                      </div>
                    ) : locationMapStatus === 'error' ? (
                      <div className="p-6 text-center">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Map failed to load</p>
                        <p className="mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Check API key / network, then reload.</p>
                        {locationMapErrorDetail && (
                          <p className="mt-2 text-[10px] text-zinc-600 break-words">Error: <span className="font-black">{locationMapErrorDetail}</span></p>
                        )}
                      </div>
                    ) : (
                      <div ref={locationMapDivRef} className="w-full h-[320px]" />
                    )}

                    {locationMapStatus === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-zinc-700 bg-zinc-950/90 text-zinc-200">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Loading map…</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-2">
                    Tip: click on the map to drop the beacon, then drag to refine.
                  </p>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-4">Severity</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['Informational', 'Standard', 'Critical', 'Catastrophic'].map(lvl => (
                            <button key={lvl} type="button" onClick={() => setSeverity(lvl as SeverityLevel)} className={`py-4 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${severity === lvl ? 'bg-amber-600 border-amber-400 text-white shadow-lg' : 'bg-black border-zinc-900 text-zinc-600'}`}>{lvl}</button>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={handleNext} disabled={!location} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-20 transition-all">Continue</button>
          </div>
        );
      case 'FORENSIC':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">{isEscrowCategory ? 'Transaction details' : 'Details'}</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">{isEscrowCategory ? 'Seller, buyer, item and payment' : 'Describe what happened'}</p>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
               {schema?.core_questions.slice(0, 4).map(q => (
                 <ForensicField key={q.id} question={q} value={answers[q.id]} onChange={v => setAnswers({...answers, [q.id]: v})} />
               ))}
               <div className="space-y-3">
                   <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">Summary</label>
                      <button
                        type="button"
                        onClick={toggleDictation}
                        disabled={!dictationSupported}
                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                          dictationSupported
                            ? (isDictating ? 'bg-rose-600 border-rose-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white')
                            : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
                        }`}
                        aria-label="Voice to text for summary"
                        title={dictationSupported ? (isDictating ? 'Stop voice-to-text' : 'Voice-to-text') : 'Voice input not supported'}
                      >
                        {isDictating ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        Voice
                      </button>
                   </div>
                   <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-zinc-950 border-2 border-zinc-800 p-6 rounded-[2rem] text-sm font-bold text-white outline-none focus:border-cyan-500 transition-all placeholder:text-zinc-900 min-h-[120px] resize-none leading-relaxed" placeholder={isEscrowCategory ? 'Summarize what was sold, by whom, to whom, and what proof you have...' : 'Summarize what happened...'} />
               </div>
            </div>
            <button onClick={handleNext} disabled={description.length < 10} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-20 transition-all">Continue</button>
          </div>
        );
      case 'EVIDENCE':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Evidence</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">{isEscrowCategory ? 'Receipts, photos, screenshots' : 'Photos or videos strengthen your report'}</p>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="py-16 border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-950 flex flex-col items-center justify-center space-y-6 cursor-pointer hover:border-cyan-500/50 hover:bg-zinc-900/50 transition-all group shadow-inner"
            >
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelection} accept="image/*,video/*,audio/*" />
              <div className="p-6 bg-zinc-900 rounded-[2rem] border border-zinc-800 group-hover:border-cyan-900 group-hover:scale-110 transition-all shadow-xl">
                  <Camera className="w-12 h-12 text-zinc-700 group-hover:text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest group-hover:text-cyan-100 transition-colors">Add photos or video</p>
                <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest mt-2">Tap to upload</p>
              </div>
            </div>

            {attachments.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 animate-fade-in">
                    {attachments.map((item, i) => (
                        <div key={i} className="relative aspect-square bg-zinc-950 border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-lg group/item">
                            {item.type === 'image' ? (
                                <img src={item.preview!} alt="P" className="w-full h-full object-cover grayscale opacity-70 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 group-hover/item:text-cyan-500 transition-colors">
                                    {item.type === 'video' ? <Play className="w-6 h-6"/> : <FileText className="w-6 h-6"/>}
                                </div>
                            )}
                            <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1.5 bg-black/80 rounded-lg text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity border border-rose-900/30">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button onClick={handleNext} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Continue</button>
          </div>
        );
      case 'SAFETY':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter text-emerald-400">Safety</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Confirm you are safe to submit</p>
            </div>
            <div 
              onClick={() => setSafetyConfirmed(!safetyConfirmed)}
              className={`p-10 rounded-[3rem] border-4 transition-all duration-300 cursor-pointer flex flex-col items-center space-y-6 shadow-2xl relative overflow-hidden ${safetyConfirmed ? 'bg-emerald-950/20 border-emerald-500' : 'bg-zinc-950 border-zinc-800 border-dashed hover:border-zinc-700'}`}
            >
                <div className={`p-6 rounded-full transition-all duration-500 ${safetyConfirmed ? 'bg-emerald-500 text-black shadow-[0_0_30px_emerald]' : 'bg-zinc-900 text-zinc-700'}`}>
                    <ShieldCheck className="w-12 h-12" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-black text-white uppercase tracking-tighter">{safetyConfirmed ? 'Confirmed' : 'Confirm safety'}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed max-w-[30ch]">I am in a safe place and have avoided direct conflict.</p>
                </div>
                {safetyConfirmed && <div className="absolute top-6 right-6 text-emerald-500 animate-pulse"><Sparkles className="w-6 h-6"/></div>}
            </div>
            <button onClick={handleNext} disabled={!safetyConfirmed} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-20 transition-all">Continue to review</button>
          </div>
        );
      case 'COMMIT':
        return (
          <div className="space-y-10 animate-fade-in pb-8">
            <div className="text-center">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Review</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">{isEscrowCategory ? 'Check your transaction details' : 'Check your report before submitting'}</p>
            </div>

            <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Broadcast className="w-20 h-20 text-cyan-500"/></div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Type</p>
                        <p className="text-sm font-black text-white uppercase">{category}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Location</p>
                        <p className="text-sm font-black text-white uppercase truncate">{location}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Time</p>
                        <p className="text-sm font-black text-white uppercase">Recorded on submit</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Evidence</p>
                        <p className="text-sm font-black text-emerald-500 uppercase">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="pt-6 border-t border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Summary</p>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 italic">"{description}"</p>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-8 rounded-[2.5rem] shadow-3xl transition-all active:scale-95 flex items-center justify-center space-x-4 border-b-8 border-cyan-800 group"
            >
                {isSubmitting ? (
                    <><Loader className="w-8 h-8 animate-spin"/><span className="text-sm uppercase tracking-[0.4em]">Submitting...</span></>
                ) : (
                    <><Database className="w-8 h-8 group-hover:scale-110 transition-transform"/><span className="text-sm uppercase tracking-[0.4em]">Submit report</span></>
                )}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-mono max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 pb-32">
      {/* SIDEBAR: Report progress + How to file a strong report */}
      <aside className="lg:w-72 flex-shrink-0 order-2 lg:order-1">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] sticky top-32 space-y-10 shadow-2xl">
              <div className="space-y-2 mb-8">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Report progress</p>
                  <div className="flex items-end gap-3">
                      <span className="text-4xl font-black tracking-tighter text-white">{fidelityScore}%</span>
                      <div className={`w-3 h-3 rounded-full mb-2 ${fidelityScore > 70 ? 'bg-emerald-500 shadow-[0_0_10px_emerald]' : 'bg-cyan-500'}`}></div>
                  </div>
                  <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 shadow-[0_0_15px_cyan] transition-all duration-1000" style={{ width: `${fidelityScore}%` }}></div>
                  </div>
              </div>

              <div className="space-y-8 relative">
                  <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-zinc-800"></div>
                  {((preselectedCategory && preselectedCategory !== Category.AccidentsRoadHazards) ? STEPS.filter((s) => s.id !== 'DOMAIN') : STEPS).map((step) => {
                      const idx = STEPS.findIndex((s) => s.id === step.id);
                      const isActive = activeStepIndex === idx;
                      const isComplete = activeStepIndex > idx;
                      return (
                          <div key={step.id} className={`relative flex items-center space-x-6 transition-all duration-500 ${idx > activeStepIndex ? 'opacity-20' : 'opacity-100'}`}>
                              <div className={`relative z-10 w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${isComplete ? 'bg-emerald-500 border-emerald-400 text-black' : isActive ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
                                  {isComplete ? <CheckCircle className="w-5 h-5" /> : step.icon}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-500'}`}>{step.label}</span>
                          </div>
                      );
                  })}
              </div>

              <div className="pt-6 border-t border-zinc-800 space-y-4">
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">How to file a strong report</p>
                  <img
                      src="/reports/report-how-to-file-a-report.png"
                      alt=""
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 object-cover"
                      style={{ aspectRatio: '1200/630', maxHeight: '200px' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <ul className="text-[10px] text-zinc-400 space-y-2 list-disc list-inside">
                      <li>Choose the correct report type.</li>
                      <li>Enter the exact location if you can.</li>
                      <li>Describe what happened clearly.</li>
                      <li>Upload photos or other evidence.</li>
                      <li>Review everything before submitting.</li>
                  </ul>
              </div>
          </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex-grow order-1 lg:order-2">
          <form onSubmit={handleSubmit} className="bg-zinc-900/40 border-2 border-zinc-800 rounded-[3rem] md:rounded-[4rem] p-6 md:p-10 lg:p-14 shadow-4xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeStepIndex === 0 || (preselectedCategory && preselectedCategory !== Category.AccidentsRoadHazards && activeStepIndex <= 1)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  aria-label="Back one step"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Step {activeStepIndex + 1} of {STEPS.length}
                  </p>
                  <p className="text-xs font-black uppercase tracking-widest text-white">
                    {STEPS[activeStepIndex]?.label}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeStepIndex >= STEPS.length - 1}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  aria-label="Next step"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6 p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Voice input</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Speak to fill in the description.</p>
                  </div>
                  {dictationSupported ? (
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 self-start md:self-auto ${isDictating ? 'bg-rose-600 border-rose-400 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'}`}
                    >
                      {isDictating ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {isDictating ? 'Stop' : 'Start voice input'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Voice input not supported in this browser</span>
                  )}
              </div>

              <div className="hidden lg:flex justify-end mb-6">
                  <button
                    type="button"
                    onClick={() => setDesktopExpanded(v => !v)}
                    className="px-4 py-2 rounded-xl border border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-cyan-500/50"
                  >
                    {desktopExpanded ? 'Standard Height' : 'Expand Desktop View'}
                  </button>
              </div>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-800">
                  <div className="h-full bg-cyan-600 transition-all duration-1000" style={{ width: `${((activeStepIndex + 1) / STEPS.length) * 100}%` }}></div>
              </div>
              
              <div className={`${desktopExpanded ? 'min-h-[760px]' : 'min-h-[500px]'} flex flex-col justify-start pt-2`}>
                  {renderStepContent()}
              </div>

              {activeStepIndex > 0 && activeStepIndex < STEPS.length - 1 && (
                <div className="mt-12 pt-10 border-t border-zinc-800/50 flex justify-between">
                    <button type="button" onClick={handlePrev} className="px-10 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Back</button>
                    <button type="button" onClick={handleNext} className="px-10 py-4 bg-zinc-900 border border-zinc-700 text-cyan-400 hover:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Skip / Next</button>
                </div>
              )}
          </form>
      </div>

      {uploadTray.length > 0 && (
        <div className="fixed bottom-4 right-4 w-[320px] max-w-[95vw] bg-zinc-950/95 border border-zinc-700 rounded-2xl p-3 z-50 shadow-2xl backdrop-blur sticky">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">Uploads</p>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {uploadTray.map((item) => (
              <div key={item.id} className="border border-zinc-800 rounded-xl p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-300 truncate">{item.name}</p>
                  <span className={`text-[9px] uppercase ${item.status === 'failed' ? 'text-rose-400' : item.status === 'ready' ? 'text-emerald-400' : 'text-cyan-400'}`}>{item.status}</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded mt-2 overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${item.progress}%` }} /></div>
                {item.reason && <p className="text-[9px] text-rose-400 mt-1">{item.reason}</p>}
                {item.status === 'failed' && <button type="button" onClick={() => retryUpload(item.id)} className="text-[9px] mt-1 text-amber-300 underline">Retry</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .animate-scan-y { animation: scanY 3s linear infinite; }
        @keyframes scanY { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
};

export default SubmissionPanel;