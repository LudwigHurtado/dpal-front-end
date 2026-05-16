import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, AlertTriangle, ArrowLeft, Bot, CheckCircle, Globe, RefreshCw, Send, ShieldCheck, Target,
} from './icons';
import { API_ROUTES, apiUrl } from '../constants';
import { isAiEnabled, runGeminiPrompt } from '../services/geminiService';
import { appendVoiceTranscript, VoiceInputButton } from '../src/shared/components/VoiceInputButton';
import { buildDpalMrvPrompt, type DpalMrvMode } from '../services/mrvPrompt';
import DpalProjectGuide from './dpal-assistant/DpalProjectGuide';
import { NavigatorHelperCard, useNavigatorOutcomeTracking } from '../src/features/dpalNavigator';
import type { ChatMessage } from '../types';
import type { DpalProjectGuideSnapshot } from './dpal-assistant/projectGuideTypes';
import {
  createRoomFromScanResult,
  postInitialScanMessages,
  saveScanResult,
  type EarthObservationAssistantInterpretation,
  type EarthObservationGuideSnapshot,
  type EarthObservationMissionSuggestion,
  type EarthObservationSavedAoi,
  type EarthObservationScanRecord,
  type EvidencePacketDraft,
  type ScanToSituationPackage,
} from '../services/situationRoomBridge';

interface GPSPoint { lat: number; lng: number }
type AoiSource = 'radius' | 'drawn_polygon' | 'imported_geojson';
type LifecycleStatus =
  | 'adapter_ready'
  | 'metadata_found'
  | 'scenes_found'
  | 'usable_scenes_found'
  | 'metrics_computed'
  | 'screening_result_ready'
  | 'evidence_packet_ready'
  | 'routed_to_situation_room'
  | 'no_usable_scenes'
  | 'metric_failed';
type ReasonCode =
  | 'no_scenes_found'
  | 'scenes_too_cloudy'
  | 'required_bands_missing'
  | 'imagery_assets_missing'
  | 'metric_calculator_failed'
  | 'date_range_too_short'
  | 'aoi_unsuitable_for_product';

type ObservationUse =
  | 'deforestation'
  | 'agriculture'
  | 'pollution'
  | 'carbon_projects'
  | 'floods_fires'
  | 'roads_cities'
  | 'water'
  | 'heat';

interface EarthObservationResult {
  dataAvailable: boolean;
  observationType: ObservationUse;
  signalStatus: string;
  primarySignal: string | null;
  riskLevel: 'low' | 'moderate' | 'high' | 'unknown';
  confidenceScore: number | null;
  source: string;
  message: string;
  sourceMode?: 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'UNAVAILABLE';
  processingStage?: string;
  lifecycleStatus: LifecycleStatus;
  diagnosticsReason: ReasonCode | null;
  diagnosticsText: string;
  sceneSearchResult: { metadataFound: boolean; scenesFound: number; usableScenesFound: number };
  beforeScene?: { sceneId: string; acquisitionDate: string | null; cloudCoverage: number | null; source: string } | null;
  afterScene?: { sceneId: string; acquisitionDate: string | null; cloudCoverage: number | null; source: string } | null;
  metricMethod?: string;
  limitations: string[];
  recommendedActions: string[];
  legalDisclaimer?: string;
  metrics: Record<string, number | string | null>;
}

type AidMessage = { role: 'assistant' | 'user'; text: string };

const SAFE_SCREENING_LANGUAGE = 'Satellite analysis is a screening tool. Do not present unverified indicators as final legal, regulatory, scientific, insurance, or carbon-credit conclusions.';
const SAFE_SIGNAL_LANGUAGE = 'DPAL detected a remote-sensing screening signal that may indicate change. This is not a final legal, regulatory, scientific, insurance, or carbon-credit conclusion until verified with supporting evidence.';
const SAFE_NO_IMAGERY_LANGUAGE = 'DPAL did not complete a verified satellite comparison for this AOI and date range. The scan package documents the search, limitations, and recommended verification steps.';

const USE_CASES: Array<{ id: ObservationUse; label: string; looksFor: string; satellites: string }> = [
  { id: 'deforestation', label: 'Deforestation', looksFor: 'tree loss, clearing edges, canopy change over time', satellites: 'Landsat, Sentinel-2, MODIS' },
  { id: 'agriculture', label: 'Agriculture', looksFor: 'crop health, drought stress, vegetation change', satellites: 'Landsat, Sentinel-2, SMAP' },
  { id: 'pollution', label: 'Pollution', looksFor: 'smoke, methane, dust, water contamination indicators', satellites: 'TROPOMI, OCO-2, VIIRS, Landsat' },
  { id: 'carbon_projects', label: 'Carbon Projects', looksFor: 'forest cover, biomass proxies, land-use change', satellites: 'Landsat, Sentinel-2, GEDI' },
  { id: 'floods_fires', label: 'Floods / Fires', looksFor: 'disaster damage, spread, burn or inundation extent', satellites: 'Sentinel-1, VIIRS, Landsat' },
  { id: 'roads_cities', label: 'Roads / Cities', looksFor: 'urban growth, road expansion, infrastructure change', satellites: 'Landsat, Sentinel-2, night lights' },
  { id: 'water', label: 'Water', looksFor: 'river changes, lakes, floods, algae indicators', satellites: 'SWOT, Sentinel-1, Landsat, MODIS' },
  { id: 'heat', label: 'Heat', looksFor: 'surface temperature and urban heat islands', satellites: 'Landsat TIRS, MODIS, ECOSTRESS' },
];

const EMPTY_RESULT = (observationType: ObservationUse): EarthObservationResult => ({
  dataAvailable: false,
  observationType,
  signalStatus: 'Not verified',
  primarySignal: null,
  riskLevel: 'unknown',
  confidenceScore: null,
  source: 'LEO remote-sensing products',
  message: 'No verified Earth-observation scan has been run yet.',
  sourceMode: undefined,
  processingStage: undefined,
  lifecycleStatus: 'adapter_ready',
  diagnosticsReason: null,
  diagnosticsText: '',
  sceneSearchResult: { metadataFound: false, scenesFound: 0, usableScenesFound: 0 },
  beforeScene: null,
  afterScene: null,
  metricMethod: undefined,
  limitations: [],
  recommendedActions: [],
  legalDisclaimer: undefined,
  metrics: {},
});

