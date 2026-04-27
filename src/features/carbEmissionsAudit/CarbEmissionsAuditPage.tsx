import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  createCarbAudit,
  exportCarbAudit,
  importCarbFacilities,
  listCarbAudits,
  searchCarbFacilities,
  updateCarbAudit,
} from '../../../services/carbAuditService';
import { useAuth } from '../../../auth/AuthContext';
import { buildCarbReport, saveCarbReport } from '../../../services/carbReportService';
import { logCarbReportToLedger, updateCarbReportPdfHash } from '../../../services/carbReportLedgerService';
import { downloadCarbReportPdf } from '../../../services/carbPdfReportService';
import { resolveCarbEnvironmentalReadings } from '../../../services/carbEnvironmentalReadingsService';
import { generateQrCodeDataUrl } from '../../../utils/qrUtils';
import type { CarbSpecializedReport } from '../../../types/carbReport';
import CarbReportPanel from '../../../components/carb/CarbReportPanel';
import CarbReportViewer from '../../../components/carb/CarbReportViewer';
import CarbSituationRoom from '../../../components/carb/CarbSituationRoom';
import CarbIntelligenceReader from '../../../components/carb/CarbIntelligenceReader';

type Props = {
  onReturn: () => void;
  onOpenCarbReport?: (reportId: string) => void;
  onOpenCarbSituationRoom?: (roomId: string) => void;
};
type CarbWorkspaceTab =
  | 'overview'
  | 'search'
  | 'investigation'
  | 'report'
  | 'evidence'
  | 'situation'
  | 'sources'
  | 'tasks';

type ManualInvestigationDraft = {
  companyOperatorName: string;
  suspectedFacilityName: string;
  city: string;
  county: string;
  state: string;
  sourceUrl: string;
  notes: string;
};
type SourceStatus = 'LIVE VERIFIED' | 'CARB PUBLIC DATA' | 'IMPORTED DATASET' | 'DEMO DATA' | 'MISSING' | 'NEEDS REVIEW';
type ChecklistStatus = 'Complete' | 'Missing' | 'Optional' | 'Needs Review';

type CarbFacility = {
  facilityId: string;
  facilityName: string;
  operatorName: string;
  city: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  sector: string;
  reportingYear: number;
  totalCO2e: number;
  methaneCH4: number;
  nitrousOxideN2O: number;
  carbonDioxideCO2: number;
  verificationStatus: string;
  capAndTradeCovered: boolean | null;
  dataSource: string;
  sourceUrl?: string;
  sourceStatus: SourceStatus;
  datasetVersion?: string;
  retrievalDate?: string;
};

type ImportResultSummary = {
  imported: number;
  acceptedRows: number;
  rejectedRows: number;
  missingRequiredFields: string[];
  warnings: string[];
  sourceMode: 'IMPORTED' | 'DEMO_FALLBACK';
};

type InitialLoadStatus = 'Checking' | 'Records Loaded' | 'No Records' | 'Failed';

const legalContext = [
  'California’s CARB Mandatory Reporting Regulation requires covered facilities and suppliers to report greenhouse gas emissions.',
  'DPAL does not replace CARB or make final legal findings. DPAL reviews available public data, reported emissions, facility trends, and external evidence to identify possible discrepancies requiring further review.',
  'Cap-and-Invest / Cap-and-Trade context is considered where facilities are covered entities.',
  'EPA GHGRP cross-check should be used where reporting overlap exists.',
  'SB 253 / SB 261 disclosures can provide additional context for corporate climate statements.',
  'FTC greenwashing guidance may inform claim-risk analysis. Findings are preliminary and require legal review.',
  'Evidence limitations: data latency, scope mismatch, reporting boundary differences, and incomplete source coverage.',
];

const sourceRows = [
  'CARB MRR public data',
  'CARB facility emissions datasets',
  'CARB pollution mapping tool',
  'EPA GHGRP cross-check',
  'Company sustainability reports',
  'DPAL satellite observations',
  'DPAL field reports',
  'DPAL evidence vault',
];

const toPct = (baseline?: number, current?: number): string => {
  if (!baseline || baseline <= 0 || current == null) return 'Needs More Data';
  return `${(((baseline - current) / baseline) * 100).toFixed(2)}%`;
};

const parseClaim = (claim: string) => {
  const pctMatch = claim.match(/(\d+(?:\.\d+)?)\s*%/);
  const years = claim.match(/(20\d{2})/g) ?? [];
  return {
    claimReductionPct: pctMatch ? Number(pctMatch[1]) : null,
    baselineYear: years.length > 1 ? Number(years[0]) : null,
    currentYear: years.length > 1 ? Number(years[years.length - 1]) : null,
  };
};

const formatNumber = (value: number | '' | null | undefined) => {
  if (value == null || value === '') return 'n/a';
  return Number(value).toLocaleString();
};

const statusClass: Record<ChecklistStatus, string> = {
  Complete: 'border-emerald-600/70 text-emerald-200 bg-emerald-950/30',
  Missing: 'border-rose-600/70 text-rose-200 bg-rose-950/30',
  Optional: 'border-slate-600 text-slate-200 bg-slate-950/40',
  'Needs Review': 'border-amber-600/70 text-amber-200 bg-amber-950/30',
};

function sourceRibbonTone(mode: 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'NEEDS_SOURCE'): string {
  if (mode === 'LIVE') return 'border-emerald-500/50 bg-emerald-900/20 text-emerald-200';
  if (mode === 'IMPORTED') return 'border-cyan-500/50 bg-cyan-900/20 text-cyan-200';
  if (mode === 'DEMO_FALLBACK') return 'border-amber-500/50 bg-amber-900/20 text-amber-200';
  return 'border-violet-500/50 bg-violet-900/20 text-violet-200';
}

