import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Report } from '../types';
import { Category } from '../types';
import { ArrowLeft, MapPin, Mic, Search, Upload } from './icons';
import { loadGoogleMaps } from '../services/googleMapsLoader';

type LocatorMode = 'find' | 'report';
type LocatorType = 'person' | 'pet' | 'item';

type MarkerStyle = {
  fill: string;
  stroke: string;
  glyph: string;
};

const markerStyle = (mode: LocatorMode, type: LocatorType): MarkerStyle => {
  const color =
    type === 'person' ? '#3b82f6' : type === 'pet' ? '#10b981' : '#f59e0b';
  const fill = mode === 'report' ? color : 'transparent';
  const stroke = color;
  const glyph = mode === 'report' ? '●' : '○';
  return { fill, stroke, glyph };
};

const TYPE_META: Record<LocatorType, { label: string; iconSrc: string }> = {
  person: { label: 'Person', iconSrc: '/locator/icon-person.png' },
  pet: { label: 'Pet', iconSrc: '/locator/icon-pet.png' },
  item: { label: 'Item', iconSrc: '/locator/icon-item.png' },
};

interface LocatorPageProps {
  onReturn: () => void;
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
}

const LocatorPage: React.FC<LocatorPageProps> = ({ onReturn, addReport }) => {
  const [mode, setMode] = useState<LocatorMode>('find');
  const [type, setType] = useState<LocatorType>('person');

  const [titleOrDescription, setTitleOrDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dateTime, setDateTime] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [lastSeenOrFoundAt, setLastSeenOrFoundAt] = useState('');
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [safeNow, setSafeNow] = useState<boolean | null>(null);
  const [useBlockchain, setUseBlockchain] = useState(true);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const dictationSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'missing_key' | 'error'>('idle');
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    const urls: string[] = [];
    const readers = photoFiles.map(
      (f) =>
        new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
          r.readAsDataURL(f);
        })
    );
    void Promise.all(readers).then((results) => {
      results.forEach((u) => u && urls.push(u));
      setPhotoPreviews(urls);
    });
  }, [photoFiles]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!mapDivRef.current) return;
      setMapStatus('loading');
      try {
        await loadGoogleMaps();
        if (cancelled) return;

        const center = coords || { lat: 40.7128, lng: -74.006 }; // default NYC
        const map = new google.maps.Map(mapDivRef.current, {
          center,
          zoom: coords ? 14 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
          map,
          position: center,
          draggable: true,
        });
        markerRef.current = marker;

        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (!p) return;
          setCoords({ lat: p.lat(), lng: p.lng() });
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(next);
          setCoords(next);
        });

        // Autocomplete binds to the input by id.
        const input = document.getElementById('locator-location-input') as HTMLInputElement | null;
        if (input) {
          const ac = new google.maps.places.Autocomplete(input, {
            fields: ['formatted_address', 'geometry'],
          });
          autocompleteRef.current = ac;
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            const loc = place.geometry?.location;
            if (place.formatted_address) setLocationText(place.formatted_address);
            if (loc) {
              const next = { lat: loc.lat(), lng: loc.lng() };
              marker.setPosition(next);
              map.panTo(next);
              map.setZoom(14);
              setCoords(next);
            }
          });
        }

        setMapStatus('ready');
      } catch (e: any) {
        if (cancelled) return;
        setMapStatus(e?.message === 'missing_google_maps_key' ? 'missing_key' : 'error');
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !coords) return;
    markerRef.current.setPosition(coords);
    mapRef.current.panTo(coords);
  }, [coords]);

  useEffect(() => {
    // Update marker styling by mode/type
    if (!markerRef.current) return;
    const s = markerStyle(mode, type);
    markerRef.current.setIcon({
      path: google?.maps?.SymbolPath?.CIRCLE ?? 0,
      fillColor: s.fill === 'transparent' ? '#00000000' : s.fill,
      fillOpacity: s.fill === 'transparent' ? 0 : 1,
      strokeColor: s.stroke,
      strokeOpacity: 1,
      strokeWeight: 3,
      scale: 10,
    } as any);
  }, [mode, type, mapStatus]);

  const toggleDictation = () => {
    if (!dictationSupported) return;
    if (isDictating) {
      recognitionRef.current?.stop?.();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setNotes(transcript.trim());
    };
    r.onend = () => setIsDictating(false);
    r.onerror = () => setIsDictating(false);
    recognitionRef.current = r;
    r.start();
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
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
      },
      () => setError('Could not get your location. Please allow permissions or enter location manually.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const canSubmit = useMemo(() => {
    if (!titleOrDescription.trim()) return false;
    if (!locationText.trim() && !coords) return false;
    if (!dateTime) return false;
    if (mode === 'find' && !lastSeenOrFoundAt.trim()) return false;
    if (mode === 'report' && !lastSeenOrFoundAt.trim()) return false;
    return true;
  }, [titleOrDescription, locationText, coords, dateTime, mode, lastSeenOrFoundAt]);

  const submitLabel = mode === 'find' ? 'Search & Locate' : useBlockchain ? 'Submit Report to Blockchain' : 'Submit Report';

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Please complete the required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const finalLocation = locationText.trim() || (coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Unknown');
      const header = mode === 'find' ? 'FIND' : 'REPORT';
      const typeLabel = TYPE_META[type].label;
      const reportTitle = `Locator ${header}: ${typeLabel}`;

      const bodyLines = [
        `DPAL Locator (${header})`,
        `Type: ${typeLabel}`,
        `Title/Description: ${titleOrDescription.trim()}`,
        `Location: ${finalLocation}`,
        coords ? `GPS: ${coords.lat}, ${coords.lng}` : undefined,
        `Date/Time: ${dateTime}`,
        mode === 'find' ? `Last seen: ${lastSeenOrFoundAt.trim()}` : `Found at: ${lastSeenOrFoundAt.trim()}`,
        mode === 'find' ? `Search radius: ${searchRadiusKm} km` : undefined,
        mode === 'report' ? `Safe now: ${safeNow === null ? 'Unknown' : safeNow ? 'Yes' : 'No'}` : undefined,
        `Notes: ${notes.trim() || '(none)'}`,
        `Blockchain anchor requested: ${useBlockchain ? 'Yes' : 'No'}`,
      ].filter(Boolean);

      addReport({
        title: reportTitle,
        description: bodyLines.join('\n'),
        category: Category.Other,
        location: finalLocation,
        trustScore: 70,
        severity: 'Standard',
        isActionable: true,
        attachments: photoFiles.length ? photoFiles : undefined,
        imageUrls: photoPreviews.length ? photoPreviews : undefined,
        isAuthor: true,
      });

      // Reset minimal fields; keep mode/type selection.
      setTitleOrDescription('');
      setNotes('');
      setLocationText('');
      setCoords(null);
      setLastSeenOrFoundAt('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSafeNow(null);
    } catch {
      setError('Submit failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      {/* HERO / VISUAL BANNER */}
      <section className="relative w-full overflow-hidden rounded-[36px] shadow-2xl bg-zinc-950 border border-zinc-800">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/tokens/dpal-locator-ui.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60" />

        <div className="relative px-6 py-10 md:px-10 md:py-14 text-center">
          <button
            onClick={onReturn}
            className="absolute left-6 top-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/80 hover:text-cyan-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return</span>
          </button>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Displaced Persons, Pets & Assets Locator
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/85 font-semibold max-w-3xl mx-auto">
            Community-powered locating, reporting, and recovery — with AI matching and optional blockchain proof.
          </p>
        </div>

        <div className="relative h-[220px] md:h-[320px]" aria-hidden="true" />
      </section>

      {/* ACTION SELECTOR */}
      <section className="mt-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setMode('find')}
              className={`py-4 rounded-full font-extrabold text-lg shadow-lg border transition-all ${
                mode === 'find'
                  ? 'bg-white text-zinc-950 border-white/70'
                  : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600'
              }`}
            >
              Find
            </button>
            <button
              type="button"
              onClick={() => setMode('report')}
              className={`py-4 rounded-full font-extrabold text-lg shadow-lg border transition-all ${
                mode === 'report'
                  ? 'bg-white text-zinc-950 border-white/70'
                  : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600'
              }`}
            >
              Report
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mt-5">
            {(['person', 'pet', 'item'] as LocatorType[]).map((k) => {
              const active = k === type;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={`rounded-3xl border shadow-sm px-4 py-4 transition-all bg-zinc-950 ${
                    active ? 'border-cyan-400/70 ring-2 ring-cyan-400/20' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <img
                      src={TYPE_META[k].iconSrc}
                      alt=""
                      className="w-14 h-14 md:w-16 md:h-16"
                      draggable={false}
                    />
                    <div className="mt-2 text-white font-extrabold tracking-tight">{TYPE_META[k].label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="mt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            {/* FORM PANEL */}
            <div className="lg:col-span-3">
              <div className="relative rounded-[32px] overflow-hidden shadow-xl min-h-[680px]">
                <img
                  src="/locator/panel-form.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
                <div className="relative z-10 p-6 lg:p-8">
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/90 text-zinc-900 border border-zinc-200">
                      Mode: {mode === 'find' ? 'Find' : 'Report'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/90 text-zinc-900 border border-zinc-200">
                      Type: {TYPE_META[type].label}
                    </span>
                  </div>

                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">
                    {mode === 'find' ? 'Name or short description' : 'What did you find?'}
                  </label>
                  <input
                    value={titleOrDescription}
                    onChange={(e) => setTitleOrDescription(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                    placeholder={mode === 'find' ? 'e.g., “Orange tabby cat with blue collar”' : 'e.g., “Found keys with red lanyard”'}
                  />

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">Details / notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                        placeholder="Add identifying details, condition, clothing, collar, markings, etc."
                      />
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          onClick={captureGeolocation}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/90 border border-zinc-200 text-sm font-extrabold text-zinc-900 hover:bg-white"
                        >
                          <MapPin className="w-4 h-4" />
                          Use current location
                        </button>
                        <button
                          type="button"
                          onClick={toggleDictation}
                          disabled={!dictationSupported}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm font-extrabold ${
                            !dictationSupported
                              ? 'bg-white/60 border-zinc-200 text-zinc-400 cursor-not-allowed'
                              : isDictating
                              ? 'bg-zinc-950 border-zinc-950 text-white'
                              : 'bg-white/90 border-zinc-200 text-zinc-900 hover:bg-white'
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                          {isDictating ? 'Listening…' : 'Voice-to-text'}
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">Photos</label>
                      <label className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/90 border border-zinc-200 text-sm font-extrabold text-zinc-900 cursor-pointer hover:bg-white">
                        <Upload className="w-4 h-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                        />
                      </label>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {photoPreviews.slice(0, 6).map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            className="w-full h-16 object-cover rounded-xl border border-zinc-200"
                            draggable={false}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">Location (search or paste address)</label>
                    <input
                      id="locator-location-input"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                      placeholder="Search address…"
                    />
                    <div className="mt-2 text-[11px] text-zinc-600">
                      {coords ? `Selected GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'No GPS selected yet (click the map or use current location).'}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">Date / time</label>
                      <input
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">
                        {mode === 'find' ? 'Last seen location / details' : 'Found at location / details'}
                      </label>
                      <input
                        value={lastSeenOrFoundAt}
                        onChange={(e) => setLastSeenOrFoundAt(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                        placeholder={mode === 'find' ? 'e.g., “Near Oak St park entrance”' : 'e.g., “Outside 22 Main St”'}
                      />
                    </div>
                  </div>

                  {mode === 'find' && (
                    <div className="mt-6">
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-700">Search radius (km)</label>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={searchRadiusKm}
                        onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                        className="mt-2 w-full"
                      />
                      <div className="text-[11px] text-zinc-600 mt-1">{searchRadiusKm} km</div>
                    </div>
                  )}

                  {mode === 'report' && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-700">Safe now?</span>
                        <button
                          type="button"
                          onClick={() => setSafeNow(true)}
                          className={`px-4 py-2 rounded-2xl text-sm font-extrabold border ${
                            safeNow === true ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white/90 text-zinc-900 border-zinc-200'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setSafeNow(false)}
                          className={`px-4 py-2 rounded-2xl text-sm font-extrabold border ${
                            safeNow === false ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white/90 text-zinc-900 border-zinc-200'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      <label className="flex items-center gap-3 justify-start md:justify-end text-sm font-extrabold text-zinc-900">
                        <input type="checkbox" checked={useBlockchain} onChange={(e) => setUseBlockchain(e.target.checked)} />
                        Anchor hash to blockchain
                      </label>
                    </div>
                  )}

                  {error && (
                    <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-semibold">
                      {error}
                    </div>
                  )}

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !canSubmit}
                      className={`relative w-full max-w-xl mx-auto block transition-all ${
                        isSubmitting || !canSubmit ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.99]'
                      }`}
                    >
                      <img src="/locator/btn-submit.png" alt="" className="w-full h-auto select-none" draggable={false} />
                      <span className="absolute inset-0 flex items-center justify-center font-extrabold text-white text-lg md:text-xl drop-shadow">
                        {isSubmitting ? 'Working…' : submitLabel}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MAP PANEL */}
            <div className="lg:col-span-2">
              <div className="relative rounded-[32px] overflow-hidden shadow-xl bg-white min-h-[680px] border border-zinc-200">
                <div className="absolute inset-0">
                  {mapStatus === 'missing_key' ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center px-8">
                      <Search className="w-10 h-10 text-zinc-400 mb-3" />
                      <div className="text-lg font-extrabold text-zinc-800">Google Maps API key missing</div>
                      <div className="mt-2 text-sm text-zinc-600 max-w-sm">
                        Set <span className="font-black">VITE_GOOGLE_MAPS_API_KEY</span> in Vercel / `.env.local` to enable the live map.
                      </div>
                      <img src="/locator/panel-map.png" alt="" className="mt-6 w-full max-w-sm rounded-2xl border border-zinc-200" draggable={false} />
                    </div>
                  ) : mapStatus === 'error' ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center px-8">
                      <div className="text-lg font-extrabold text-zinc-800">Map failed to load</div>
                      <div className="mt-2 text-sm text-zinc-600 max-w-sm">
                        Check API key / network, then reload. Placeholder shown below.
                      </div>
                      <img src="/locator/panel-map.png" alt="" className="mt-6 w-full max-w-sm rounded-2xl border border-zinc-200" draggable={false} />
                    </div>
                  ) : (
                    <div ref={mapDivRef} className="w-full h-full min-h-[680px]" />
                  )}
                </div>

                <div className="relative z-10 p-4 pointer-events-none">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 border border-zinc-200 shadow-sm pointer-events-none">
                    <MapPin className="w-4 h-4 text-zinc-700" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-700">
                      {mode === 'find' ? 'Searching' : 'Reporting'} · {TYPE_META[type].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LocatorPage;