function EoMapPicker({ onSelect }: { onSelect: (p: GPSPoint) => void }) {
  useMapEvents({ click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
}
function EoMapInit({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (!map) return;
    mapRef.current = map;
    const timers = [100, 300, 600].map((ms) => window.setTimeout(() => map.invalidateSize(), ms));
    return () => timers.forEach(window.clearTimeout);
  }, [map, mapRef]);
  return null;
}
function EoMapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => { map.panTo([lat, lng], { animate: true }); }, [map, lat, lng]);
  return null;
}
function ObservationMap({ center, radiusKm, onSelect }: { center: GPSPoint; radiusKm: number; onSelect: (point: GPSPoint) => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  useEffect(() => {
    if (!wrapperRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 flex flex-col">
      <div className="border-b border-slate-800 px-4 py-3"><p className="text-sm font-bold text-white">LEO Observation Area</p></div>
      <div ref={wrapperRef} style={{ flex: 1, minHeight: '320px', width: '100%' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%', minHeight: '320px' }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
          <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12, weight: 2.5, dashArray: '5 7' }} />
          <EoMapInit mapRef={mapRef} />
          <EoMapPicker onSelect={onSelect} />
          <EoMapRecenter lat={center.lat} lng={center.lng} />
        </MapContainer>
      </div>
    </div>
  );
}

function lifecycleLabel(status: LifecycleStatus): string { return status.replaceAll('_', ' '); }
function toAnalysisTypeForBackend(use: ObservationUse): 'deforestation' | 'agriculture' | 'pollution' | 'carbon' | 'flood_fire' | 'urban' | 'water' | 'heat' {
  const map: Record<ObservationUse, 'deforestation' | 'agriculture' | 'pollution' | 'carbon' | 'flood_fire' | 'urban' | 'water' | 'heat'> = {
    deforestation: 'deforestation',
    agriculture: 'agriculture',
    pollution: 'pollution',
    carbon_projects: 'carbon',
    floods_fires: 'flood_fire',
    roads_cities: 'urban',
    water: 'water',
    heat: 'heat',
  };
  return map[use];
}
function metricHasValue(v: unknown): boolean { return typeof v === 'number' && Number.isFinite(v); }
function computeAreaKm2(radiusKm: number): number { return Number((Math.PI * radiusKm * radiusKm).toFixed(2)); }

function inferNoImageryReason(limitations: string[], sceneCount: number, metricFailure: boolean, startDateInput: string, endDateInput: string): { code: ReasonCode; text: string; nextAction: string } {
  const joined = limitations.join(' ').toLowerCase();
  const start = new Date(`${startDateInput}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDateInput}T23:59:59.000Z`).getTime();
  const days = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 86400000)) : 0;
  if (sceneCount === 0) return { code: 'no_scenes_found', text: 'No scenes found for this AOI in the selected date range.', nextAction: 'Expand date range and rerun scan.' };
  if (days > 0 && days < 14) return { code: 'date_range_too_short', text: 'Date range may be too short to find a usable before/after pair.', nextAction: 'Use at least a 1-3 month date range.' };
  if (joined.includes('cloud')) return { code: 'scenes_too_cloudy', text: 'Scenes were found but too cloudy or low quality for comparison.', nextAction: 'Expand date range or change AOI to get cleaner scenes.' };
  if (joined.includes('statistics') || joined.includes('assets')) return { code: 'imagery_assets_missing', text: 'Imagery metadata exists, but required imagery assets/statistics were unavailable.', nextAction: 'Rerun later or switch AOI/product type.' };
  if (joined.includes('stable index') || joined.includes('index')) return { code: 'required_bands_missing', text: 'Required bands/index inputs were missing for selected product.', nextAction: 'Try a different product type or AOI.' };
  if (metricFailure) return { code: 'metric_calculator_failed', text: 'Metric calculator could not produce usable values.', nextAction: 'Rerun scan with broader dates and attach diagnostics in evidence packet.' };
  return { code: 'aoi_unsuitable_for_product', text: 'AOI may be unsuitable for selected product and date settings.', nextAction: 'Adjust AOI size/position and rerun scan.' };
}

function buildMissionSuggestion(scanId: string, observationType: ObservationUse, center: GPSPoint): EarthObservationMissionSuggestion {
  return {
    missionType: 'field_verification',
    sourceModule: 'earth_observation',
    sourceScanId: scanId,
    title: `Verify possible ${observationType.replace('_', ' ')} signal near ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`,
    tasks: [
      'Capture geotagged photos from accessible boundary points',
      'Document visible land/water/fire/vegetation conditions at site',
      'Upload before/after screenshots if available',
      'Attach public records, permits, or agency reports',
      'Submit findings for validator review',
    ],
    safetyNotes: ['Do not trespass', 'Do not enter dangerous areas', 'Follow local law and safety guidance'],
  };
}

function buildAssistantInterpretation(args: {
  scanId: string;
  result: EarthObservationResult;
  aoi: EarthObservationSavedAoi;
  observationType: ObservationUse;
  evidenceReady: boolean;
  situationReady: boolean;
}): EarthObservationAssistantInterpretation {
  const { scanId, result, aoi, observationType, evidenceReady, situationReady } = args;
  const usableImagery = result.sceneSearchResult.usableScenesFound > 0;
  const whatFound = [
    result.sceneSearchResult.metadataFound ? 'Metadata found' : 'No metadata found',
    result.sceneSearchResult.scenesFound > 0 ? `${result.sceneSearchResult.scenesFound} scenes found` : 'No scenes found',
    usableImagery ? 'Usable scenes found' : 'No usable scenes found',
    result.lifecycleStatus === 'metrics_computed' || result.lifecycleStatus === 'screening_result_ready'
      ? 'Metrics computed'
      : 'Metrics not computed',
  ];
  const noImagerySummary = 'No usable satellite comparison was completed. DPAL found that the Earth Observation adapter is available, but no usable imagery pair was processed for this AOI and date range.';
  const summary = usableImagery
    ? `${result.primarySignal ?? 'DPAL computed a screening signal.'} This remains a screening result pending validation.`
    : noImagerySummary;
  return {
    summary,
    whatDpalFound: whatFound,
    whatDpalDidNotProve: [
      'No final legal/regulatory violation is proven by this scan alone.',
      'No insurance or carbon-credit claim is approved from screening-only output.',
      'Field and validator evidence is still required.',
    ],
    missingEvidence: [
      'Geotagged photos',
      'Field inspection notes',
      'Official source records',
      'Cloud-free before/after imagery pair',
      'Agency or community witness reports',
      'Project boundary documentation',
    ],
    recommendedQuestions: [
      'What does this result mean?',
      'Why was no imagery processed?',
      'What evidence is missing?',
      'Can I make a legal claim from this?',
      'Can I use this for carbon credits?',
      'Should I create a verification mission?',
      'Should I send this to the Situation Room?',
      'What should validators review?',
      'What satellite index matters most here?',
      'How do I improve confidence?',
    ],
    recommendedActions: [
      !aoi.isSaved ? 'Save AOI' : 'AOI saved',
      'Expand date range and rerun if imagery is not usable',
      evidenceReady ? 'Evidence packet ready' : 'Create evidence packet',
      'Create field verification mission',
      situationReady ? 'Route to Situation Room' : 'Prepare Situation Room handoff',
      'Mark as screening only until validated',
    ],
    safeClaimLanguage: usableImagery ? SAFE_SIGNAL_LANGUAGE : SAFE_NO_IMAGERY_LANGUAGE,
    missionSuggestion: buildMissionSuggestion(scanId, observationType, aoi.center ?? { lat: 0, lng: 0 }),
    generatedAt: new Date().toISOString(),
  };
}

function answerAssistantQuestion(question: string, result: EarthObservationResult, interpretation: EarthObservationAssistantInterpretation): string {
  const q = question.toLowerCase();
  if (q.includes('why was no imagery')) {
    return `Metadata found: ${result.sceneSearchResult.metadataFound ? 'yes' : 'no'}; scenes found: ${result.sceneSearchResult.scenesFound}; usable scenes: ${result.sceneSearchResult.usableScenesFound}. Reason: ${result.diagnosticsText || 'not available'}. Next: ${result.recommendedActions[0] || 'adjust AOI/date range and rerun.'}`;
  }
  if (q.includes('can i make') || q.includes('claim')) return `${SAFE_SCREENING_LANGUAGE} Missing evidence: ${interpretation.missingEvidence.slice(0, 4).join(', ')}.`;
  if (q.includes('verification mission')) return `Yes when results are unverified/inconclusive/high-risk. Suggested tasks: ${interpretation.missionSuggestion.tasks.join(' | ')}`;
  if (q.includes('what does ndvi')) return 'NDVI is a vegetation index comparing near-infrared and red reflectance; lower change can indicate potential vegetation stress/loss, but still needs field verification.';
  if (q.includes('what does nbr')) return 'NBR compares near-infrared and SWIR to screen possible burn/disturbance signals. It is not legal proof by itself.';
  if (q.includes('what does ndmi')) return 'NDMI screens vegetation moisture change using NIR and SWIR. It can indicate possible moisture stress and requires validation.';
  if (q.includes('what does ndwi')) return 'NDWI screens water presence/change using green and NIR reflectance. It may indicate water extent change, not a final hydrology determination.';
  return interpretation.summary;
}

function buildObservationPrompt(result: EarthObservationResult, location: GPSPoint, radiusKm: number, question: string): string {
  const useCase = USE_CASES.find((item) => item.id === result.observationType);
  const modeByObservation: Record<ObservationUse, DpalMrvMode> = {
    deforestation: 'environmental', agriculture: 'environmental', pollution: 'environmental', carbon_projects: 'carbon',
    floods_fires: 'environmental', roads_cities: 'infrastructure', water: 'water', heat: 'environmental',
  };
  return buildDpalMrvPrompt({
    mode: modeByObservation[result.observationType] || 'earth-observation',
    locationLabel: useCase?.label || result.observationType,
    coordinates: { lat: location.lat, lng: location.lng, radiusKm },
    dataSources: [useCase?.satellites || 'LEO remote-sensing satellites', 'Earth observation backend scan output'],
    context: `Observation type: ${useCase?.label || result.observationType}.`,
    data: result,
    userQuestion: question,
    responseLength: 'standard',
  });
}
function ObservationAidChat({ result, location, radiusKm }: { result: EarthObservationResult; location: GPSPoint; radiusKm: number }) {
  const [messages, setMessages] = useState<AidMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiReady = isAiEnabled();
  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    try {
      const text = await runGeminiPrompt(buildObservationPrompt(result, location, radiusKm, trimmed));
      setMessages((prev) => [...prev, { role: 'assistant', text: text.trim() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI helper failed.');
    } finally { setLoading(false); }
  };
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((current) => appendVoiceTranscript(current, text));
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-sky-700/30 bg-sky-950/10 p-4">
      <div className="flex items-start gap-3"><Bot className="h-4 w-4 text-sky-300 mt-0.5" /><p className="text-sm font-bold text-white">Earth Observation Helper</p></div>
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-300">{error}</div>}
      {messages.length > 0 && <div className="max-h-72 overflow-y-auto space-y-2">{messages.map((m, i) => <div key={`${m.role}-${i}`} className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{m.text}</div>)}<div ref={bottomRef} /></div>}
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              const q = input;
              setInput('');
              void ask(q);
            }
          }}
          disabled={!aiReady || loading}
          placeholder="Ask about this scan, evidence, or next steps…"
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={!aiReady || loading} />
        <button
          type="button"
          onClick={() => {
            const q = input;
            setInput('');
            void ask(q);
          }}
          disabled={!aiReady || loading || !input.trim()}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : 'Ask'}
        </button>
      </div>
    </div>
  );
}