const carbFacilityMarker = L.divIcon({
  className: 'dpal-carb-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid #ffffff;box-shadow:0 0 0 4px rgba(34,197,94,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const manualMarker = L.divIcon({
  className: 'dpal-carb-manual-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#f59e0b;border:2px solid #ffffff;box-shadow:0 0 0 4px rgba(245,158,11,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const CA_CENTER: [number, number] = [36.7783, -119.4179];
const BRAND_SEARCH_HINTS = ['shell', 'chevron', 'exxon', 'bp', 'marathon', 'valero', 'pbf', 'phillips', 'tesoro'];
const CARB_SEARCH_ASSISTANT_ALIASES: Record<string, string[]> = {
  shell: ['shell oil', 'shell energy', 'motiva', 'equilon', 'fuel supplier'],
  chevron: ['chevron usa', 'chevron products', 'chevron refinery', 'fuel supplier'],
  exxon: ['exxonmobil', 'exxon mobil', 'xom', 'refinery operator'],
  bp: ['bp west coast', 'bp products', 'arco', 'fuel supplier'],
  marathon: ['marathon petroleum', 'mpc', 'refinery'],
  valero: ['valero energy', 'valero refinery', 'fuel supplier'],
  pbf: ['pbf energy', 'refinery operator'],
  phillips: ['phillips 66', 'psx', 'fuel supplier'],
  tesoro: ['andeavor', 'marathon petroleum', 'historical operator name'],
};
const COUNTY_CENTER_HINTS: Record<string, [number, number]> = {
  'santa clara': [37.333, -121.89],
  'los angeles': [34.0522, -118.2437],
  'orange': [33.7175, -117.8311],
  'alameda': [37.6017, -121.7195],
  'san diego': [32.7157, -117.1611],
};

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openPrintableEvidencePacket(title: string, payload: unknown) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
  if (!printWindow) return false;
  const escaped = JSON.stringify(payload, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      h1 { font-size: 22px; margin-bottom: 8px; }
      p { margin: 0 0 16px; color: #4b5563; }
      pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>Use your browser print dialog to save this evidence packet as PDF.</p>
    <pre>${escaped}</pre>
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
  return true;
}

function CarbMapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function CarbMapClickCapture({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function CarbMapInvalidateSize({ watchKey }: { watchKey: string }) {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 90);
    return () => window.clearTimeout(timer);
  }, [map, watchKey]);
  return null;
}

const CarbEmissionsAuditPage: React.FC<Props> = ({
  onReturn,
  onOpenCarbReport,
  onOpenCarbSituationRoom,
}) => {
  const auth = useAuth();
  const hasRoleSystem = Boolean(auth?.user && typeof auth.user.role === 'string' && auth.user.role.length > 0);
  const isAdmin = (auth?.user?.role ?? '').toLowerCase() === 'admin';
  const showAdminImportPanel = isAdmin;
  const showDeveloperImportTools = !hasRoleSystem;
  const [facilitySearch, setFacilitySearch] = useState({ q: '', facilityId: '', city: '', county: '', sector: '', year: '' });
  const [facilities, setFacilities] = useState<CarbFacility[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<CarbFacility | null>(null);
  const [sourceMode, setSourceMode] = useState<'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'NEEDS_SOURCE'>('DEMO_FALLBACK');
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [datasetVersion, setDatasetVersion] = useState('unavailable');
  const [retrievalDate, setRetrievalDate] = useState('');
  const [initialLoadStatus, setInitialLoadStatus] = useState<InitialLoadStatus>('Checking');
  const [carbSearchFailed, setCarbSearchFailed] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [baselineYear, setBaselineYear] = useState<number | ''>('');
  const [currentYear, setCurrentYear] = useState<number | ''>('');
  const [baselineEmissions, setBaselineEmissions] = useState<number | ''>('');
  const [currentEmissions, setCurrentEmissions] = useState<number | ''>('');
  const [methaneBaseline, setMethaneBaseline] = useState<number | ''>('');
  const [methaneCurrent, setMethaneCurrent] = useState<number | ''>('');
  const [n2oBaseline, setN2oBaseline] = useState<number | ''>('');
  const [n2oCurrent, setN2oCurrent] = useState<number | ''>('');
  const [co2Baseline, setCo2Baseline] = useState<number | ''>('');
  const [co2Current, setCo2Current] = useState<number | ''>('');
  const [companyClaim, setCompanyClaim] = useState('');
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [generatedCarbReport, setGeneratedCarbReport] = useState<CarbSpecializedReport | null>(null);
  const [carbReportBusy, setCarbReportBusy] = useState(false);
  const [carbReportNotice, setCarbReportNotice] = useState<string | null>(null);
  const [showDevImportOpen, setShowDevImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importDatasetVersion, setImportDatasetVersion] = useState('');
  const [importSourceUrl, setImportSourceUrl] = useState('');
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
  const pageSize = 8;
  const [aiNarrative, setAiNarrative] = useState('');
  const [hasProductionData, setHasProductionData] = useState(false);
  const [hasSatelliteEvidence, setHasSatelliteEvidence] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [companyPickerLoading, setCompanyPickerLoading] = useState(false);
  const [companyPickerError, setCompanyPickerError] = useState('');
  const [companyPickerQuery, setCompanyPickerQuery] = useState('');
  const [companyPickerMode, setCompanyPickerMode] = useState<'operator' | 'facility'>('operator');
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [facilityOptions, setFacilityOptions] = useState<string[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<string[]>([]);
  const [manualCoordinates, setManualCoordinates] = useState<[number, number] | null>(null);
  const [manualInvestigation, setManualInvestigation] = useState<ManualInvestigationDraft>({
    companyOperatorName: '',
    suspectedFacilityName: '',
    city: '',
    county: '',
    state: 'California',
    sourceUrl: '',
    notes: '',
  });
  const [isManualInvestigationMode, setIsManualInvestigationMode] = useState(false);
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [polygonDraftPoints, setPolygonDraftPoints] = useState<[number, number][]>([]);
  const [savedPolygonPoints, setSavedPolygonPoints] = useState<[number, number][]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<CarbWorkspaceTab>('overview');
  const [paneWidths, setPaneWidths] = useState({ left: 36, right: 26 });
  const [activeResizeHandle, setActiveResizeHandle] = useState<'left' | 'right' | null>(null);
  const workspaceSplitRef = useRef<HTMLDivElement | null>(null);
  const initialLoadAttemptedRef = useRef(false);
  const userInitiatedSearchRef = useRef(false);

  const updateSearchField = (key: keyof typeof facilitySearch, value: string) => {
    setFacilitySearch((prev) => ({ ...prev, [key]: value }));
    setHasSearched(false);
  };

  const facilityYearRecords = useMemo(
    () => (!selected ? [] : facilities.filter((row) => row.facilityId === selected.facilityId)),
    [facilities, selected],
  );

  const selectedCoordinates = useMemo<[number, number] | null>(() => {
    if (!selected || selected.latitude == null || selected.longitude == null) return null;
    return [selected.latitude, selected.longitude];
  }, [selected]);

  const mapCenter = selectedCoordinates ?? manualCoordinates ?? CA_CENTER;
  const centerPaneWidth = Math.max(20, 100 - paneWidths.left - paneWidths.right);
  const mapRenderWatchKey = `${paneWidths.left}-${paneWidths.right}-${mapCenter[0]}-${mapCenter[1]}-${drawingPolygon}-${savedPolygonPoints.length}-${polygonDraftPoints.length}`;
  const searchTerm = facilitySearch.q.trim();
  const importedDatasetLoaded = Boolean(datasetVersion && datasetVersion !== 'import-not-loaded' && datasetVersion !== 'unavailable');
  const isNoExactMatch = hasSearched && facilities.length === 0;
  const shouldShowBrandSuggestions = BRAND_SEARCH_HINTS.includes(searchTerm.toLowerCase());
  const searchAssistantAliases = CARB_SEARCH_ASSISTANT_ALIASES[searchTerm.toLowerCase()] ?? [];
  const carbDatasetReady = sourceMode === 'IMPORTED' || (sourceMode === 'LIVE' && Boolean(datasetVersion && datasetVersion !== 'import-not-loaded'));
  const searchReadiness: 'Ready' | 'Limited' | 'Not Ready' = carbDatasetReady ? 'Ready' : sourceMode === 'DEMO_FALLBACK' ? 'Limited' : 'Not Ready';
  const carbDataStatusReadiness: 'Ready' | 'Limited' | 'Not Ready' = useMemo(() => {
    if (carbSearchFailed || facilities.length === 0) return 'Not Ready';
    const hasSupportedSource = sourceMode === 'IMPORTED' || sourceMode === 'LIVE';
    if (hasSupportedSource && datasetVersion !== 'import-not-loaded') return 'Ready';
    if (sourceMode === 'LIVE' && datasetVersion === 'import-not-loaded') return 'Limited';
    return 'Not Ready';
  }, [carbSearchFailed, facilities.length, sourceMode, datasetVersion]);
  const carbDataStatusMessage = useMemo(() => {
    if (carbDataStatusReadiness === 'Ready') return 'CARB records are loaded and searchable.';
    if (carbDataStatusReadiness === 'Limited') return 'The endpoint responded, but the indexed dataset may not be fully loaded.';
    return 'No searchable CARB records are currently loaded.';
  }, [carbDataStatusReadiness]);
  const hasCountyNoMatch = isNoExactMatch && Boolean(facilitySearch.county.trim());
  const showImportWizardCta = facilities.length === 0 && datasetVersion === 'import-not-loaded';

  useEffect(() => {
    if (selectedCoordinates) setManualCoordinates(null);
  }, [selectedCoordinates]);

  useEffect(() => {
    if (!selected) {
      setDrawingPolygon(false);
      setPolygonDraftPoints([]);
      setSavedPolygonPoints([]);
    }
  }, [selected]);

  useEffect(() => {
    if (initialLoadAttemptedRef.current) return;
    if (hasSearched || isSearching) return;
    initialLoadAttemptedRef.current = true;
    setInitialLoadStatus('Checking');
    void (async () => {
      try {
        const res = await searchCarbFacilities({ limit: '500' });
        if (userInitiatedSearchRef.current) return;
        setFacilities(res.results as CarbFacility[]);
        setSourceMode(res.sourceMode);
        setSearchWarnings(res.warnings ?? []);
        setDatasetVersion(res.datasetVersion ?? 'unavailable');
        setRetrievalDate(res.retrievalDate ?? '');
        setCurrentPage(1);
        setHasSearched(true);
        setCarbSearchFailed(false);
        if (res.count > 0) {
          setInitialLoadStatus('Records Loaded');
          setMessage(`Loaded ${res.count} CARB facility record(s).`);
        } else {
          setInitialLoadStatus('No Records');
          setMessage('No CARB facilities were returned on initial load. Import an official CARB dataset or start a manual investigation.');
        }
      } catch (error: unknown) {
        if (userInitiatedSearchRef.current) return;
        setInitialLoadStatus('Failed');
        setCarbSearchFailed(true);
        setMessage(error instanceof Error ? `CARB initial load failed: ${error.message}` : 'CARB initial load failed: unknown error');
      }
    })();
  }, [hasSearched, isSearching]);

  const applyQuickSearch = (patch: Partial<typeof facilitySearch>) => {
    setFacilitySearch((prev) => ({ ...prev, ...patch }));
    setMessage('Search filters updated. Run Search CARB Facilities.');
  };

  const startManualInvestigation = () => {
    const companyName = searchTerm || manualInvestigation.companyOperatorName || 'Manual investigation subject';
    const countyQuery = facilitySearch.county.trim().toLowerCase();
    const countyCenter = COUNTY_CENTER_HINTS[countyQuery];
    setIsManualInvestigationMode(true);
    setSourceMode('NEEDS_SOURCE');
    setSelected(null);
    setManualInvestigation((prev) => ({
      ...prev,
      companyOperatorName: prev.companyOperatorName || companyName,
      county: prev.county || facilitySearch.county || prev.county,
      state: 'California',
    }));
    if (countyCenter) {
      setManualCoordinates(countyCenter);
    }
    setActiveWorkspaceTab('investigation');
    setMessage(`Manual investigation started for "${companyName}". No official CARB source confirmed yet.`);
  };

  useEffect(() => {
    if (!activeResizeHandle) return;
    const onMouseMove = (event: MouseEvent) => {
      const container = workspaceSplitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = event.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setPaneWidths((prev) => {
        if (activeResizeHandle === 'left') {
          const nextLeft = Math.max(24, Math.min(52, pct));
          const maxLeft = 100 - prev.right - 20;
          return { ...prev, left: Math.min(nextLeft, maxLeft) };
        }
        const rightWidth = 100 - pct;
        const nextRight = Math.max(20, Math.min(42, rightWidth));
        const maxRight = 100 - prev.left - 20;
        return { ...prev, right: Math.min(nextRight, maxRight) };
      });
    };
    const onMouseUp = () => setActiveResizeHandle(null);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [activeResizeHandle]);

  useEffect(() => {
    if (!selected) return;
    const years = Array.from(new Set(facilityYearRecords.map((row) => row.reportingYear))).sort((a, b) => b - a);
    setAvailableYears(years);
    if (!years.length) return;
    const nextCurrent = years[0];
    const nextBaseline = years[1] ?? years[0];
    setCurrentYear(nextCurrent);
    setBaselineYear(nextBaseline);
  }, [selected, facilityYearRecords]);

  useEffect(() => {
    if (!selected || !baselineYear || !currentYear) return;
    const baselineRecord = facilityYearRecords.find((row) => row.reportingYear === baselineYear);
    const currentRecord = facilityYearRecords.find((row) => row.reportingYear === currentYear);
    if (baselineRecord) {
      setBaselineEmissions(baselineRecord.totalCO2e ?? '');
      setMethaneBaseline(baselineRecord.methaneCH4 ?? '');
      setN2oBaseline(baselineRecord.nitrousOxideN2O ?? '');
      setCo2Baseline(baselineRecord.carbonDioxideCO2 ?? '');
    }
    if (currentRecord) {
      setCurrentEmissions(currentRecord.totalCO2e ?? '');
      setMethaneCurrent(currentRecord.methaneCH4 ?? '');
      setN2oCurrent(currentRecord.nitrousOxideN2O ?? '');
      setCo2Current(currentRecord.carbonDioxideCO2 ?? '');
    }
  }, [baselineYear, currentYear, selected, facilityYearRecords]);

  const claimParsed = useMemo(() => parseClaim(companyClaim), [companyClaim]);
  const calculatedReduction = toPct(Number(baselineEmissions), Number(currentEmissions));
  const methaneReduction = toPct(Number(methaneBaseline), Number(methaneCurrent));
  const n2oReduction = toPct(Number(n2oBaseline), Number(n2oCurrent));
  const co2Reduction = toPct(Number(co2Baseline), Number(co2Current));

  const integrityScore = useMemo(() => {
    if (!selected || !baselineEmissions || !currentEmissions) return null;
    const reported = Number(((Number(baselineEmissions) - Number(currentEmissions)) / Number(baselineEmissions)) * 100);
    const claimGapWeight = claimParsed.claimReductionPct == null ? 10 : Math.min(35, Math.abs(claimParsed.claimReductionPct - reported) * 1.2);
    const emissionsTrendWeight = reported < 0 ? 20 : Math.min(20, Math.abs(reported) * 0.4);
    const methaneTrend = methaneReduction === 'Needs More Data' ? 10 : Math.min(15, Math.abs(Number(methaneReduction.replace('%', ''))) * 0.25);
    const verificationWeight = selected.verificationStatus.toLowerCase().includes('verified') && selected.sourceStatus !== 'DEMO DATA' ? 0 : 10;
    const missingPenalty = methaneReduction === 'Needs More Data' || n2oReduction === 'Needs More Data' || co2Reduction === 'Needs More Data' ? 15 : 0;
    const satelliteEvidenceWeight = 8;
    return Math.max(0, Math.min(100, Math.round(claimGapWeight + emissionsTrendWeight + methaneTrend + verificationWeight + missingPenalty + satelliteEvidenceWeight)));
  }, [selected, baselineEmissions, currentEmissions, claimParsed.claimReductionPct, methaneReduction, n2oReduction, co2Reduction]);

  const riskLevel = integrityScore == null ? 'Needs More Data' : integrityScore <= 25 ? 'Low' : integrityScore <= 60 ? 'Medium' : 'High';

  const claimComparison = useMemo(() => {
    if (!companyClaim.trim()) return 'Claim requires more data';
    if (integrityScore == null) return 'Claim requires more data';
    if (integrityScore <= 20) return 'Claim appears consistent';
    if (integrityScore <= 45) return 'Claim appears partially supported';
    if (integrityScore <= 60) return 'Claim requires more data';
    return 'Claim may be inconsistent with reported CARB data';
  }, [companyClaim, integrityScore]);

  const calculatedReductionNumber = useMemo(() => {
    if (!baselineEmissions || Number(baselineEmissions) <= 0 || currentEmissions === '') return null;
    return Number((((Number(baselineEmissions) - Number(currentEmissions)) / Number(baselineEmissions)) * 100).toFixed(2));
  }, [baselineEmissions, currentEmissions]);

  const claimGap = useMemo(() => {
    if (claimParsed.claimReductionPct == null || calculatedReductionNumber == null) return null;
    return Number((claimParsed.claimReductionPct - calculatedReductionNumber).toFixed(2));
  }, [claimParsed.claimReductionPct, calculatedReductionNumber]);

  const claimVerificationClassification = useMemo(() => {
    if (!companyClaim.trim()) {
      return {
        label: 'Requires More Data',
        text: 'Enter a company climate claim to compare it against CARB-reported emissions.',
      };
    }
    if (claimParsed.claimReductionPct == null || calculatedReductionNumber == null || !baselineYear || !currentYear) {
      return {
        label: 'Requires More Data',
        text: 'DPAL requires both a quantifiable claim and complete year-over-year CARB emissions data before claim verification can be finalized.',
      };
    }
    const gap = claimGap ?? 0;
    const absGap = Math.abs(gap);
    if (absGap <= 3) {
      return {
        label: 'Consistent',
        text: `The claim appears generally consistent with available CARB data, with an estimated gap of ${absGap.toFixed(2)} percentage points.`,
      };
    }
    if (absGap <= 10) {
      return {
        label: 'Partially Supported',
        text: `The claim appears partially supported by available CARB data, with an estimated gap of ${absGap.toFixed(2)} percentage points.`,
      };
    }
    if (gap > 0) {
      return {
        label: 'Potentially Inconsistent',
        text: `The claim appears potentially inconsistent with available CARB data because the claimed reduction exceeds the reported reduction by ${absGap.toFixed(2)} percentage points.`,
      };
    }
    return {
      label: 'Potentially Inconsistent',
      text: `The claim appears potentially inconsistent with available CARB data because reported reduction trends differ from the claimed value by ${absGap.toFixed(2)} percentage points.`,
    };
  }, [companyClaim, claimParsed.claimReductionPct, calculatedReductionNumber, baselineYear, currentYear, claimGap]);

  const discrepancyInterpretation = useMemo(() => {
    if (riskLevel === 'Low') {
      return 'Available data does not show a major discrepancy, but the review should still be cross-checked with production data and permits.';
    }
    if (riskLevel === 'Medium') {
      return 'Available data suggests a meaningful discrepancy that should be reviewed with supporting records.';
    }
    if (riskLevel === 'High') {
      return 'Available data suggests a significant discrepancy requiring further review.';
    }
    return 'DPAL cannot classify this audit until required emissions or source data is available.';
  }, [riskLevel]);

  const verificationChecklist = useMemo(() => {
    const carbDataAvailable = baselineEmissions !== '' && currentEmissions !== '';
    const coordinatesAvailable = Boolean(selected && selected.latitude != null && selected.longitude != null);
    const evidencePacketReady = Boolean(selected && baselineYear && currentYear && carbDataAvailable);
    return [
      { item: 'Facility selected', status: selected ? 'Complete' : 'Missing' },
      { item: 'Baseline year selected', status: baselineYear ? 'Complete' : 'Missing' },
      { item: 'Current year selected', status: currentYear ? 'Complete' : 'Missing' },
      { item: 'CARB emissions data available', status: carbDataAvailable ? 'Complete' : 'Missing' },
      { item: 'Coordinates available', status: coordinatesAvailable ? 'Complete' : 'Needs Review' },
      { item: 'Climate claim entered', status: companyClaim.trim() ? 'Complete' : 'Optional' },
      { item: 'Production/output data available', status: hasProductionData ? 'Complete' : 'Needs Review' },
      { item: 'Satellite/activity evidence attached', status: hasSatelliteEvidence ? 'Complete' : 'Needs Review' },
      { item: 'Evidence packet ready', status: evidencePacketReady ? 'Complete' : 'Missing' },
    ] as Array<{ item: string; status: ChecklistStatus }>;
  }, [selected, baselineYear, currentYear, baselineEmissions, currentEmissions, companyClaim, hasProductionData, hasSatelliteEvidence]);

  const yearOverYearFinding = useMemo(() => {
    if (!selected || !baselineYear || !currentYear || calculatedReductionNumber == null || baselineEmissions === '' || currentEmissions === '') {
      return 'DPAL needs more data to complete the year-over-year comparison.';
    }
    const trendPhrase =
      calculatedReductionNumber >= 0
        ? `resulting in a ${Math.abs(calculatedReductionNumber).toFixed(2)}% reduction.`
        : `reported emissions increased by ${Math.abs(calculatedReductionNumber).toFixed(2)}%.`;
    return `DPAL compared ${baselineYear} and ${currentYear} reported emissions for ${selected.facilityName}. Reported CO2e changed from ${formatNumber(
      baselineEmissions,
    )} to ${formatNumber(currentEmissions)}, ${trendPhrase}`;
  }, [selected, baselineYear, currentYear, calculatedReductionNumber, baselineEmissions, currentEmissions]);

  const sourceModeText = useMemo(() => {
    if (sourceMode === 'LIVE' && !importedDatasetLoaded) {
      return 'Live endpoint responded, but no imported CARB dataset is loaded. Search results may be incomplete until an official CARB spreadsheet is imported or the live connector returns indexed records.';
    }
    if (sourceMode === 'LIVE') return 'This review uses a live CARB-connected dataset.';
    if (sourceMode === 'IMPORTED') return 'This review uses an imported CARB dataset derived from official reporting data.';
    if (sourceMode === 'NEEDS_SOURCE') return 'Manual investigation mode: official CARB source not confirmed yet.';
    return 'This review uses demo data and is not suitable for real conclusions.';
  }, [sourceMode, importedDatasetLoaded]);

  const recommendedNextSteps = useMemo(() => {
    const steps: string[] = [];
    if (sourceMode === 'IMPORTED') {
      steps.push('Confirm imported dataset matches official CARB download.');
      steps.push('Record dataset filename and retrieval date.');
    }
    if (!hasProductionData) {
      steps.push('Add production/output data to calculate emissions intensity.');
    }
    if (!hasSatelliteEvidence) {
      steps.push('Attach satellite or activity evidence for independent comparison.');
    }
    if (claimGap != null && Math.abs(claimGap) > 10) {
      steps.push('Review company public claim against CARB-reported emissions.');
    }
    if (!selected || selected.latitude == null || selected.longitude == null) {
      steps.push('Add facility coordinates before satellite comparison.');
    }
    if (riskLevel === 'Low') {
      steps.push('Save audit and export evidence packet for recordkeeping.');
    }
    if (!steps.length) {
      steps.push('Continue standard compliance review and archive supporting records.');
    }
    return steps;
  }, [sourceMode, hasProductionData, hasSatelliteEvidence, claimGap, selected, riskLevel]);

  const verificationSummary = useMemo(() => {
    return {
      facilityIdentity: {
        facilityName: selected?.facilityName ?? 'n/a',
        operatorName: selected?.operatorName ?? 'n/a',
        facilityId: selected?.facilityId ?? 'n/a',
        city: selected?.city ?? 'n/a',
        county: selected?.county ?? 'n/a',
        sector: selected?.sector ?? 'n/a',
        coordinates: selected && selected.latitude != null && selected.longitude != null ? `${selected.latitude}, ${selected.longitude}` : 'Coordinates unavailable',
      },
      dataBasis: {
        sourceMode,
        datasetVersion: selected?.datasetVersion ?? datasetVersion,
        retrievalDate: selected?.retrievalDate ?? (retrievalDate || 'n/a'),
        sourceStatus: selected?.sourceStatus ?? 'NEEDS REVIEW',
        plainEnglish: sourceModeText,
      },
      yearOverYearFinding,
      claimVerificationResult: {
        label: claimVerificationClassification.label,
        text: claimVerificationClassification.text,
        claimGapPct: claimGap,
      },
      discrepancyInterpretation: {
        integrityScore: integrityScore ?? 'Needs More Data',
        riskLevel,
        text: discrepancyInterpretation,
      },
      checklist: verificationChecklist,
      recommendedNextSteps,
      generatedAt: new Date().toISOString(),
    };
  }, [
    selected,
    sourceMode,
    datasetVersion,
    retrievalDate,
    sourceModeText,
    yearOverYearFinding,
    claimVerificationClassification,
    claimGap,
    integrityScore,
    riskLevel,
    discrepancyInterpretation,
    verificationChecklist,
    recommendedNextSteps,
  ]);

  const aiHelperCategories = useMemo(() => {
    const categories: Array<{ id: string; title: string; severity: 'Info' | 'Watch' | 'Priority'; rationale: string; suggestedActions: string[] }> = [];

    if (!selected) {
      categories.push({
        id: 'no-facility',
        title: 'Facility Selection Needed',
        severity: 'Info',
        rationale: 'A facility record is required before CARB discrepancy analysis can be categorized.',
        suggestedActions: ['Select a facility from search results.', 'Confirm reporting years and emissions fields.'],
      });
      return categories;
    }

    if (claimComparison.includes('inconsistent') || (integrityScore ?? 0) > 60) {
      categories.push({
        id: 'claim-inconsistency',
        title: 'Potential Claim Discrepancy - Requires Review',
        severity: 'Priority',
        rationale: 'Claim language appears not fully aligned with reported year-over-year emissions outcomes.',
        suggestedActions: [
          'Compare claim boundary language against CARB reporting boundary.',
          'Request supporting methodology notes from operator disclosures.',
          'Escalate to investigation workflow if discrepancy remains material.',
        ],
      });
    }

    if ((selected.verificationStatus || '').toLowerCase().includes('need') || selected.sourceStatus === 'NEEDS REVIEW') {
      categories.push({
        id: 'verification-gap',
        title: 'Verification Gap',
        severity: 'Watch',
        rationale: 'Verification status indicates missing or incomplete assurance signal.',
        suggestedActions: [
          'Confirm verification statement details in CARB file.',
          'Cross-check with EPA GHGRP and operator sustainability filings.',
        ],
      });
    }

    if (methaneReduction !== 'Needs More Data' && Number(methaneReduction.replace('%', '')) < 0) {
      categories.push({
        id: 'methane-uptrend',
        title: 'Methane Trend Concern',
        severity: 'Priority',
        rationale: 'Methane intensity appears to trend upward for selected comparison years.',
        suggestedActions: [
          'Review methane controls and flare/venting disclosures.',
          'Prioritize satellite methane layer comparison once location is confirmed.',
        ],
      });
    }

    if (!baselineEmissions || !currentEmissions || methaneReduction === 'Needs More Data' || co2Reduction === 'Needs More Data' || n2oReduction === 'Needs More Data') {
      categories.push({
        id: 'data-gaps',
        title: 'Data Completeness Gap',
        severity: 'Watch',
        rationale: 'One or more required emissions dimensions are missing for robust discrepancy scoring.',
        suggestedActions: [
          'Load additional year records for the selected facility.',
          'Populate missing CO2/CH4/N2O fields before final audit export.',
        ],
      });
    }

    if (!categories.length) {
      categories.push({
        id: 'stable-review',
        title: 'Baseline Consistency Check',
        severity: 'Info',
        rationale: 'Current indicators appear directionally consistent; maintain periodic review.',
        suggestedActions: ['Monitor next filing cycle for trend changes.', 'Retain evidence packet and source provenance metadata.'],
      });
    }

    return categories;
  }, [selected, claimComparison, integrityScore, methaneReduction, baselineEmissions, currentEmissions, co2Reduction, n2oReduction]);

  const missingEvidenceItems = useMemo(
    () => [
      !selected && !isManualInvestigationMode ? 'Facility not selected' : '',
      !baselineYear ? 'Baseline year missing' : '',
      !currentYear ? 'Current year missing' : '',
      baselineEmissions === '' || currentEmissions === '' ? 'CARB emissions data missing' : '',
      !(selected && selected.latitude != null && selected.longitude != null) ? 'Coordinates missing' : '',
      !companyClaim.trim() ? 'Climate claim optional/missing' : '',
      !hasProductionData ? 'Production/output data missing' : '',
      !hasSatelliteEvidence ? 'Satellite/activity evidence missing' : '',
    ].filter(Boolean),
    [
      selected,
      isManualInvestigationMode,
      baselineYear,
      currentYear,
      baselineEmissions,
      currentEmissions,
      companyClaim,
      hasProductionData,
      hasSatelliteEvidence,
    ],
  );

  const investigationExplanationCards = useMemo(
    () => [
      {
        title: 'Claim Gap',
        finding: claimGap == null ? 'Not calculated' : `${claimGap.toFixed(2)} percentage points`,
        whyItMatters: 'Large claim gaps can indicate mismatch between public claim language and reported emissions outcomes.',
        nextAction: 'Review claim boundary, baseline assumptions, and year selection.',
      },
      {
        title: 'Emissions Trend',
        finding: calculatedReductionNumber == null ? 'Trend unavailable' : `${calculatedReductionNumber.toFixed(2)}%`,
        whyItMatters: 'Year-over-year emissions trend is the core indicator for CARB discrepancy screening.',
        nextAction: 'Validate baseline/current records and confirm facility reporting continuity.',
      },
      {
        title: 'Methane Watch',
        finding: methaneReduction,
        whyItMatters: 'Methane shifts can materially change discrepancy and risk interpretation.',
        nextAction: 'Review methane controls and request additional supporting records if trend worsens.',
      },
      {
        title: 'Verification Signal',
        finding: selected?.verificationStatus || 'Needs Review',
        whyItMatters: 'Verification status helps estimate confidence in the reported emissions profile.',
        nextAction: 'Cross-check verifier context and supporting declarations.',
      },
      {
        title: 'Source Reliability',
        finding: `${sourceMode} (${datasetVersion || 'n/a'})`,
        whyItMatters: 'Search and claim findings depend on dataset quality and indexing state.',
        nextAction: carbDatasetReady ? 'Proceed with reviewed records.' : 'Import/index official CARB MRR dataset.',
      },
      {
        title: 'Missing Evidence',
        finding: missingEvidenceItems.slice(0, 4).join(', ') || 'No critical gaps flagged',
        whyItMatters: 'Missing evidence lowers report confidence and regulatory readiness.',
        nextAction: 'Complete checklist gaps before finalizing regulator-facing output.',
      },
      {
        title: 'Recommended Next Step',
        finding: recommendedNextSteps[0] || 'No recommendation available',
        whyItMatters: 'Prioritized next action keeps investigations focused and auditable.',
        nextAction: recommendedNextSteps[1] || 'Continue standard review workflow.',
      },
    ],
    [carbDatasetReady, calculatedReductionNumber, claimGap, datasetVersion, methaneReduction, recommendedNextSteps, selected?.verificationStatus, sourceMode, missingEvidenceItems],
  );

  const reportQualityRating = useMemo<'Draft' | 'Limited' | 'Review Ready' | 'Regulator Ready'>(() => {
    if (isManualInvestigationMode || !selected) return 'Draft';
    const hasGasBreakdown = methaneBaseline !== '' && methaneCurrent !== '' && n2oBaseline !== '' && n2oCurrent !== '' && co2Baseline !== '' && co2Current !== '';
    const hasClaim = Boolean(companyClaim.trim());
    const hasCoordinates = selected.latitude != null && selected.longitude != null;
    const hasSourceUrl = Boolean(selected.sourceUrl || manualInvestigation.sourceUrl);
    const checklistCompleteCount = verificationChecklist.filter((item) => item.status === 'Complete').length;
    if (!(carbDatasetReady && baselineYear && currentYear && baselineEmissions !== '' && currentEmissions !== '')) return 'Limited';
    if (!(hasClaim && hasCoordinates && hasGasBreakdown && hasSourceUrl)) return 'Limited';
    if (!(datasetVersion && retrievalDate)) return 'Review Ready';
    return checklistCompleteCount >= 6 ? 'Regulator Ready' : 'Review Ready';
  }, [isManualInvestigationMode, selected, methaneBaseline, methaneCurrent, n2oBaseline, n2oCurrent, co2Baseline, co2Current, companyClaim, manualInvestigation.sourceUrl, verificationChecklist, carbDatasetReady, baselineYear, currentYear, baselineEmissions, currentEmissions, datasetVersion, retrievalDate]);

  const canSaveOrExport = Boolean(hasSearched && selected && baselineYear && currentYear && baselineEmissions && currentEmissions);

  const dataSources = sourceRows.map((sourceName) => ({
    sourceName,
    sourceType: sourceName.includes('DPAL') ? 'DPAL' : sourceName.includes('CARB') ? 'CARB' : 'Cross-check',
    sourceUrl: selected?.sourceUrl ?? '',
    retrievalDate: selected?.retrievalDate ?? (retrievalDate || new Date().toISOString().slice(0, 10)),
    datasetVersion: selected?.datasetVersion ?? datasetVersion,
    sourceStatus: selected?.sourceStatus ?? 'NEEDS REVIEW',
    notes: 'Placeholder source descriptor for CARB audit module.',
  }));

  const evidencePacket = {
    auditId: savedAuditId ?? `CARB-${Date.now()}`,
    module: 'DPAL CARB Emissions Audit',
    facilityName: selected?.facilityName ?? manualInvestigation.suspectedFacilityName,
    operatorName: selected?.operatorName ?? manualInvestigation.companyOperatorName,
    carbFacilityId: selected?.facilityId ?? (isManualInvestigationMode ? 'MANUAL-DRAFT' : null),
    location: selected ? { latitude: selected.latitude, longitude: selected.longitude, city: selected.city, county: selected.county, state: 'California' } : null,
    county: selected?.county ?? manualInvestigation.county,
    sector: selected?.sector ?? (isManualInvestigationMode ? 'Manual Investigation' : ''),
    baselineYear,
    currentYear,
    baselineEmissions,
    currentEmissions,
    calculatedReduction,
    companyClaim,
    claimComparison,
    integrityScore,
    riskLevel,
    verificationStatus: selected?.verificationStatus ?? 'NEEDS REVIEW',
    dataSources,
    legalContext,
    limitations: [
      'CARB data may have reporting lag.',
      'Scope boundaries may differ from corporate claim language.',
      ...(isManualInvestigationMode ? ['Manual investigation draft - official CARB source not confirmed.'] : []),
    ],
    recommendedNextSteps: verificationSummary.recommendedNextSteps,
    verificationSummary,
    aiNarrative,
    generatedAt: new Date().toISOString(),
    dpalLedgerPlaceholder: { status: 'not_connected', mode: isManualInvestigationMode ? 'manual_draft' : 'standard' },
    checksumPlaceholder: 'pending-checksum',
    manualInvestigation: isManualInvestigationMode ? manualInvestigation : null,
    dataReadiness: {
      carbDatasetReady,
      searchReadiness,
      datasetVersion,
      retrievalDate,
      recordsIndexed: facilities.length,
      availableYears,
    },
    reportQuality: reportQualityRating,
    investigationFindings: investigationExplanationCards,
    searchContext: {
      searchTerm,
      filters: facilitySearch,
      sourceMode,
    },
    manualInvestigationFlag: isManualInvestigationMode,
    sourceIntegrityWarnings: [
      !carbDatasetReady ? 'Dataset readiness is limited. Search results may be incomplete.' : '',
      isManualInvestigationMode ? 'Manual investigation draft - official CARB source not confirmed.' : '',
    ].filter(Boolean),
  };

  const executeSearch = async () => {
    setIsSearching(true);
    try {
      const res = await searchCarbFacilities({
        q: facilitySearch.q,
        facilityId: facilitySearch.facilityId,
        city: facilitySearch.city,
        county: facilitySearch.county,
        sector: facilitySearch.sector,
        year: facilitySearch.year,
        limit: '500',
      });
      setFacilities(res.results as CarbFacility[]);
      setSourceMode(res.sourceMode);
      setSearchWarnings(res.warnings ?? []);
      setDatasetVersion(res.datasetVersion ?? 'unavailable');
      setRetrievalDate(res.retrievalDate ?? '');
      setCurrentPage(1);
      setHasSearched(true);
      setCarbSearchFailed(false);
      setMessage(`Loaded ${res.count} facility result(s). Source mode: ${res.sourceMode}.`);
      return res;
    } catch (error: unknown) {
      setFacilities([]);
      setHasSearched(true);
      setCarbSearchFailed(true);
      setMessage(error instanceof Error ? `CARB search failed: ${error.message}` : 'CARB search failed. Please retry.');
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    userInitiatedSearchRef.current = true;
    const hasAnyFilter = Object.values(facilitySearch).some((value) => value.trim().length > 0);
    if (!hasAnyFilter) {
      try {
        setIsManualInvestigationMode(false);
        setIsSearching(true);
        const res = await searchCarbFacilities({ limit: '500' });
        setFacilities(res.results as CarbFacility[]);
        setSourceMode(res.sourceMode);
        setSearchWarnings(res.warnings ?? []);
        setDatasetVersion(res.datasetVersion ?? 'unavailable');
        setRetrievalDate(res.retrievalDate ?? '');
        setCurrentPage(1);
        setHasSearched(true);
        setCarbSearchFailed(false);
        setMessage(res.count > 0
          ? `Loaded ${res.count} CARB facility record(s).`
          : 'No CARB facilities were returned. Import an official CARB dataset or start a manual investigation.');
      } catch (error: unknown) {
        setFacilities([]);
        setHasSearched(true);
        setCarbSearchFailed(true);
        setMessage(error instanceof Error ? `Could not load CARB facilities: ${error.message}` : 'Could not load CARB facilities.');
      } finally {
        setIsSearching(false);
      }
      return;
    }
    setIsManualInvestigationMode(false);
    let res;
    try {
      res = await executeSearch();
    } catch {
      return;
    }
    if (!res.count) {
      const canRunBroadFallback = Boolean(facilitySearch.city.trim() || facilitySearch.county.trim() || facilitySearch.sector.trim() || facilitySearch.year.trim());
      if (canRunBroadFallback) {
        const broadRes = await searchCarbFacilities({
          city: facilitySearch.city,
          county: facilitySearch.county,
          sector: facilitySearch.sector,
          year: facilitySearch.year,
          limit: '500',
        });
        if (broadRes.count > 0) {
          setFacilities(broadRes.results as CarbFacility[]);
          setSourceMode(broadRes.sourceMode);
          setSearchWarnings(broadRes.warnings ?? []);
          setDatasetVersion(broadRes.datasetVersion ?? 'unavailable');
          setRetrievalDate(broadRes.retrievalDate ?? '');
          setCurrentPage(1);
          setCarbSearchFailed(false);
          setMessage(`No exact match for "${facilitySearch.q}". Loaded ${broadRes.count} broader records using city/county/sector/year filters.`);
          return;
        }
      }
      setMessage(`No exact CARB match found for "${facilitySearch.q}". Use guided suggestions or start a manual investigation.`);
    }
  };

  const handleCountyFallbackSearch = async () => {
    userInitiatedSearchRef.current = true;
    setFacilitySearch((prev) => ({ ...prev, q: '', city: '', sector: '' }));
    const res = await searchCarbFacilities({ year: facilitySearch.year, limit: '500' });
    setFacilities(res.results as CarbFacility[]);
    setSourceMode(res.sourceMode);
    setDatasetVersion(res.datasetVersion ?? 'unavailable');
    setRetrievalDate(res.retrievalDate ?? '');
    setCurrentPage(1);
    setHasSearched(true);
    setCarbSearchFailed(false);
    setMessage(`Loaded ${res.count} California-wide records for fallback investigation.`);
  };

  const visibleSearchWarnings = useMemo(() => {
    if (sourceMode === 'IMPORTED') {
      return searchWarnings.filter((warning) => !warning.toLowerCase().includes('live carb source fetch failed'));
    }
    return searchWarnings;
  }, [searchWarnings, sourceMode]);

  const totalPages = Math.max(1, Math.ceil(facilities.length / pageSize));
  const paginatedFacilities = useMemo(
    () => facilities.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [facilities, currentPage],
  );
  const filteredCompanyOptions = useMemo(() => {
    const q = companyPickerQuery.trim().toLowerCase();
    if (!q) return companyOptions;
    return companyOptions.filter((name) => name.toLowerCase().includes(q));
  }, [companyOptions, companyPickerQuery]);
  const filteredFacilityOptions = useMemo(() => {
    const q = companyPickerQuery.trim().toLowerCase();
    if (!q) return facilityOptions;
    return facilityOptions.filter((name) => name.toLowerCase().includes(q));
  }, [facilityOptions, companyPickerQuery]);

  const handleImportDataset = async () => {
    const payload = {
      csvText: importCsvText.trim() || undefined,
      jsonText: importJsonText.trim() || undefined,
      datasetVersion: importDatasetVersion.trim() || undefined,
      sourceUrl: importSourceUrl.trim() || undefined,
    };
    const result = await importCarbFacilities(payload);
    setImportResult(result);
    setMessage(`Imported ${result.imported} CARB record(s). Source mode: ${result.sourceMode}.`);
    await executeSearch();
  };

  const handleOpenCompanyPicker = async () => {
    setShowCompanyPicker(true);
    setCompanyPickerError('');
    if (companyOptions.length) return;
    try {
      setCompanyPickerLoading(true);
      const res = await searchCarbFacilities({ limit: '500' });
      const allRows = res.results as CarbFacility[];
      const uniqueCompanies = Array.from(
        new Set(
          allRows
            .map((row) => (row.operatorName || '').trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      const uniqueFacilities = Array.from(
        new Set(
          allRows
            .map((row) => (row.facilityName || '').trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setCompanyOptions(uniqueCompanies);
      setFacilityOptions(uniqueFacilities);
    } catch (error: unknown) {
      setCompanyPickerError(error instanceof Error ? error.message : 'Failed to load company list.');
    } finally {
      setCompanyPickerLoading(false);
    }
  };

  const handlePickCompany = (value: string) => {
    setFacilitySearch((prev) => ({ ...prev, q: value }));
    setShowCompanyPicker(false);
    setCompanyPickerQuery('');
    setRecentCompanies((prev) => [value, ...prev.filter((item) => item !== value)].slice(0, 6));
    setMessage(`${companyPickerMode === 'operator' ? 'Company' : 'Facility'} selected: ${value}. Search filters updated.`);
  };

  const handleGenerateAiNarrative = () => {
    if (!selected) {
      setAiNarrative('AI helper narrative is pending. Select a CARB facility and comparison years to generate a review summary.');
      return;
    }

    const categorySummary = aiHelperCategories.map((category) => `${category.title} (${category.severity})`).join('; ');
    const text = [
      `DPAL CARB review summary for ${selected.facilityName} (${selected.facilityId}) in ${selected.city}, ${selected.county}.`,
      `Comparison years: baseline ${baselineYear || 'n/a'} and current ${currentYear || 'n/a'}. Reported reduction: ${calculatedReduction}.`,
      `Claim assessment outcome: ${claimComparison}. Integrity score: ${integrityScore ?? 'Needs More Data'} with risk level ${riskLevel}.`,
      `Current review categories: ${categorySummary || 'No categories generated yet'}.`,
      'This narrative is advisory and identifies potential discrepancy indicators for further review. It is not a final legal finding.',
    ].join(' ');

    setAiNarrative(text);
    setMessage('AI helper narrative generated for evidence packet drafting.');
  };

  const buildPayload = () => ({
    facilityId: selected?.facilityId,
    facilityName: selected?.facilityName,
    operatorName: selected?.operatorName,
    city: selected?.city,
    county: selected?.county,
    state: 'California',
    latitude: selected?.latitude,
    longitude: selected?.longitude,
    sector: selected?.sector,
    baselineYear: Number(baselineYear),
    currentYear: Number(currentYear),
    baselineEmissions: Number(baselineEmissions),
    currentEmissions: Number(currentEmissions),
    methaneBaseline: Number(methaneBaseline || 0),
    methaneCurrent: Number(methaneCurrent || 0),
    n2oBaseline: Number(n2oBaseline || 0),
    n2oCurrent: Number(n2oCurrent || 0),
    co2Baseline: Number(co2Baseline || 0),
    co2Current: Number(co2Current || 0),
    calculatedReductionPct: calculatedReduction,
    companyClaimText: companyClaim,
    claimReductionPct: claimParsed.claimReductionPct,
    claimGap: integrityScore == null || claimParsed.claimReductionPct == null || calculatedReduction === 'Needs More Data' ? null : claimParsed.claimReductionPct - Number(calculatedReduction.replace('%', '')),
    discrepancyScore: integrityScore,
    riskLevel,
    verificationStatus: selected?.verificationStatus ?? 'NEEDS REVIEW',
    dataSources,
    evidencePacket,
    legalContext,
    limitations: evidencePacket.limitations,
    recommendedNextSteps: evidencePacket.recommendedNextSteps,
    linkedMRVProjectId: null,
    linkedEvidenceVaultId: null,
    linkedReportId: null,
  });

  const hasManualDraftIdentity = Boolean(
    manualInvestigation.companyOperatorName.trim() || manualInvestigation.suspectedFacilityName.trim(),
  );
  const canGenerateCarbReport = isManualInvestigationMode
    ? hasManualDraftIdentity
    : Boolean(
      selected &&
        baselineYear &&
        currentYear &&
        baselineEmissions !== '' &&
        currentEmissions !== '',
    );
  const evidencePacketReady = Boolean(selected && baselineYear && currentYear && baselineEmissions !== '' && currentEmissions !== '');
  const canExportEvidencePacket = evidencePacketReady || isManualInvestigationMode;
  const currentWorkflowStep = !selected && !isManualInvestigationMode
    ? 'Search and select a facility'
    : !companyClaim.trim()
      ? 'Add company climate claim'
      : !generatedCarbReport
        ? 'Generate CARB specialized report'
        : activeWorkspaceTab !== 'situation'
          ? 'Review report and evidence tabs'
          : 'Situation room investigation active';
  const nextRecommendedAction = generatedCarbReport
    ? 'Continue review in Situation Room and finalize legal task list.'
    : canGenerateCarbReport
      ? 'Generate CARB report from current selected facility data.'
      : 'Select facility and reporting years to enable report generation.';
  const reportGateMessage = 'To generate a CARB report, select a CARB facility or start a manual investigation draft.';

  const handleSave = async () => {
    if (!canSaveOrExport) {
      setMessage('Search, select a CARB facility, and choose comparison years before saving an audit.');
      return;
    }
    const payload = buildPayload();
    const result = savedAuditId ? await updateCarbAudit(savedAuditId, payload) : await createCarbAudit(payload);
    setSavedAuditId(result.auditId);
    setMessage(`CARB audit saved: ${result.auditId}`);
  };

  const handleExport = async () => {
    if (!canSaveOrExport) {
      setMessage('Search and select a CARB facility with comparison years before exporting evidence.');
      return;
    }
    if (!savedAuditId) {
      downloadJsonFile(`${evidencePacket.auditId}.json`, evidencePacket);
      setMessage('Exported local CARB evidence packet JSON.');
      return;
    }
    const result = await exportCarbAudit(savedAuditId);
    downloadJsonFile(`${savedAuditId}.json`, result.export);
    setMessage(`Exported persisted CARB audit ${savedAuditId}.`);
  };

  const handleExportCarbEvidencePacket = async () => {
    await handleExport();
  };

  const handleExportPdf = async () => {
    if (!canSaveOrExport) {
      setMessage('Search and select a CARB facility with comparison years before exporting evidence.');
      return;
    }
    const packet = !savedAuditId ? evidencePacket : (await exportCarbAudit(savedAuditId)).export;
    const opened = openPrintableEvidencePacket(`DPAL CARB Evidence Packet ${savedAuditId ?? evidencePacket.auditId}`, packet);
    setMessage(opened ? 'Opened printable evidence packet. Use Print to save as PDF.' : 'Pop-up blocked. Allow pop-ups to export PDF.');
  };

  const handleGenerateCarbReport = async () => {
    if (!canGenerateCarbReport) {
      setCarbReportNotice(reportGateMessage);
      return;
    }
    setCarbReportBusy(true);
    setCarbReportNotice(null);
    try {
      const toNumberOrNull = (value: number | '' | null | undefined): number | null => {
        if (value === '' || value == null) return null;
        const next = Number(value);
        return Number.isFinite(next) ? next : null;
      };
      const calculatedReductionValue =
        calculatedReduction === 'Needs More Data'
          ? null
          : Number.parseFloat(calculatedReduction.replace('%', ''));
      const environmentalReadings = await resolveCarbEnvironmentalReadings({
        lat: selected?.latitude ?? null,
        lng: selected?.longitude ?? null,
        calculatedReductionNumber,
        methaneReduction,
        co2Reduction,
        n2oReduction,
      });

      const effectiveBaselineYear = baselineYear || new Date().getFullYear() - 1;
      const effectiveCurrentYear = currentYear || new Date().getFullYear();
      const effectiveSourceMode = isManualInvestigationMode ? 'NEEDS_SOURCE' : sourceMode;
      const draftFacilityId = selected?.facilityId ?? (isManualInvestigationMode ? 'MANUAL-DRAFT' : '');
      if (!draftFacilityId) {
        setCarbReportNotice(reportGateMessage);
        return;
      }
      const draft = buildCarbReport({
        auditId: savedAuditId ?? evidencePacket.auditId,
        createdBy: auth?.user?.fullName || auth?.user?.username || auth?.user?.email || 'DPAL user',
        facilityIdentity: {
          facilityId: draftFacilityId,
          facilityName: selected?.facilityName ?? (manualInvestigation.suspectedFacilityName || searchTerm || 'Manual facility subject'),
          operatorName: selected?.operatorName ?? (manualInvestigation.companyOperatorName || 'Manual investigation operator'),
          sector: selected?.sector ?? (isManualInvestigationMode ? 'Manual Investigation' : ''),
        },
        location: {
          city: selected?.city ?? manualInvestigation.city,
          county: selected?.county ?? manualInvestigation.county,
          state: manualInvestigation.state || 'California',
          latitude: selected?.latitude ?? null,
          longitude: selected?.longitude ?? null,
          coordinatesLabel:
            selected?.latitude != null && selected?.longitude != null
              ? `${selected.latitude}, ${selected.longitude}`
              : 'Coordinates unavailable / manual draft',
        },
        reportingYears: { baselineYear: effectiveBaselineYear, currentYear: effectiveCurrentYear },
        emissionsComparison: {
          baselineCO2e: Number(baselineEmissions || 0),
          currentCO2e: Number(currentEmissions || 0),
          calculatedReductionPct: calculatedReductionValue,
        },
        gasBreakdown: {
          methane: {
            baseline: toNumberOrNull(methaneBaseline),
            current: toNumberOrNull(methaneCurrent),
            reductionPct: methaneReduction === 'Needs More Data' ? null : Number.parseFloat(methaneReduction.replace('%', '')),
          },
          n2o: {
            baseline: toNumberOrNull(n2oBaseline),
            current: toNumberOrNull(n2oCurrent),
            reductionPct: n2oReduction === 'Needs More Data' ? null : Number.parseFloat(n2oReduction.replace('%', '')),
          },
          co2: {
            baseline: toNumberOrNull(co2Baseline),
            current: toNumberOrNull(co2Current),
            reductionPct: co2Reduction === 'Needs More Data' ? null : Number.parseFloat(co2Reduction.replace('%', '')),
          },
        },
        environmentalReadings,
        companyClaim,
        claimVerificationResult: `${claimVerificationClassification.label} - ${claimVerificationClassification.text}`,
        claimGapPct: claimGap,
        integrityScore,
        riskLevel,
        sourceMode: effectiveSourceMode,
        reportQualityRating,
        dataReadiness: {
          carbDatasetReady,
          searchReadiness,
          datasetVersion,
          retrievalDate,
          recordsIndexed: facilities.length,
        },
        investigationFindings: investigationExplanationCards.map((item) => ({
          title: item.title,
          finding: item.finding,
          whyItMatters: item.whyItMatters,
          nextAction: item.nextAction,
        })),
        sourceIntegrityWarnings: [
          !carbDatasetReady ? 'CARB dataset readiness is limited; search results may be incomplete.' : '',
          effectiveSourceMode === 'NEEDS_SOURCE' ? 'Manual investigation draft - official CARB source not confirmed.' : '',
        ].filter(Boolean),
        datasetVersion:
          effectiveSourceMode === 'DEMO_FALLBACK' || effectiveSourceMode === 'NEEDS_SOURCE'
            ? undefined
            : (selected?.datasetVersion ?? datasetVersion),
        retrievalDate:
          effectiveSourceMode === 'DEMO_FALLBACK' || effectiveSourceMode === 'NEEDS_SOURCE'
            ? undefined
            : (selected?.retrievalDate ?? retrievalDate ?? undefined),
        dataSources,
        legalContext,
        limitations: [
          ...evidencePacket.limitations,
          effectiveSourceMode === 'DEMO_FALLBACK'
            ? 'Demo/Fallback Data - Not suitable for final conclusions.'
            : effectiveSourceMode === 'NEEDS_SOURCE'
              ? 'Manual investigation draft - official CARB source not confirmed.'
              : 'Live/imported data requires official verification before final findings.',
        ],
        verificationChecklist: verificationSummary.checklist.map((entry) => ({
          item: entry.item,
          status: entry.status,
        })),
        recommendedNextSteps,
        aiNarrative: aiNarrative.trim() || verificationSummary.discrepancyInterpretation.text,
      });

      draft.qr.qrCodeDataUrl = await generateQrCodeDataUrl(draft.qr.verificationUrl);
      const logged = await logCarbReportToLedger(draft);
      saveCarbReport(logged);
      setGeneratedCarbReport(logged);
      setActiveWorkspaceTab('report');
      setCarbReportNotice(
        effectiveSourceMode === 'DEMO_FALLBACK'
          ? 'CARB report generated. Demo/Fallback Data - Not suitable for final conclusions.'
          : effectiveSourceMode === 'NEEDS_SOURCE'
            ? 'CARB report generated as manual investigation draft - official CARB source not confirmed.'
            : `CARB report generated. Dataset version: ${logged.datasetVersion || 'n/a'} | Retrieval date: ${logged.retrievalDate || 'n/a'}.`,
      );
    } catch (error) {
      setCarbReportNotice(
        error instanceof Error
          ? `Unable to generate CARB report: ${error.message}`
          : 'Unable to generate CARB report.',
      );
    } finally {
      setCarbReportBusy(false);
    }
  };

  const handleDownloadCarbReportPdf = async () => {
    if (!generatedCarbReport) {
      setCarbReportNotice('Generate CARB report before downloading PDF.');
      return;
    }
    setCarbReportBusy(true);
    try {
      const result = await downloadCarbReportPdf(generatedCarbReport);
      const updated = updateCarbReportPdfHash(generatedCarbReport.reportId, result.pdfHash) ?? generatedCarbReport;
      setGeneratedCarbReport(updated);
      setCarbReportNotice('CARB PDF report downloaded successfully.');
    } catch (error) {
      setCarbReportNotice(
        error instanceof Error
          ? `CARB PDF generation failed: ${error.message}`
          : 'CARB PDF generation failed.',
      );
    } finally {
      setCarbReportBusy(false);
    }
  };

  const handleOpenCarbReport = () => {
    if (!generatedCarbReport) {
      setCarbReportNotice('Generate CARB report before opening verification page.');
      return;
    }
    setActiveWorkspaceTab('report');
  };

  const handleOpenCarbSituationRoom = () => {
    if (!generatedCarbReport) {
      setCarbReportNotice('Generate CARB report before opening Situation Room.');
      return;
    }
    setActiveWorkspaceTab('situation');
  };

  const handleOpenShareableVerificationPage = () => {
    if (!generatedCarbReport) {
      setCarbReportNotice('Generate CARB report before opening shareable verification page.');
      return;
    }
    onOpenCarbReport?.(generatedCarbReport.reportId);
  };

  const handleOpenShareableSituationRoomLink = () => {
    if (!generatedCarbReport) {
      setCarbReportNotice('Generate CARB report before opening shareable situation room link.');
      return;
    }
    onOpenCarbSituationRoom?.(generatedCarbReport.situationRoom.roomId);
  };

  const handleCopyVerificationLink = async () => {
    if (!generatedCarbReport?.qr.verificationUrl) return;
    try {
      await navigator.clipboard.writeText(generatedCarbReport.qr.verificationUrl);
      setCarbReportNotice('Verification link copied.');
    } catch {
      setCarbReportNotice('Unable to copy verification link.');
    }
  };

  const handleCopySituationRoomLink = async () => {
    if (!generatedCarbReport?.situationRoom.roomUrl) return;
    try {
      await navigator.clipboard.writeText(generatedCarbReport.situationRoom.roomUrl);
      setCarbReportNotice('Situation room link copied.');
    } catch {
      setCarbReportNotice('Unable to copy situation room link.');
    }
  };

  return (
    <div className="mx-auto max-w-[1450px] px-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">CARB Investigation Workspace</h1>
        <button onClick={onReturn} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100">Return</button>
      </div>
      <p className="mb-2 text-sm text-slate-300">
        Search CARB-reported emissions, compare facility trends, test company climate claims, generate a professional report, export a full evidence packet, and manage ongoing review from one workspace.
      </p>
      <section className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/15 p-4 text-xs text-cyan-100">
        <h2 className="text-sm font-bold text-white">CARB Data Status</h2>
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3">
          <p>Live endpoint: <span className="text-cyan-200">{carbSearchFailed ? 'Failed' : 'Connected'}</span></p>
          <p>Source mode: <span className="text-cyan-200">{sourceMode}</span></p>
          <p>Indexed records: <span className="text-cyan-200">{facilities.length} / 500</span></p>
          <p>Dataset version: <span className="text-cyan-200">{datasetVersion || 'n/a'}</span></p>
          <p>Retrieval date: <span className="text-cyan-200">{retrievalDate || 'n/a'}</span></p>
          <p>Search quality: <span className="text-cyan-200">{carbDataStatusReadiness}</span></p>
        </div>
        <p className="mt-2 rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-slate-100">
          {carbDataStatusMessage}
        </p>
        {!carbDatasetReady ? (
          <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-amber-100">
            CARB endpoint responded, but no indexed/imported CARB dataset is loaded. Search results may be incomplete until official CARB MRR data is imported or the live connector returns indexed records.
          </p>
        ) : null}
      </section>
      <p className="mb-4 text-xs text-slate-400">
        Workflow: 1) Search 2) Select Facility 3) Compare Years 4) Run Investigation Engine 5) Generate CARB Report 6) Export Evidence Packet 7) Situation Room Review.
      </p>
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['overview', 'Overview'],
            ['search', 'Search'],
            ['investigation', 'Investigation Engine'],
            ['report', 'CARB Report'],
            ['evidence', 'Evidence Packet'],
            ['situation', 'Situation Room'],
            ['sources', 'Sources'],
            ['tasks', 'Tasks / Legal Review'],
          ] as Array<[CarbWorkspaceTab, string]>).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveWorkspaceTab(tabId)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                activeWorkspaceTab === tabId
                  ? 'border-cyan-500/60 bg-cyan-900/20 text-cyan-100'
                  : 'border-slate-700 bg-slate-950/40 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {activeWorkspaceTab === 'overview' ? (
        <section className="mt-4 space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
          <div>
            <p className="font-semibold text-white">What is happening now</p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <p>Selected facility: <span className="text-cyan-200">{selected?.facilityName ?? 'None'}</span></p>
              <p>Current step: <span className="text-cyan-200">{currentWorkflowStep}</span></p>
              <p>Source mode: <span className="text-cyan-200">{sourceMode}</span></p>
              <p>Report generated: <span className="text-cyan-200">{generatedCarbReport ? 'Yes' : 'No'}</span></p>
              <p>Evidence packet ready: <span className="text-cyan-200">{evidencePacketReady ? 'Yes' : 'No'}</span></p>
              <p>Situation room open: <span className="text-cyan-200">No</span></p>
              <p className="md:col-span-2 xl:col-span-2">Next recommended action: <span className="text-cyan-200">{nextRecommendedAction}</span></p>
            </div>
          </div>
          {showImportWizardCta ? (
            <div className="rounded-xl border border-amber-500/50 bg-amber-950/25 p-4 text-amber-100">
              <p className="text-sm font-bold">No searchable CARB records are loaded yet.</p>
              <p className="mt-1">
                The CARB endpoint responded, but DPAL has no indexed/imported CARB dataset. Import the official CARB MRR Facility and Entity Emissions spreadsheet to activate facility, county, operator, sector, and year search.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowDevImportOpen(true)} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white">Open Official CARB Import Wizard</button>
                <button type="button" onClick={startManualInvestigation} className="rounded-lg border border-violet-400/60 px-3 py-2 text-xs text-violet-200">Start Manual Investigation Draft</button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      {message ? <div className="mb-3 rounded-xl border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-200">{message}</div> : null}
      {showAdminImportPanel ? (
        <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold text-white">Admin CARB Import Panel</h2>
          <p className="mt-1 text-xs text-slate-300">Use official CARB MRR Facility and Entity Emissions spreadsheets. After importing, search by facility name, operator name, ARB/facility ID, county, sector, or reporting year.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
            <textarea
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="Paste CARB CSV text"
              className="h-28 rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200"
            />
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste CARB JSON array text"
              className="h-28 rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200"
            />
            <input
              value={importDatasetVersion}
              onChange={(e) => setImportDatasetVersion(e.target.value)}
              placeholder="datasetVersion"
              className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
            <input
              value={importSourceUrl}
              onChange={(e) => setImportSourceUrl(e.target.value)}
              placeholder="sourceUrl"
              className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
          </div>
          <button onClick={() => void handleImportDataset()} className="mt-3 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Import CARB Dataset</button>
          {importResult ? (
            <div className="mt-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-200">
              <p>Accepted rows: {importResult.acceptedRows}</p>
              <p>Rejected rows: {importResult.rejectedRows}</p>
              <p>Imported count: {importResult.imported}</p>
              <p>Missing required fields: {importResult.missingRequiredFields.length ? importResult.missingRequiredFields.join(', ') : 'None'}</p>
              <p>Source mode: {importResult.sourceMode}</p>
              <p>Warnings: {importResult.warnings.length ? importResult.warnings.join(' | ') : 'None'}</p>
            </div>
          ) : null}
        </section>
      ) : null}
      {showDeveloperImportTools ? (
        <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <button onClick={() => setShowDevImportOpen((v) => !v)} className="w-full text-left text-lg font-bold text-white">
            Developer Import Tools {showDevImportOpen ? '[-]' : '[+]'}
          </button>
          {showDevImportOpen ? (
            <div className="mt-3">
              <p className="mt-1 text-xs text-slate-300">Use official CARB MRR Facility and Entity Emissions spreadsheets. After importing, search by facility name, operator name, ARB/facility ID, county, sector, or reporting year.</p>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Official CARB Import Wizard</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Upload official CARB MRR spreadsheet or paste CSV/JSON.</li>
                  <li>Map columns.</li>
                  <li>Validate required fields.</li>
                  <li>Index searchable fields.</li>
                  <li>Confirm available years/counties/sectors.</li>
                  <li>Save dataset version and source URL.</li>
                </ol>
                <p className="mt-2 text-slate-400">County, operator, sector, year, and facility searches depend on the imported/indexed dataset.</p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
                <textarea
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="Paste CARB CSV text"
                  className="h-28 rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200"
                />
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Paste CARB JSON array text"
                  className="h-28 rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200"
                />
                <input
                  value={importDatasetVersion}
                  onChange={(e) => setImportDatasetVersion(e.target.value)}
                  placeholder="datasetVersion"
                  className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200"
                />
                <input
                  value={importSourceUrl}
                  onChange={(e) => setImportSourceUrl(e.target.value)}
                  placeholder="sourceUrl"
                  className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200"
                />
              </div>
              <button onClick={() => void handleImportDataset()} className="mt-3 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Import CARB Dataset</button>
              {importResult ? (
                <div className="mt-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-200">
                  <p>Accepted rows: {importResult.acceptedRows}</p>
                  <p>Rejected rows: {importResult.rejectedRows}</p>
                  <p>Imported count: {importResult.imported}</p>
                  <p>Missing required fields: {importResult.missingRequiredFields.length ? importResult.missingRequiredFields.join(', ') : 'None'}</p>
                  <p>Source mode: {importResult.sourceMode}</p>
                  <p>Warnings: {importResult.warnings.length ? importResult.warnings.join(' | ') : 'None'}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeWorkspaceTab === 'search' ? (
      <div ref={workspaceSplitRef} className="mt-4 flex min-h-[760px] gap-0 rounded-2xl border border-slate-700 bg-slate-900/70">
        <section style={{ flexBasis: `${paneWidths.left}%` }} className="min-w-[300px] overflow-hidden border-r border-slate-700">
          <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-4 py-3">
            <h2 className="text-lg font-bold text-white">Facility Search / Results</h2>
            <p className="mt-1 text-[11px] text-slate-400">Search and select facility without leaving this workspace.</p>
          </div>
          <div className="p-4">
          <p className="mt-1 text-xs text-slate-300">Search official/imported CARB records or start a manual investigation. DPAL will not make verified conclusions until a CARB source record is selected or imported.</p>
          <p className="mt-1 text-[11px] text-slate-400">Try searching by operator, facility, county, sector, or year. Public brand names may not match official reporting names.</p>
          <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-3 text-xs text-cyan-100">
            <p className="font-semibold">CARB Search Assistant</p>
            <p className="mt-1 text-cyan-100/90">
              CARB records may use legal entity names, facility names, fuel-supplier names, refinery names, or historical operators instead of public-facing brand names.
              Alias suggestions below are search hints only and never create a CARB match by themselves.
            </p>
            {searchTerm ? (
              <p className="mt-2 text-cyan-100/90">
                Current search: <span className="font-semibold">{searchTerm}</span> | Matches shown in this table come only from live/imported CARB dataset results.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyQuickSearch({ sector: 'Petroleum / Refinery' })} className="rounded border border-cyan-400/60 px-2 py-1">
                Search sector: Petroleum / Refinery
              </button>
              <button type="button" onClick={() => applyQuickSearch({ q: 'fuel supplier' })} className="rounded border border-cyan-400/60 px-2 py-1">
                Search fuel supplier
              </button>
              <button type="button" onClick={() => applyQuickSearch({ q: 'operator' })} className="rounded border border-cyan-400/60 px-2 py-1">
                Search operator names
              </button>
              <button type="button" onClick={() => applyQuickSearch({ q: 'refinery' })} className="rounded border border-cyan-400/60 px-2 py-1">
                Search refinery names
              </button>
            </div>
            {searchAssistantAliases.length ? (
              <div className="mt-2">
                <p className="text-cyan-100/90">Suggested alias searches for "{searchTerm}":</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {searchAssistantAliases.map((alias) => (
                    <button
                      key={alias}
                      type="button"
                      onClick={() => applyQuickSearch({ q: alias })}
                      className="rounded border border-cyan-300/60 bg-cyan-900/20 px-2 py-1"
                    >
                      {alias}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(facilitySearch).map(([k, v]) => (
              <input key={k} value={v} placeholder={k} onChange={(e) => updateSearchField(k as keyof typeof facilitySearch, e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            ))}
          </div>
          <button onClick={() => void handleSearch()} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Search CARB Facilities</button>
          <button
            onClick={() => void handleOpenCompanyPicker()}
            className="ml-2 mt-3 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100"
          >
            Pick Company
          </button>
          <p className="mt-2 text-xs text-slate-300">
            Results: {facilities.length} | Source mode: <span className="font-semibold">{sourceMode}</span> {isSearching ? '| Searching...' : ''}
          </p>
          <div className="mt-2">
            <span className="rounded-full border border-slate-600 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-200">
              Initial Load: {initialLoadStatus}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-400">Source confidence:</span>
            <span
              className={`rounded-full border px-2 py-0.5 font-semibold ${sourceRibbonTone(sourceMode)}`}
              title={
                sourceMode === 'LIVE'
                  ? 'Live CARB endpoint result stream. Records shown only if returned by the live dataset.'
                  : sourceMode === 'IMPORTED'
                    ? 'Imported CARB spreadsheet results. Verify filename, retrieval date, and official source.'
                    : sourceMode === 'DEMO_FALLBACK'
                      ? 'Demo/fallback mode only. Not suitable for final conclusions.'
                      : 'Manual investigation draft mode. Official CARB source not confirmed.'
              }
            >
              {sourceMode === 'LIVE' ? 'LIVE DATA' : sourceMode === 'IMPORTED' ? 'IMPORTED DATA' : sourceMode === 'DEMO_FALLBACK' ? 'DEMO DATA' : 'MANUAL DRAFT'}
            </span>
            <span
              className="rounded-full border border-slate-600 bg-slate-950/60 px-2 py-0.5 text-slate-300"
              title="DPAL never creates CARB matches from alias tips. Matches only appear when returned by live/imported CARB records."
            >
              Match integrity enforced
            </span>
          </div>
          {!hasSearched ? (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">
              Run a facility search to unlock facility selection, year comparison, and evidence export.
            </div>
          ) : null}
          {isNoExactMatch ? (
            <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-100">
              <p className="text-sm font-bold">No exact CARB match found</p>
              <p className="mt-1">
                DPAL could not find an exact CARB facility/operator match for this search. CARB records may use legal entity names, facility names, refineries, fuel-supplier names, or historical operator names instead of the public brand name.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                <p>Search term: <span className="text-amber-200">{searchTerm || 'n/a'}</span></p>
                <p>Source mode: <span className="text-amber-200">{sourceMode}</span></p>
                <p>Dataset version: <span className="text-amber-200">{datasetVersion || 'n/a'}</span></p>
                <p>Retrieval date: <span className="text-amber-200">{retrievalDate || 'n/a'}</span></p>
                <p>Imported dataset loaded: <span className="text-amber-200">{importedDatasetLoaded ? 'Yes' : 'No'}</span></p>
              </div>
              <p className="mt-2">Next recommended actions: broaden by facility/operator terms, add county/sector filters, import official CARB MRR spreadsheet, or start manual investigation.</p>
              <p className="mt-1 text-[11px] text-amber-100/90">
                Important: alias suggestions are guidance only. DPAL only treats records as CARB matches when returned by the live/imported CARB dataset.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => applyQuickSearch({ q: 'oil' })} className="rounded border border-amber-400/60 px-2 py-1">Broaden to "oil"</button>
                <button type="button" onClick={() => applyQuickSearch({ q: 'refinery' })} className="rounded border border-amber-400/60 px-2 py-1">Broaden to "refinery"</button>
                <button type="button" onClick={() => applyQuickSearch({ county: facilitySearch.county || 'Los Angeles' })} className="rounded border border-amber-400/60 px-2 py-1">Search by county</button>
                <button type="button" onClick={() => applyQuickSearch({ sector: 'Petroleum / Refinery' })} className="rounded border border-amber-400/60 px-2 py-1">Search by sector: Petroleum / Refinery</button>
                <button type="button" onClick={startManualInvestigation} className="rounded border border-violet-400/60 px-2 py-1 text-violet-200">Start Manual Investigation</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded border border-slate-600 px-2 py-1">Search operator names</span>
                <span className="rounded border border-slate-600 px-2 py-1">Search facility names</span>
                <span className="rounded border border-slate-600 px-2 py-1">Search fuel suppliers</span>
                <span className="rounded border border-slate-600 px-2 py-1">Search refineries</span>
                <span className="rounded border border-slate-600 px-2 py-1">Search imported CARB data</span>
              </div>
            </div>
          ) : null}
          {hasCountyNoMatch ? (
            <div className="mt-3 rounded-xl border border-violet-500/40 bg-violet-950/20 p-3 text-xs text-violet-100">
              <p className="text-sm font-bold">No indexed CARB records matched this county.</p>
              <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                <p>County searched: <span className="text-violet-200">{facilitySearch.county}</span></p>
                <p>Source mode: <span className="text-violet-200">{sourceMode}</span></p>
                <p>Dataset version: <span className="text-violet-200">{datasetVersion || 'n/a'}</span></p>
                <p>Dataset readiness: <span className="text-violet-200">{searchReadiness}</span></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleCountyFallbackSearch()} className="rounded border border-violet-400/60 px-2 py-1">Search all California records</button>
                <button type="button" onClick={() => applyQuickSearch({ city: 'San Jose' })} className="rounded border border-violet-400/60 px-2 py-1">Search by city</button>
                <button type="button" onClick={() => applyQuickSearch({ sector: 'Petroleum / Refinery' })} className="rounded border border-violet-400/60 px-2 py-1">Search by sector</button>
                <button type="button" onClick={() => setShowDevImportOpen(true)} className="rounded border border-violet-400/60 px-2 py-1">Open import wizard</button>
                <button type="button" onClick={startManualInvestigation} className="rounded border border-violet-400/60 px-2 py-1">Start Manual County Investigation</button>
              </div>
            </div>
          ) : null}
          {visibleSearchWarnings.length ? (
            <div className="mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-xs text-amber-200">
              {visibleSearchWarnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
            <MapContainer center={mapCenter} zoom={6} className="h-[340px] w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CarbMapInvalidateSize watchKey={mapRenderWatchKey} />
              <CarbMapRecenter center={mapCenter} />
              <CarbMapClickCapture onMapClick={(lat, lng) => {
                if (drawingPolygon) {
                  setPolygonDraftPoints((prev) => [...prev, [lat, lng]]);
                  return;
                }
                setManualCoordinates([lat, lng]);
              }} />
              {selectedCoordinates ? (
                <Marker position={selectedCoordinates} icon={carbFacilityMarker} />
              ) : null}
              {!selectedCoordinates && manualCoordinates ? (
                <Marker position={manualCoordinates} icon={manualMarker} />
              ) : null}
              {selectedCoordinates ? (
                <CircleMarker
                  center={selectedCoordinates}
                  radius={28}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.12 }}
                />
              ) : null}
              {savedPolygonPoints.length >= 3 ? (
                <Polygon
                  positions={savedPolygonPoints}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.18, weight: 2 }}
                />
              ) : null}
              {polygonDraftPoints.length >= 3 ? (
                <Polygon
                  positions={polygonDraftPoints}
                  pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 2, dashArray: '5 5' }}
                />
              ) : null}
            </MapContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (!selected) {
                  setMessage('Select a facility before drawing an investigation polygon.');
                  return;
                }
                setDrawingPolygon((prev) => !prev);
              }}
              className="rounded border border-amber-500/60 bg-amber-900/20 px-2 py-1 text-amber-100"
            >
              {drawingPolygon ? 'Stop Polygon Draw' : 'Draw Polygon'}
            </button>
            <button
              type="button"
              onClick={() => setPolygonDraftPoints((prev) => prev.slice(0, -1))}
              disabled={polygonDraftPoints.length === 0}
              className="rounded border border-slate-700 px-2 py-1 text-slate-200 disabled:opacity-50"
            >
              Undo Point
            </button>
            <button
              type="button"
              onClick={() => {
                if (polygonDraftPoints.length < 3) {
                  setMessage('Add at least 3 points before saving polygon.');
                  return;
                }
                setSavedPolygonPoints(polygonDraftPoints);
                setDrawingPolygon(false);
                setMessage(`Investigation polygon saved with ${polygonDraftPoints.length} points.`);
              }}
              disabled={polygonDraftPoints.length < 3}
              className="rounded border border-emerald-500/60 bg-emerald-900/20 px-2 py-1 text-emerald-100 disabled:opacity-50"
            >
              Save Polygon
            </button>
            <button
              type="button"
              onClick={() => {
                setPolygonDraftPoints([]);
                setSavedPolygonPoints([]);
                setDrawingPolygon(false);
                setMessage('Investigation polygon cleared.');
              }}
              className="rounded border border-slate-700 px-2 py-1 text-slate-200"
            >
              Clear Polygon
            </button>
            <span className="text-slate-400">
              Draft points: {polygonDraftPoints.length} | Saved points: {savedPolygonPoints.length}
            </span>
          </div>
          <div className="mt-2 rounded-xl border border-slate-700 p-3 text-sm text-slate-300">
            <p>Selected: {selected ? `${selected.facilityName} (${selected.city}, ${selected.county})` : 'None'}</p>
            <p>
              Marker: {selectedCoordinates ? `${selectedCoordinates[0]}, ${selectedCoordinates[1]}` : manualCoordinates ? `${manualCoordinates[0].toFixed(5)}, ${manualCoordinates[1].toFixed(5)} (manual)` : 'No coordinates set'}
            </p>
            <p>
              Investigation polygon: {savedPolygonPoints.length >= 3 ? `Saved (${savedPolygonPoints.length} points)` : drawingPolygon ? `Drawing (${polygonDraftPoints.length} points)` : 'Not saved'}
            </p>
          </div>
          {selected && (selected.latitude == null || selected.longitude == null) ? (
            <p className="mt-2 text-xs text-amber-300">Facility location missing from CARB dataset. Click on the map to place a temporary marker before satellite comparison.</p>
          ) : null}
          <div className="mt-3 overflow-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Facility Match Results</th>
                  <th className="px-3 py-2">Facility ID</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {!hasSearched ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-400" colSpan={7}>Search required before facility matches can be displayed.</td>
                  </tr>
                ) : paginatedFacilities.length ? paginatedFacilities.map((facility) => (
                  <tr key={`${facility.facilityId}-${facility.reportingYear}`} className="border-t border-slate-800">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{facility.facilityName}</div>
                      <div className="text-xs text-slate-400">{facility.operatorName}</div>
                    </td>
                    <td className="px-3 py-3">{facility.facilityId}</td>
                    <td className="px-3 py-3">{facility.city}</td>
                    <td className="px-3 py-3">{facility.reportingYear}</td>
                    <td className="px-3 py-3">{facility.sourceStatus}</td>
                    <td className="px-3 py-3">
                      <div
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          sourceMode === 'LIVE'
                            ? 'border-cyan-500/50 bg-cyan-900/20 text-cyan-200'
                            : sourceMode === 'IMPORTED'
                              ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-200'
                              : sourceMode === 'DEMO_FALLBACK'
                                ? 'border-amber-500/50 bg-amber-900/20 text-amber-200'
                                : 'border-violet-500/50 bg-violet-900/20 text-violet-200'
                        }`}
                        title="Only live/imported dataset rows are treated as CARB matches. Manual drafts and search hints are not official CARB records."
                      >
                        {sourceMode}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">{facility.datasetVersion || datasetVersion || 'n/a'}</p>
                      <p className="text-[10px] text-slate-500">{facility.retrievalDate || retrievalDate || 'n/a'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => {
                          setSelected(facility);
                          setActiveWorkspaceTab('investigation');
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-400" colSpan={7}>No facility matches found for the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {facilities.length > pageSize ? (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="rounded border border-slate-600 px-2 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <p>Page {currentPage} / {totalPages}</p>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="rounded border border-slate-600 px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
          </div>
        </section>
        <div
          role="separator"
          aria-label="Resize left and center panels"
          className="w-2 cursor-col-resize bg-slate-800/70 hover:bg-cyan-700/50"
          onMouseDown={() => setActiveResizeHandle('left')}
        />
        <section style={{ flexBasis: `${centerPaneWidth}%` }} className="min-w-[320px] overflow-hidden border-r border-slate-700">
          <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-4 py-3">
            <h2 className="text-lg font-bold text-white">Selected Facility + Map + Year Comparison</h2>
            <p className="mt-1 text-[11px] text-slate-400">Core facility profile and CARB emissions comparison workspace.</p>
          </div>
          <div className="p-4">
          {!hasSearched ? <p className="mt-1 text-xs text-amber-300">Search for a facility first. No search, no product.</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select value={String(baselineYear)} onChange={(e) => setBaselineYear(e.target.value ? Number(e.target.value) : '')} disabled={!selected} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200 disabled:opacity-50">
              <option value="">Baseline year</option>
              {availableYears.map((year) => <option key={`b-${year}`} value={year}>{year}</option>)}
            </select>
            <select value={String(currentYear)} onChange={(e) => setCurrentYear(e.target.value ? Number(e.target.value) : '')} disabled={!selected} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200 disabled:opacity-50">
              <option value="">Current year</option>
              {availableYears.map((year) => <option key={`c-${year}`} value={year}>{year}</option>)}
            </select>
            <input value={String(baselineEmissions)} onChange={(e) => setBaselineEmissions(e.target.value ? Number(e.target.value) : '')} placeholder="Baseline CO2e" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(currentEmissions)} onChange={(e) => setCurrentEmissions(e.target.value ? Number(e.target.value) : '')} placeholder="Current CO2e" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(methaneBaseline)} onChange={(e) => setMethaneBaseline(e.target.value ? Number(e.target.value) : '')} placeholder="Methane baseline" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(methaneCurrent)} onChange={(e) => setMethaneCurrent(e.target.value ? Number(e.target.value) : '')} placeholder="Methane current" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(n2oBaseline)} onChange={(e) => setN2oBaseline(e.target.value ? Number(e.target.value) : '')} placeholder="N2O baseline" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(n2oCurrent)} onChange={(e) => setN2oCurrent(e.target.value ? Number(e.target.value) : '')} placeholder="N2O current" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(co2Baseline)} onChange={(e) => setCo2Baseline(e.target.value ? Number(e.target.value) : '')} placeholder="CO2 baseline" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
            <input value={String(co2Current)} onChange={(e) => setCo2Current(e.target.value ? Number(e.target.value) : '')} placeholder="CO2 current" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
          </div>
          <textarea value={companyClaim} onChange={(e) => setCompanyClaim(e.target.value)} placeholder="Paste climate claim text here..." className="mt-3 h-24 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
          <p className="mt-2 text-xs text-slate-400">Parsed claim: reduction {claimParsed.claimReductionPct ?? 'n/a'}% | baseline {claimParsed.baselineYear ?? 'n/a'} | current {claimParsed.currentYear ?? 'n/a'}</p>
          <p className="mt-2 text-sm text-slate-300">{claimComparison}</p>
          {isManualInvestigationMode ? (
            <div className="mt-3 rounded-xl border border-violet-500/40 bg-violet-950/15 p-3 text-xs text-violet-100">
              <p className="font-semibold">Manual Investigation Draft</p>
              <p className="mt-1">Manual investigation draft - official CARB source not confirmed.</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input value={manualInvestigation.companyOperatorName} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, companyOperatorName: e.target.value }))} placeholder="Company/operator name" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
                <input value={manualInvestigation.suspectedFacilityName} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, suspectedFacilityName: e.target.value }))} placeholder="Suspected facility name" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
                <input value={manualInvestigation.city} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, city: e.target.value }))} placeholder="City" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
                <input value={manualInvestigation.county} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, county: e.target.value }))} placeholder="County" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
                <input value={manualInvestigation.state} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, state: e.target.value }))} placeholder="State" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
                <input value={manualInvestigation.sourceUrl} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, sourceUrl: e.target.value }))} placeholder="Source URL" className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
              </div>
              <textarea value={manualInvestigation.notes} onChange={(e) => setManualInvestigation((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Manual investigation notes" className="mt-2 h-20 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-slate-700 p-3 text-sm text-slate-200">
            <p>Reported reduction: <span className="font-semibold">{calculatedReduction}</span></p>
            <p>Methane reduction: <span className="font-semibold">{methaneReduction}</span></p>
            <p>CO2 reduction: <span className="font-semibold">{co2Reduction}</span></p>
            <p>N2O reduction: <span className="font-semibold">{n2oReduction}</span></p>
            {!baselineEmissions || !currentEmissions ? <p className="mt-1 text-amber-300">Needs More Data: emissions records missing for one or both selected years.</p> : null}
          </div>
          <div className="mt-3 rounded-xl border border-slate-700 p-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400">Baseline / Current Year Comparison</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
              <p className="font-semibold text-white">Metric</p>
              <p className="font-semibold text-white">{baselineYear || 'Baseline'}</p>
              <p className="font-semibold text-white">{currentYear || 'Current'}</p>
              <p>Total CO2e</p>
              <p>{formatNumber(baselineEmissions)}</p>
              <p>{formatNumber(currentEmissions)}</p>
              <p>Methane CH4</p>
              <p>{formatNumber(methaneBaseline)}</p>
              <p>{formatNumber(methaneCurrent)}</p>
              <p>Nitrous Oxide N2O</p>
              <p>{formatNumber(n2oBaseline)}</p>
              <p>{formatNumber(n2oCurrent)}</p>
              <p>Carbon Dioxide CO2</p>
              <p>{formatNumber(co2Baseline)}</p>
              <p>{formatNumber(co2Current)}</p>
            </div>
          </div>
          </div>
        </section>
        <div
          role="separator"
          aria-label="Resize center and right panels"
          className="w-2 cursor-col-resize bg-slate-800/70 hover:bg-cyan-700/50"
          onMouseDown={() => setActiveResizeHandle('right')}
        />
        <section style={{ flexBasis: `${paneWidths.right}%` }} className="min-w-[280px] overflow-hidden">
          <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-4 py-3">
            <h2 className="text-lg font-bold text-white">DPAL Investigation Engine</h2>
            <p className="mt-1 text-[11px] text-slate-400">Live discrepancy posture, source quality, and next-action guidance.</p>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-widest text-slate-400">Integrity Score</p>
              <p className="text-3xl font-black text-white">{integrityScore ?? 'Needs More Data'}</p>
              <p className="mt-1 text-sm text-slate-300">Risk level: {riskLevel}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">Investigation Snapshot</p>
              <p className="mt-2">Source mode: <span className="text-cyan-200">{sourceMode}</span></p>
              <p>Dataset version: <span className="text-cyan-200">{datasetVersion || 'n/a'}</span></p>
              <p>Retrieval date: <span className="text-cyan-200">{retrievalDate || 'n/a'}</span></p>
              <p>Claim result: <span className="text-cyan-200">{claimVerificationClassification.label}</span></p>
              <p>Claim gap: <span className="text-cyan-200">{claimGap == null ? 'n/a' : `${claimGap.toFixed(2)}%`}</span></p>
              <p className="mt-2 text-[11px] text-amber-200">{sourceModeText}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">Top Recommended Actions</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {recommendedNextSteps.slice(0, 5).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">Investigation Engine Score Explanation</p>
              <div className="mt-2 space-y-2">
                {investigationExplanationCards.map((card) => (
                  <div key={card.title} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <p className="font-semibold text-white">{card.title}</p>
                    <p>Finding: {card.finding}</p>
                    <p>Why it matters: {card.whyItMatters}</p>
                    <p>Next action: {card.nextAction}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">EPA GHGRP Cross-Check</p>
              <p className="mt-1">
                Future cross-check panel for comparing CARB-reported facility emissions against federal GHGRP records where overlap exists. No federal match is asserted until a real EPA connector or imported EPA dataset returns records.
              </p>
            </div>
            <CarbIntelligenceReader
              facilityName={selected?.facilityName}
              facilityId={selected?.facilityId}
              sourceMode={sourceMode}
              baselineYear={baselineYear}
              currentYear={currentYear}
              claimComparison={claimComparison}
              integrityScore={integrityScore}
              riskLevel={riskLevel}
              categories={aiHelperCategories}
              recommendedNextSteps={recommendedNextSteps}
            />
          </div>
        </section>
      </div>
      ) : null}

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Integrity Score</p>
          <p className="text-3xl font-black text-white">{integrityScore ?? 'Needs More Data'}</p>
          <p className="mt-1 text-sm text-slate-300">Risk level: {riskLevel}</p>
          <p className="mt-2 text-xs text-slate-400">
            Integrity Score measures record completeness, consistency, and verification strength. It does not determine guilt, liability, or regulatory violation.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-widest text-slate-400">CARB Data Sources</p>
          <p className="text-sm text-slate-300">Source mode: {sourceMode} | Dataset version: {datasetVersion} | Retrieval date: {retrievalDate || 'n/a'}</p>
          {sourceMode === 'IMPORTED' ? (
            <p className="mt-1 text-xs text-emerald-300">
              Imported CARB dataset loaded. Confirm filename, retrieval date, and official source before final use.
            </p>
          ) : null}
          {sourceMode === 'LIVE' && !importedDatasetLoaded ? (
            <p className="mt-1 text-xs text-amber-300">
              Live endpoint responded, but no imported CARB dataset is loaded. Search results may be incomplete until an official CARB spreadsheet is imported or the live connector returns indexed records.
            </p>
          ) : null}
          {sourceMode === 'DEMO_FALLBACK' ? (
            <p className="mt-1 text-xs text-amber-300">
              Demo/fallback data only - not suitable for final conclusions.
            </p>
          ) : null}
          {sourceMode === 'NEEDS_SOURCE' ? (
            <p className="mt-1 text-xs text-violet-300">
              Manual investigation mode active - official CARB source not confirmed.
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-200">
            {dataSources.map((s) => <p key={s.sourceName}>{s.sourceName} | {s.sourceStatus} | {s.datasetVersion}</p>)}
          </div>
        </div>
      </section>

      {showCompanyPicker ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
          <div className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Pick Company / Facility (Inline Panel)</h3>
              <button onClick={() => setShowCompanyPicker(false)} className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200">Close</button>
            </div>
            <p className="mt-1 text-xs text-slate-300">Search company/operator or facility names, review suggested strategies, or start a manual investigation if exact CARB naming is unknown.</p>
            <div className="mt-3 inline-flex rounded-lg border border-slate-700 bg-slate-950/60 p-1 text-xs">
              <button
                onClick={() => setCompanyPickerMode('operator')}
                className={`rounded-md px-3 py-1 ${companyPickerMode === 'operator' ? 'bg-indigo-700 text-white' : 'text-slate-300'}`}
              >
                Company
              </button>
              <button
                onClick={() => setCompanyPickerMode('facility')}
                className={`rounded-md px-3 py-1 ${companyPickerMode === 'facility' ? 'bg-indigo-700 text-white' : 'text-slate-300'}`}
              >
                Facility
              </button>
            </div>
            <input
              value={companyPickerQuery}
              onChange={(e) => setCompanyPickerQuery(e.target.value)}
              placeholder={companyPickerMode === 'operator' ? 'Filter company names...' : 'Filter facility names...'}
              className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
            {companyPickerLoading ? <p className="mt-3 text-sm text-slate-300">Loading company list...</p> : null}
            {companyPickerError ? <p className="mt-3 text-sm text-rose-300">{companyPickerError}</p> : null}
            <div className="mt-3 max-h-80 overflow-auto space-y-2">
              {recentCompanies.length ? (
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2">
                  <p className="text-xs text-slate-400">Recent companies</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {recentCompanies.map((name) => (
                      <button key={`recent-${name}`} type="button" onClick={() => handlePickCompany(name)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200">
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {(companyPickerMode === 'operator' ? filteredCompanyOptions : filteredFacilityOptions).map((name) => (
                <button
                  key={name}
                  onClick={() => handlePickCompany(name)}
                  className="w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:border-emerald-500"
                >
                  {name}
                </button>
              ))}
              {!companyPickerLoading && !filteredCompanyOptions.length ? (
                <p className="text-sm text-slate-400">
                  {companyPickerMode === 'operator' ? 'No company names found for this filter.' : 'No facility names found for this filter.'}
                </p>
              ) : null}
            </div>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">Suggested search strategies</p>
              <p className="mt-1">Try operator legal entity names, facility names, refinery names, county + sector combinations, and reporting year filters.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => applyQuickSearch({ sector: 'Petroleum / Refinery' })} className="rounded border border-slate-600 px-2 py-1">Search refineries</button>
                <button type="button" onClick={() => applyQuickSearch({ year: String(new Date().getFullYear() - 1) })} className="rounded border border-slate-600 px-2 py-1">Search by reporting year</button>
                <button type="button" onClick={startManualInvestigation} className="rounded border border-violet-500/50 px-2 py-1 text-violet-200">Start Manual Investigation</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeWorkspaceTab === 'investigation' ? (
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-bold text-white">Verification Summary</h2>
        <p className="mt-1 text-xs text-slate-300">Plain-English DPAL verification summary based on selected CARB facility data and current comparison inputs.</p>

        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400">Facility identity</p>
            <p className="mt-1"><span className="text-slate-400">Name:</span> {verificationSummary.facilityIdentity.facilityName}</p>
            <p><span className="text-slate-400">Operator:</span> {verificationSummary.facilityIdentity.operatorName}</p>
            <p><span className="text-slate-400">Facility ID:</span> {verificationSummary.facilityIdentity.facilityId}</p>
            <p><span className="text-slate-400">City/County:</span> {verificationSummary.facilityIdentity.city}, {verificationSummary.facilityIdentity.county}</p>
            <p><span className="text-slate-400">Sector:</span> {verificationSummary.facilityIdentity.sector}</p>
            <p><span className="text-slate-400">Coordinates:</span> {verificationSummary.facilityIdentity.coordinates}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400">Data basis</p>
            <p className="mt-1"><span className="text-slate-400">Source mode:</span> {verificationSummary.dataBasis.sourceMode}</p>
            <p><span className="text-slate-400">Dataset version:</span> {verificationSummary.dataBasis.datasetVersion}</p>
            <p><span className="text-slate-400">Retrieval date:</span> {verificationSummary.dataBasis.retrievalDate}</p>
            <p><span className="text-slate-400">Source status:</span> {verificationSummary.dataBasis.sourceStatus}</p>
            <p className="mt-2 text-xs text-slate-300">{verificationSummary.dataBasis.plainEnglish}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-widest text-slate-400">Year-over-year finding</p>
          <p className="mt-1">{verificationSummary.yearOverYearFinding}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400">Claim verification result</p>
            <p className="mt-1"><span className="text-slate-400">Classification:</span> {verificationSummary.claimVerificationResult.label}</p>
            <p className="mt-1">{verificationSummary.claimVerificationResult.text}</p>
            <p className="mt-1 text-xs text-slate-400">
              Claim gap: {verificationSummary.claimVerificationResult.claimGapPct == null ? 'n/a' : `${verificationSummary.claimVerificationResult.claimGapPct.toFixed(2)} percentage points`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400">Discrepancy interpretation</p>
            <p className="mt-1"><span className="text-slate-400">Integrity Score:</span> {String(verificationSummary.discrepancyInterpretation.integrityScore)}</p>
            <p><span className="text-slate-400">Risk level:</span> {verificationSummary.discrepancyInterpretation.riskLevel}</p>
            <p className="mt-1">{verificationSummary.discrepancyInterpretation.text}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-widest text-slate-400">Verification checklist</p>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={hasProductionData} onChange={(e) => setHasProductionData(e.target.checked)} />
              Production/output data available
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={hasSatelliteEvidence} onChange={(e) => setHasSatelliteEvidence(e.target.checked)} />
              Satellite/activity evidence attached
            </label>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-2">
            {verificationSummary.checklist.map((entry) => (
              <div key={entry.item} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
                <span>{entry.item}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass[entry.status]}`}>{entry.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-widest text-slate-400">Recommended next steps</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {verificationSummary.recommendedNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {activeWorkspaceTab === 'sources' ? (
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-bold text-white">Legal / Regulatory Context</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {legalContext.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
      ) : null}

      {activeWorkspaceTab === 'tasks' ? (
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-bold text-white">AI Helper Review Categories</h2>
        <p className="mt-1 text-xs text-slate-300">
          Advisory analysis only. Uses discrepancy and data-quality signals to prioritize follow-up review categories.
        </p>
        <div className="mt-3 space-y-3">
          {aiHelperCategories.map((category) => (
            <div key={category.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{category.title}</p>
                <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200">{category.severity}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">{category.rationale}</p>
              <div className="mt-2 text-xs text-slate-300">
                Suggested actions: {category.suggestedActions.join(' | ')}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">AI Narrative Draft</p>
            <button
              onClick={() => handleGenerateAiNarrative()}
              className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Generate AI Narrative
            </button>
          </div>
          <textarea
            value={aiNarrative}
            onChange={(e) => setAiNarrative(e.target.value)}
            placeholder="Generated narrative will appear here. You can edit before saving/export."
            className="mt-2 h-28 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-200"
          />
        </div>
      </section>
      ) : null}

      {activeWorkspaceTab === 'report' ? (
      <section className="mt-4 space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">
          Current report quality: <span className="font-semibold">{reportQualityRating}</span>
        </p>
        {!canGenerateCarbReport ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
            {reportGateMessage}
          </p>
        ) : null}
        {isManualInvestigationMode ? (
          <p className="rounded-lg border border-violet-500/40 bg-violet-950/20 px-3 py-2 text-xs text-violet-100">
            Manual investigation draft - official CARB source not confirmed.
          </p>
        ) : null}
        <CarbReportPanel
          report={generatedCarbReport}
          canGenerate={canGenerateCarbReport}
          busy={carbReportBusy}
          notice={carbReportNotice}
          onGenerateReport={() => void handleGenerateCarbReport()}
          onDownloadPdf={() => void handleDownloadCarbReportPdf()}
          onOpenReport={handleOpenCarbReport}
          onOpenSituationRoom={handleOpenCarbSituationRoom}
          onExportEvidencePacket={() => void handleExportCarbEvidencePacket()}
          onCopyVerificationLink={() => void handleCopyVerificationLink()}
          onCopySituationRoomLink={() => void handleCopySituationRoomLink()}
          onOpenShareableReportPage={handleOpenShareableVerificationPage}
          onOpenShareableSituationRoomPage={handleOpenShareableSituationRoomLink}
        />
        {generatedCarbReport ? (
          <CarbReportViewer
            reportId={generatedCarbReport.reportId}
            onReturn={() => setActiveWorkspaceTab('overview')}
            embedded
            onOpenSituationRoom={() => setActiveWorkspaceTab('situation')}
          />
        ) : null}
      </section>
      ) : null}

      {activeWorkspaceTab === 'evidence' ? (
      <section className="mt-4 space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4 text-xs text-slate-300">
          <h2 className="text-sm font-bold text-white">Evidence Packet Readiness</h2>
          {!canExportEvidencePacket ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-amber-100">
              Evidence packet is not ready. Select a facility and reporting years first, or start a manual investigation draft.
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
            <p>Selected facility: <span className="text-cyan-200">{selected?.facilityName || (isManualInvestigationMode ? (manualInvestigation.suspectedFacilityName || 'Manual draft subject') : 'Not ready')}</span></p>
            <p>Reporting years: <span className="text-cyan-200">{baselineYear || 'n/a'} / {currentYear || 'n/a'}</span></p>
            <p>Calculated reduction: <span className="text-cyan-200">{calculatedReduction}</span></p>
            <p>Claim comparison: <span className="text-cyan-200">{claimComparison}</span></p>
            <p>Risk level: <span className="text-cyan-200">{riskLevel}</span></p>
            <p>Source mode: <span className="text-cyan-200">{sourceMode}</span></p>
          </div>
          <p className="mt-2">Limitations: {evidencePacket.limitations.join(' | ')}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-bold text-white">Audit Backend Actions (Existing Service Flow)</h2>
          <p className="mt-1 text-xs text-slate-400">
            Existing create/update/export CARB audit backend actions remain intact here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => void handleSave()} disabled={!canSaveOrExport} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Audit</button>
            <button onClick={() => void handleSave()} disabled={!canSaveOrExport || !savedAuditId} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Update Audit</button>
            <button onClick={() => void handleExport()} disabled={!canSaveOrExport && !isManualInvestigationMode} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Export Audit JSON</button>
            <button onClick={() => void handleExportPdf()} disabled={!canSaveOrExport && !isManualInvestigationMode} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 disabled:opacity-50">Export Audit PDF</button>
            <button onClick={() => setMessage('Link to DPAL Evidence Vault placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Link to DPAL Evidence Vault</button>
            <button onClick={() => setMessage('Link to DPAL MRV Project placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Link to DPAL MRV Project</button>
            <button onClick={() => setMessage('Create Investigation Case placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Create Investigation Case</button>
            <button onClick={() => void listCarbAudits().then((res) => setMessage(`Loaded ${res.audits.length} saved CARB audits.`)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Failed to load audits.'))} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Load Saved Audits</button>
          </div>
          {!canSaveOrExport && !isManualInvestigationMode ? <p className="mt-2 text-sm text-amber-300">Search for a facility, select a match, and choose baseline/current years before saving or exporting.</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-bold text-white">Level 2: Evidence Packet Preview</h2>
          <p className="mt-1 text-xs text-slate-400">
            Full JSON/data bundle with sources, calculations, checklist, and limitations.
          </p>
          {canExportEvidencePacket ? (
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(evidencePacket, null, 2)}</pre>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Evidence packet preview becomes available once readiness requirements are met or manual investigation draft is started.</p>
          )}
        </div>
      </section>
      ) : null}

      {activeWorkspaceTab === 'situation' ? (
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <CarbSituationRoom
          roomId={generatedCarbReport?.situationRoom.roomId ?? null}
          onReturn={() => setActiveWorkspaceTab('report')}
          embedded
        />
      </section>
      ) : null}
    </div>
  );
};

export default CarbEmissionsAuditPage;