type EarthObservationViewProps = {
  onReturn: () => void;
  actorName?: string;
  onOpenSituationRoomFromScan?: (payload: { pkg: ScanToSituationPackage; initialMessagesPosted: ChatMessage[] }) => void | Promise<void>;
};

const EarthObservationView: React.FC<EarthObservationViewProps> = ({ onReturn, actorName, onOpenSituationRoomFromScan }) => {
  const navOutcome = useNavigatorOutcomeTracking('carbon_land');
  const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);
  const initialEnd = new Date();
  const initialStart = new Date(initialEnd);
  initialStart.setDate(initialStart.getDate() - 30);

  const [scanLocation, setScanLocation] = useState<GPSPoint>({ lat: 39.5, lng: -98.35 });
  const [scanRadius, setScanRadius] = useState(25);
  const [observationType, setObservationType] = useState<ObservationUse>('deforestation');
  const [startDateInput, setStartDateInput] = useState<string>(toDateInputValue(initialStart));
  const [endDateInput, setEndDateInput] = useState<string>(toDateInputValue(initialEnd));
  const [selectedPreset, setSelectedPreset] = useState<string>('30d');
  const [result, setResult] = useState<EarthObservationResult>(EMPTY_RESULT('deforestation'));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [savedAoi, setSavedAoi] = useState<EarthObservationSavedAoi>({
    exists: true, isSaved: false, center: { lat: 39.5, lng: -98.35 }, radiusKm: 25, boundaryGeoJson: null, areaKm2: computeAreaKm2(25), savedAt: null, source: 'radius',
  });
  const [scanRequested, setScanRequested] = useState(false);
  const [evidencePacketCreated, setEvidencePacketCreated] = useState(false);
  const [verificationMissionCreated, setVerificationMissionCreated] = useState(false);
  const [scanSavedRecord, setScanSavedRecord] = useState<EarthObservationScanRecord | null>(null);
  const [scanSources, setScanSources] = useState<Array<Record<string, unknown>>>([]);
  const [guideSnapshot, setGuideSnapshot] = useState<EarthObservationGuideSnapshot>({});
  const [sendingToSituationRoom, setSendingToSituationRoom] = useState(false);
  const [situationRoomSent, setSituationRoomSent] = useState(false);
  const [situationRoomId, setSituationRoomId] = useState<string | null>(null);
  const [lastRoomPackage, setLastRoomPackage] = useState<ScanToSituationPackage | null>(null);
  const [evidencePacketDraft, setEvidencePacketDraft] = useState<EvidencePacketDraft | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<string>('');

  /**
   * DPAL Navigator handoff: when arriving with `?lat=&lng=&source=dpal-navigator`,
   * pre-populate the scan location and AOI center so the user only has to confirm
   * radius / observation type and click Run scan. This is a pre-fill, never an
   * automatic scan trigger.
   */
  useEffect(() => {
    let prefilledLat: number | null = null;
    let prefilledLng: number | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      const navigatorFlow = params.get('navigatorFlow');
      if (source !== 'dpal-navigator' && navigatorFlow !== 'carbon-land') return;
      const latStr = params.get('lat');
      const lngStr = params.get('lng');
      if (!latStr || !lngStr) return;
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      setScanLocation({ lat, lng });
      setSavedAoi((prev) => ({
        ...prev,
        center: { lat, lng },
        exists: true,
        isSaved: false,
      }));
      prefilledLat = lat;
      prefilledLng = lng;
    } catch {
      /** Window/URL access can fail in non-browser test envs — safe to ignore. */
    }
    if (prefilledLat != null && prefilledLng != null) {
      navOutcome.trackOutcomeOnce({
        moduleId: 'earth_observation',
        eventType: 'location_prefilled',
        label: 'Scan location pre-filled from DPAL Navigator',
        status: 'started',
        coordinates: { lat: prefilledLat, lng: prefilledLng },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Module-opened milestone for active Navigator session. */
  useEffect(() => {
    if (!navOutcome.hasActiveNavigatorSession) return;
    navOutcome.trackOutcomeOnce({
      moduleId: 'earth_observation',
      eventType: 'module_opened',
      label: 'Opened Earth Observation workspace',
      status: 'observed',
    });
  }, [navOutcome]);

  const selectedUse = USE_CASES.find((item) => item.id === observationType) ?? USE_CASES[0];
  const calculatedProgress = useMemo(() => {
    let steps = 0;
    if (savedAoi.exists) steps += 1;
    if (savedAoi.isSaved) steps += 1;
    if (scanRequested) steps += 1;
    if (result.lifecycleStatus === 'screening_result_ready' || result.lifecycleStatus === 'no_usable_scenes' || result.lifecycleStatus === 'metric_failed') steps += 1;
    if (evidencePacketCreated) steps += 1;
    if (verificationMissionCreated) steps += 1;
    if (situationRoomSent) steps += 1;
    return Math.min(100, Math.max(0, Math.round((steps / 7) * 100)));
  }, [evidencePacketCreated, result.lifecycleStatus, savedAoi.exists, savedAoi.isSaved, scanRequested, situationRoomSent, verificationMissionCreated]);

  const assistantInterpretation = useMemo(() => buildAssistantInterpretation({
    scanId: scanSavedRecord?.id ?? 'scan-pending',
    result,
    aoi: savedAoi,
    observationType,
    evidenceReady: evidencePacketCreated,
    situationReady: Boolean(scanSavedRecord && evidencePacketCreated),
  }), [evidencePacketCreated, observationType, result, savedAoi, scanSavedRecord?.id]);

  const canSaveAoi = Boolean(scanRadius > 0 || savedAoi.boundaryGeoJson);
  const canRunScan = savedAoi.isSaved && !loading;
  const canCreateEvidencePacket = scanRequested && ['screening_result_ready', 'no_usable_scenes', 'metric_failed'].includes(result.lifecycleStatus);
  const canCreateVerificationMission = evidencePacketCreated;
  const canSendToSituationRoom = Boolean(scanSavedRecord && evidencePacketDraft);

  const applyRangePreset = (preset: '7d' | '14d' | '30d' | '3m' | '6m' | '12m') => {
    const end = new Date();
    const start = new Date(end);
    if (preset === '7d') start.setDate(start.getDate() - 7);
    if (preset === '14d') start.setDate(start.getDate() - 14);
    if (preset === '30d') start.setDate(start.getDate() - 30);
    if (preset === '3m') start.setMonth(start.getMonth() - 3);
    if (preset === '6m') start.setMonth(start.getMonth() - 6);
    if (preset === '12m') start.setMonth(start.getMonth() - 12);
    setStartDateInput(toDateInputValue(start));
    setEndDateInput(toDateInputValue(end));
    setSelectedPreset(preset);
  };

  const PRESET_DISPLAY: Record<string, string> = { '7d': '7 days', '14d': '2 weeks', '30d': '1 month', '3m': '3 months', '6m': '6 months', '12m': '12 months' };

  useEffect(() => {
    setSavedAoi((prev) => ({
      ...prev,
      exists: true,
      center: { lat: scanLocation.lat, lng: scanLocation.lng },
      radiusKm: scanRadius,
      areaKm2: computeAreaKm2(scanRadius),
      source: prev.source ?? 'radius',
      isSaved: false,
      savedAt: null,
    }));
  }, [scanLocation.lat, scanLocation.lng, scanRadius]);

  const persistScanRecord = (): EarthObservationScanRecord => {
    const scanRecord: EarthObservationScanRecord = {
      id: scanSavedRecord?.id || `scan-eo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      moduleType: 'earth_observation',
      analysisType: observationType,
      latitude: scanLocation.lat,
      longitude: scanLocation.lng,
      radiusKm: scanRadius,
      aoi: savedAoi,
      sourceMode: result.sourceMode ?? null,
      signalStatus: result.signalStatus ?? null,
      processingStage: result.lifecycleStatus,
      primarySignal: result.primarySignal ?? null,
      riskLevel: result.riskLevel ?? null,
      confidence: result.confidenceScore ?? null,
      beforeScene: result.beforeScene ?? null,
      afterScene: result.afterScene ?? null,
      metricMethod: result.metricMethod ?? null,
      metrics: result.metrics,
      sources: scanSources,
      limitations: result.limitations ?? [],
      legalDisclaimer: result.legalDisclaimer,
      recommendedActions: result.recommendedActions ?? [],
      createdAt: new Date().toISOString(),
      createdBy: actorName ?? null,
      guide: guideSnapshot,
      evidencePacketReady: evidencePacketCreated,
      routedToSituationRoom: situationRoomSent,
    };
    const saved = saveScanResult(scanRecord);
    setScanSavedRecord(saved);
    return saved;
  };

  const createEvidencePacket = () => {
    const savedScan = persistScanRecord();
    const packet: EvidencePacketDraft = {
      id: `evidence-eo-${Date.now()}`,
      moduleType: 'earth_observation',
      sourceType: 'earth_observation_scan',
      sourceId: savedScan.id,
      scanResultId: savedScan.id,
      projectName: 'Earth Observation',
      scanSummary: result.message,
      location: { latitude: scanLocation.lat, longitude: scanLocation.lng, radiusKm: scanRadius },
      aoi: savedAoi,
      analysisType: observationType,
      dateRange: { startDate: startDateInput, endDate: endDateInput },
      providerMetadata: scanSources,
      sceneSearchResult: {
        lifecycleStatus: result.lifecycleStatus,
        scenesFound: result.sceneSearchResult.scenesFound,
        usableScenesFound: result.sceneSearchResult.usableScenesFound,
        reasonCode: result.diagnosticsReason,
        reasonText: result.diagnosticsText,
      },
      beforeSceneDate: result.beforeScene?.acquisitionDate ?? null,
      afterSceneDate: result.afterScene?.acquisitionDate ?? null,
      metricValues: result.metrics,
      sourceList: scanSources,
      confidence: result.confidenceScore ?? null,
      limitations: result.limitations,
      claimSafetyStatement: SAFE_SCREENING_LANGUAGE,
      recommendedDpalAction: result.recommendedActions[0] ?? 'Create field verification mission and route to validator review.',
      verificationNeeds: assistantInterpretation.missingEvidence,
      assistantInterpretation,
      createdAt: new Date().toISOString(),
    };
    setEvidencePacketDraft(packet);
    setEvidencePacketCreated(true);
    setNotice('Evidence packet created for Earth Observation screening result.');
  };

  const runScan = async () => {
    if (!savedAoi.isSaved) {
      setNotice('Save AOI before running scan.');
      return;
    }
    const startDate = new Date(`${startDateInput}T00:00:00.000Z`);
    const endDate = new Date(`${endDateInput}T23:59:59.000Z`);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
      setNotice('Select a valid date range before scanning.');
      return;
    }
    setLoading(true);
    setNotice('');
    setScanRequested(true);
    setEvidencePacketCreated(false);
    setEvidencePacketDraft(null);
    setSituationRoomSent(false);
    setSituationRoomId(null);
    setLastRoomPackage(null);
    navOutcome.trackOutcome({
      moduleId: 'earth_observation',
      eventType: 'analysis_started',
      label: 'Started Earth Observation scan',
      status: 'started',
      coordinates: { lat: scanLocation.lat, lng: scanLocation.lng },
      metadata: { observationType, radiusKm: scanRadius, claimStatus: 'screening_only' },
      requiresHumanReview: true,
    });
    try {
      const res = await fetch(apiUrl(API_ROUTES.EARTH_OBSERVATION_SCAN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType: toAnalysisTypeForBackend(observationType),
          latitude: scanLocation.lat,
          longitude: scanLocation.lng,
          radiusKm: scanRadius,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResult({ ...EMPTY_RESULT(observationType), source: selectedUse.satellites, lifecycleStatus: 'metric_failed', diagnosticsReason: 'imagery_assets_missing', diagnosticsText: 'Earth Observation service unavailable for this request.' });
        setNotice('Earth Observation scan is temporarily unavailable. The workspace remains active and no verified signal is being claimed.');
        return;
      }
      const sources = Array.isArray(data?.sources) ? data.sources as Array<Record<string, unknown>> : [];
      setScanSources(sources);
      const scenesFound = [data?.beforeScene, data?.afterScene].filter(Boolean).length;
      const usableScenesFound = [data?.beforeScene, data?.afterScene].filter((scene: any) => scene && (typeof scene.cloudCoverage !== 'number' || scene.cloudCoverage <= 60)).length;
      const metrics = (data?.metrics && typeof data.metrics === 'object') ? data.metrics as Record<string, number | string | null> : {};
      const metricExecuted = ['ndviChange', 'nbrChange', 'ndmiChange', 'ndwiChange', 'lstChange'].some((k) => metricHasValue(metrics[k]));
      const metadataFound = sources.length > 0;
      const metricFailure = Boolean(scenesFound > 0 && !metricExecuted);
      const diag = !metricExecuted ? inferNoImageryReason(Array.isArray(data?.limitations) ? data.limitations : [], scenesFound, metricFailure, startDateInput, endDateInput) : null;
      const lifecycleStatus: LifecycleStatus =
        metricExecuted ? 'screening_result_ready'
          : usableScenesFound > 0 ? 'metric_failed'
            : scenesFound > 0 ? 'no_usable_scenes'
              : metadataFound ? 'metadata_found'
                : 'adapter_ready';
      const noUsableMessage = 'No usable satellite comparison was completed. DPAL found that the Earth Observation adapter is available, but no usable imagery pair was processed for this AOI and date range.';
      setResult({
        ...EMPTY_RESULT(observationType),
        observationType,
        dataAvailable: metricExecuted,
        signalStatus: metricExecuted ? String(data?.signalStatus ?? 'partially_verified') : 'Not verified',
        primarySignal: metricExecuted ? String(data?.primarySignal ?? '') : null,
        riskLevel: (data?.riskLevel ?? 'unknown') as EarthObservationResult['riskLevel'],
        confidenceScore: typeof data?.confidence === 'number' ? data.confidence : null,
        source: sources.map((s) => [String((s as any).name ?? ''), String((s as any).product ?? '')].filter(Boolean).join(' · ')).filter(Boolean).join(' | ') || selectedUse.satellites,
        sourceMode: data?.sourceMode,
        processingStage: data?.processingStage,
        lifecycleStatus,
        diagnosticsReason: diag?.code ?? null,
        diagnosticsText: diag?.text ?? '',
        sceneSearchResult: { metadataFound, scenesFound, usableScenesFound },
        beforeScene: data?.beforeScene ?? null,
        afterScene: data?.afterScene ?? null,
        metricMethod: typeof data?.metricMethod === 'string' ? data.metricMethod : undefined,
        limitations: Array.isArray(data?.limitations) ? data.limitations : [],
        recommendedActions: Array.isArray(data?.recommendedActions) ? data.recommendedActions : (diag ? [diag.nextAction] : []),
        legalDisclaimer: typeof data?.legalDisclaimer === 'string' ? data.legalDisclaimer : undefined,
        message: metricExecuted ? String(data?.summary ?? 'Screening result ready.') : `${noUsableMessage} Reason: ${diag?.text ?? 'No metric executed.'}`,
        metrics,
      });
    } catch {
      setResult({ ...EMPTY_RESULT(observationType), source: selectedUse.satellites, lifecycleStatus: 'metric_failed', diagnosticsReason: 'imagery_assets_missing', diagnosticsText: 'Network unavailable.' });
      setNotice('Network unavailable for Earth Observation scan. Try again when the backend is reachable.');
    } finally { setLoading(false); }
  };

  const handleSendToSituationRoom = async () => {
    if (sendingToSituationRoom || !canSendToSituationRoom || !evidencePacketDraft) return;
    setSendingToSituationRoom(true);
    try {
      const savedScan = persistScanRecord();
      const pkg = createRoomFromScanResult({
        analysisType: savedScan.analysisType,
        analysisTypeLabel: observationType,
        latitude: savedScan.latitude,
        longitude: savedScan.longitude,
        radiusKm: savedScan.radiusKm,
        aoi: savedAoi,
        sourceMode: savedScan.sourceMode,
        signalStatus: savedScan.signalStatus,
        processingStage: savedScan.processingStage,
        primarySignal: savedScan.primarySignal,
        riskLevel: savedScan.riskLevel,
        confidence: savedScan.confidence,
        beforeScene: savedScan.beforeScene,
        afterScene: savedScan.afterScene,
        metricMethod: savedScan.metricMethod,
        metrics: savedScan.metrics,
        sources: savedScan.sources,
        limitations: savedScan.limitations,
        legalDisclaimer: savedScan.legalDisclaimer,
        recommendedActions: savedScan.recommendedActions,
        summaryText: result.message,
        createdBy: savedScan.createdBy,
        guide: savedScan.guide,
        lifecycleStatus: result.lifecycleStatus,
        sceneSearchResult: evidencePacketDraft.sceneSearchResult,
        assistantInterpretation,
        dateRange: { startDate: startDateInput, endDate: endDateInput },
      });
      const initialMessagesPosted = await postInitialScanMessages(pkg.situationRoom.roomId, pkg.initialMessages);
      setSituationRoomSent(true);
      setSituationRoomId(pkg.situationRoom.roomId);
      setLastRoomPackage(pkg);
      if (onOpenSituationRoomFromScan) await onOpenSituationRoomFromScan({ pkg, initialMessagesPosted });
    } catch {
      setNotice('Could not send this scan to Situation Room yet. Try again.');
    } finally { setSendingToSituationRoom(false); }
  };

  const workflowState = {
    analysisType: observationType,
    latitude: scanLocation.lat,
    longitude: scanLocation.lng,
    radiusKm: scanRadius,
    aoiDraft: savedAoi.exists,
    aoiSaved: savedAoi.isSaved,
    scanRequested,
    scanResult: scanRequested,
    sourceMode: result.sourceMode ?? null,
    signalStatus: result.signalStatus ?? null,
    processingStage: result.lifecycleStatus,
    beforeScene: result.beforeScene ?? null,
    afterScene: result.afterScene ?? null,
    metricMethod: result.metricMethod ?? null,
    riskLevel: result.riskLevel ?? null,
    confidence: result.confidenceScore ?? null,
    metrics: result.metrics,
    limitations: result.limitations ?? [],
    recommendedActions: result.recommendedActions ?? [],
    evidencePacket: evidencePacketCreated,
    missionCreated: verificationMissionCreated,
    situationRoomSent,
  };

  const questionChips = assistantInterpretation.recommendedQuestions;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <NavigatorHelperCard expectedScenario="carbon_land" />
      </div>
      <div className="border-b border-sky-500/20 bg-sky-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <button onClick={onReturn} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back</button>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div><p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-sky-300">Earth Observation</p><h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">LEO satellite analysis workspace</h1></div>
            <div className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-4"><p className="text-xs font-bold text-sky-300">Safe claim language</p><p className="mt-2 text-sm text-slate-300">{SAFE_SCREENING_LANGUAGE}</p></div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
                <div className="flex items-center gap-3"><Globe className="h-8 w-8 text-sky-300" /><h2 className="text-lg font-bold text-white">Analysis Setup</h2></div>
                <select value={observationType} onChange={(e) => { const next = e.target.value as ObservationUse; setObservationType(next); setResult(EMPTY_RESULT(next)); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">{USE_CASES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={scanLocation.lat.toFixed(5)} onChange={(e) => { const lat = Number(e.target.value); if (Number.isFinite(lat)) setScanLocation((p) => ({ ...p, lat })); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
                  <input value={scanLocation.lng.toFixed(5)} onChange={(e) => { const lng = Number(e.target.value); if (Number.isFinite(lng)) setScanLocation((p) => ({ ...p, lng })); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
                </div>
                <input type="range" min={1} max={100} value={scanRadius} onChange={(e) => setScanRadius(Number(e.target.value))} className="w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={startDateInput} onChange={(e) => { setStartDateInput(e.target.value); setSelectedPreset('custom'); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
                  <input type="date" value={endDateInput} onChange={(e) => { setEndDateInput(e.target.value); setSelectedPreset('custom'); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
                </div>
                <div className="flex flex-wrap gap-2">{(['7d', '14d', '30d', '3m', '6m', '12m'] as const).map((p) => <button key={p} type="button" onClick={() => applyRangePreset(p)} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${selectedPreset === p ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>{PRESET_DISPLAY[p]}</button>)}</div>
                <button type="button" onClick={() => setSavedAoi((prev) => ({ ...prev, exists: true, isSaved: true, center: { lat: scanLocation.lat, lng: scanLocation.lng }, radiusKm: scanRadius, areaKm2: computeAreaKm2(scanRadius), source: prev.source ?? 'radius', savedAt: new Date().toISOString() }))} disabled={!canSaveAoi} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">{savedAoi.isSaved ? 'AOI saved' : 'Save AOI boundary'}</button>
                <button onClick={runScan} disabled={!canRunScan} className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Checking satellite products...' : 'Run scan'}</button>
              </div>
              <ObservationMap center={scanLocation} radiusKm={scanRadius} onSelect={setScanLocation} />
            </div>

            {notice && <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">{notice}</div>}
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
              <p className="font-bold text-white">Scan status</p>
              <p className="mt-1">{result.message}</p>
              <p className="mt-2 text-xs text-slate-400">AOI saved: {savedAoi.isSaved ? 'yes' : 'no'} | Progress: {calculatedProgress}% | Lifecycle: {lifecycleLabel(result.lifecycleStatus)}</p>
              <p className="mt-1 text-xs text-slate-500">Comparison basis: {selectedPreset === 'custom' ? 'Custom dates' : `Auto · ${PRESET_DISPLAY[selectedPreset] ?? selectedPreset}`} ({startDateInput} to {endDateInput})</p>
              {result.diagnosticsText && <p className="mt-2 text-xs text-amber-300">Diagnostic: {result.diagnosticsText}</p>}
              {!!result.recommendedActions.length && <p className="mt-1 text-xs text-sky-300">Recommended next action: {result.recommendedActions[0]}</p>}
            </div>

            <div className="rounded-xl border border-sky-600/30 bg-slate-900/80 p-4">
              <p className="text-sm font-bold text-white">Earth Observation Assistant</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">{[
                'Screening only',
                result.dataAvailable ? 'Needs verification' : 'Needs imagery verification',
                evidencePacketCreated ? 'Evidence packet ready' : 'Evidence packet pending',
                canCreateVerificationMission ? 'Mission recommended' : 'Mission pending',
                canSendToSituationRoom ? 'Situation Room ready' : 'Situation Room pending',
              ].map((chip) => <span key={chip} className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5">{chip}</span>)}</div>
              <p className="mt-3 text-xs text-slate-300"><strong>Summary:</strong> {assistantInterpretation.summary}</p>
              <p className="mt-2 text-xs text-slate-400"><strong>What DPAL Did NOT Prove:</strong> {assistantInterpretation.whatDpalDidNotProve[0]}</p>
            </div>

            <div className="rounded-xl border border-violet-600/30 bg-violet-950/15 p-4 text-sm text-slate-200">
              <p className="font-bold text-white">Evidence Packet / Review</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={createEvidencePacket} disabled={!canCreateEvidencePacket} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">Create Evidence Packet</button>
                <button type="button" onClick={() => setVerificationMissionCreated(true)} disabled={!canCreateVerificationMission} className="rounded-lg border border-sky-500/50 bg-sky-900/25 px-3 py-2 text-xs font-bold text-sky-100 disabled:opacity-50">Create Verification Mission</button>
                <button type="button" onClick={() => { persistScanRecord(); setNotice('Scan package saved.'); }} disabled={!scanRequested} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">{scanSavedRecord ? 'Scan saved' : 'Save scan'}</button>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs">
                <p className="font-semibold text-white">Earth Observation Assistant</p>
                <p className="mt-2"><strong>Summary:</strong> {assistantInterpretation.summary}</p>
                <p className="mt-2"><strong>Missing Evidence:</strong> {assistantInterpretation.missingEvidence.join(', ')}</p>
                <p className="mt-2"><strong>Next DPAL Action:</strong> {assistantInterpretation.recommendedActions.join(' | ')}</p>
                <p className="mt-2 text-amber-300"><strong>Safe Claim Language:</strong> {assistantInterpretation.safeClaimLanguage}</p>
                <div className="mt-2 flex flex-wrap gap-2">{questionChips.map((chip) => <button key={chip} type="button" onClick={() => { setAssistantQuestion(chip); setAssistantResponse(answerAssistantQuestion(chip, result, assistantInterpretation)); }} className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-[10px]">{chip}</button>)}</div>
                {assistantQuestion && <p className="mt-2 text-slate-300"><strong>Q:</strong> {assistantQuestion}<br /><strong>A:</strong> {assistantResponse}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-violet-600/30 bg-violet-950/15 p-4 text-sm text-slate-200">
              <p className="font-bold text-white">Situation Room Routing</p>
              <p className="mt-1 text-xs text-slate-400">Uses existing DPAL Situation Room routing system. Status: {canSendToSituationRoom ? 'ready' : 'not ready'}.</p>
              <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs">
                <p className="font-semibold text-white">Earth Observation Assistant handoff summary</p>
                <p className="mt-1">{assistantInterpretation.summary}</p>
                <p className="mt-1">Validator questions: {assistantInterpretation.recommendedQuestions.slice(0, 4).join(' | ')}</p>
                <p className="mt-1">Mission tasks: {assistantInterpretation.missionSuggestion.tasks.slice(0, 3).join(' | ')}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleSendToSituationRoom()} disabled={!canSendToSituationRoom || sendingToSituationRoom} className="rounded-lg border border-violet-500/50 bg-violet-900/30 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">{sendingToSituationRoom ? 'Sending...' : situationRoomSent ? 'Already sent to Situation Room' : 'Send to Situation Room'}</button>
                {(situationRoomSent || situationRoomId) && onOpenSituationRoomFromScan && <button type="button" onClick={() => lastRoomPackage && onOpenSituationRoomFromScan({ pkg: lastRoomPackage, initialMessagesPosted: [] })} className="rounded-lg border border-sky-500/50 bg-sky-900/25 px-3 py-2 text-xs font-bold text-sky-100">Open Situation Room</button>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Signal Status', value: result.signalStatus, icon: <Activity className="h-5 w-5 text-sky-300" /> },
                { label: 'Primary Signal', value: result.primarySignal ?? 'Not verified', icon: <Target className="h-5 w-5 text-emerald-300" /> },
                { label: 'Risk Level', value: result.riskLevel, icon: <AlertTriangle className="h-5 w-5 text-amber-300" /> },
                { label: 'Confidence', value: typeof result.confidenceScore === 'number' ? `${Math.round(result.confidenceScore * 100)}%` : 'Not verified', icon: <ShieldCheck className="h-5 w-5 text-cyan-300" /> },
              ].map((metric) => <div key={metric.label} className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="mb-2 flex items-center gap-3">{metric.icon}<p className="text-sm font-bold text-white">{metric.label}</p></div><p className="text-xl font-black text-sky-300">{metric.value}</p></div>)}
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/85 p-4">
              <p className="text-sm font-bold text-white">Detailed Signal Breakdown</p>
              <p className="mt-1 text-xs text-slate-400">Scene diagnostics, metric values, and confidence context for this scan.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scene Pair</p>
                  <p className="mt-2 text-xs text-slate-300">
                    Before: {result.beforeScene?.acquisitionDate ?? 'Not available'} {result.beforeScene?.sceneId ? `(${result.beforeScene.sceneId})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    After: {result.afterScene?.acquisitionDate ?? 'Not available'} {result.afterScene?.sceneId ? `(${result.afterScene.sceneId})` : ''}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Lifecycle: {lifecycleLabel(result.lifecycleStatus)}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence Drivers</p>
                  <p className="mt-2 text-xs text-slate-300">Confidence: {typeof result.confidenceScore === 'number' ? `${Math.round(result.confidenceScore * 100)}%` : 'Not available'}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Usable scenes: {result.sceneSearchResult.usableScenesFound} / {result.sceneSearchResult.scenesFound}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Source mode: {result.sourceMode ?? 'Unknown'}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Metric Values</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: 'ndviChange', label: 'NDVI change' },
                    { key: 'nbrChange', label: 'NBR change' },
                    { key: 'ndmiChange', label: 'NDMI change' },
                    { key: 'ndwiChange', label: 'NDWI change' },
                    { key: 'lstChange', label: 'Heat/LST change' },
                  ].map((m) => (
                    <div key={m.key} className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs">
                      <p className="text-slate-400">{m.label}</p>
                      <p className="font-semibold text-sky-200">
                        {typeof result.metrics[m.key] === 'number' ? Number(result.metrics[m.key]).toFixed(4) : 'Not computed'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Limitations</p>
                {result.limitations.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {result.limitations.slice(0, 5).map((item, idx) => <li key={`${item}-${idx}`}>- {item}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No explicit limitations returned by this scan.</p>
                )}
              </div>
            </div>
            <ObservationAidChat result={result} location={scanLocation} radiusKm={scanRadius} />
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><div className="mb-3 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-sky-300" /><p className="font-bold text-white">Safe claim language</p></div><p className="text-sm leading-relaxed text-slate-400">{SAFE_SCREENING_LANGUAGE}</p></div>
          </div>
          <DpalProjectGuide
            moduleType="earth_observation"
            workflowState={workflowState}
            scanResult={result as unknown as Record<string, unknown>}
            evidenceState={{ evidencePacket: evidencePacketCreated, missionCreated: verificationMissionCreated, assistantInterpretation }}
            onCreateEvidencePacket={() => createEvidencePacket()}
            onCreateVerificationMission={() => setVerificationMissionCreated(true)}
            onSendToSituationRoom={() => void handleSendToSituationRoom()}
            onGuideStateChange={(snapshot) => {
              const mapped: EarthObservationGuideSnapshot = {
                guideCurrentStep: snapshot.currentStep,
                guideNextStep: snapshot.nextStep,
                plainEnglishExplanation: snapshot.plainEnglishExplanation,
                missingItems: snapshot.missingItems ?? [],
                warnings: snapshot.warnings ?? [],
                recommendedActions: snapshot.recommendedActions ?? [],
                claimSafety: snapshot.claimSafety,
                lastUserQuestion: snapshot.lastUserQuestion,
                lastGuideResponse: snapshot.lastGuideResponse,
              };
              setGuideSnapshot(mapped);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EarthObservationView;
