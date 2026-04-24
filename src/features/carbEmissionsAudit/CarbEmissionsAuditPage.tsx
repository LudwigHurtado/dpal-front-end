import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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

type Props = { onReturn: () => void };
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

const CarbEmissionsAuditPage: React.FC<Props> = ({ onReturn }) => {
  const auth = useAuth();
  const hasRoleSystem = Boolean(auth?.user && typeof auth.user.role === 'string' && auth.user.role.length > 0);
  const isAdmin = (auth?.user?.role ?? '').toLowerCase() === 'admin';
  const showAdminImportPanel = isAdmin;
  const showDeveloperImportTools = !hasRoleSystem;
  const [facilitySearch, setFacilitySearch] = useState({ q: '', facilityId: '', city: '', county: '', sector: '', year: '' });
  const [facilities, setFacilities] = useState<CarbFacility[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<CarbFacility | null>(null);
  const [sourceMode, setSourceMode] = useState<'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK'>('DEMO_FALLBACK');
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [datasetVersion, setDatasetVersion] = useState('unavailable');
  const [retrievalDate, setRetrievalDate] = useState('');
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
  const [showDevImportOpen, setShowDevImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importDatasetVersion, setImportDatasetVersion] = useState('');
  const [importSourceUrl, setImportSourceUrl] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; warnings: string[]; sourceMode: 'IMPORTED' | 'DEMO_FALLBACK' } | null>(null);
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
  const [manualCoordinates, setManualCoordinates] = useState<[number, number] | null>(null);

  const facilityYearRecords = useMemo(
    () => (!selected ? [] : facilities.filter((row) => row.facilityId === selected.facilityId)),
    [facilities, selected],
  );

  const selectedCoordinates = useMemo<[number, number] | null>(() => {
    if (!selected || selected.latitude == null || selected.longitude == null) return null;
    return [selected.latitude, selected.longitude];
  }, [selected]);

  const mapCenter = selectedCoordinates ?? manualCoordinates ?? CA_CENTER;

  useEffect(() => {
    if (selectedCoordinates) setManualCoordinates(null);
  }, [selectedCoordinates]);

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

  const discrepancyScore = useMemo(() => {
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

  const riskLevel = discrepancyScore == null ? 'Needs More Data' : discrepancyScore <= 25 ? 'Low' : discrepancyScore <= 60 ? 'Medium' : 'High';

  const claimComparison = useMemo(() => {
    if (!companyClaim.trim()) return 'Claim requires more data';
    if (discrepancyScore == null) return 'Claim requires more data';
    if (discrepancyScore <= 20) return 'Claim appears consistent';
    if (discrepancyScore <= 45) return 'Claim appears partially supported';
    if (discrepancyScore <= 60) return 'Claim requires more data';
    return 'Claim may be inconsistent with reported CARB data';
  }, [companyClaim, discrepancyScore]);

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
    if (sourceMode === 'LIVE') return 'This review uses a live CARB-connected dataset.';
    if (sourceMode === 'IMPORTED') return 'This review uses an imported CARB dataset derived from official reporting data.';
    return 'This review uses demo data and is not suitable for real conclusions.';
  }, [sourceMode]);

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
        discrepancyScore: discrepancyScore ?? 'Needs More Data',
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
    discrepancyScore,
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

    if (claimComparison.includes('inconsistent') || (discrepancyScore ?? 0) > 60) {
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
  }, [selected, claimComparison, discrepancyScore, methaneReduction, baselineEmissions, currentEmissions, co2Reduction, n2oReduction]);

  const canSaveOrExport = Boolean(selected && baselineYear && currentYear && baselineEmissions && currentEmissions);

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
    facilityName: selected?.facilityName ?? '',
    operatorName: selected?.operatorName ?? '',
    carbFacilityId: selected?.facilityId ?? '',
    location: selected ? { latitude: selected.latitude, longitude: selected.longitude, city: selected.city, county: selected.county, state: 'California' } : null,
    county: selected?.county ?? '',
    sector: selected?.sector ?? '',
    baselineYear,
    currentYear,
    baselineEmissions,
    currentEmissions,
    calculatedReduction,
    companyClaim,
    claimComparison,
    discrepancyScore,
    riskLevel,
    verificationStatus: selected?.verificationStatus ?? 'NEEDS REVIEW',
    dataSources,
    legalContext,
    limitations: ['CARB data may have reporting lag.', 'Scope boundaries may differ from corporate claim language.'],
    recommendedNextSteps: verificationSummary.recommendedNextSteps,
    verificationSummary,
    aiNarrative,
    generatedAt: new Date().toISOString(),
    dpalLedgerPlaceholder: { status: 'not_connected' },
    checksumPlaceholder: 'pending-checksum',
  };

  const executeSearch = async () => {
    setIsSearching(true);
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
    setMessage(`Loaded ${res.count} facility result(s). Source mode: ${res.sourceMode}.`);
    setIsSearching(false);
    return res;
  };

  const handleSearch = async () => {
    const res = await executeSearch();
    if (!res.count && facilitySearch.q.trim()) {
      setMessage(
        res.sourceMode === 'DEMO_FALLBACK'
          ? `No CARB records matched "${facilitySearch.q}". Current source mode is DEMO_FALLBACK. Import CARB CSV/JSON in Developer Import Tools, then search again.`
          : `No CARB records matched "${facilitySearch.q}". Try a broader query or adjust city/county/year filters.`,
      );
    }
  };

  useEffect(() => {
    const hasAnyFilter = Object.values(facilitySearch).some((value) => value.trim().length > 0);
    if (!hasAnyFilter) return;
    const timer = window.setTimeout(() => {
      void handleSearch();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [facilitySearch.q, facilitySearch.facilityId, facilitySearch.city, facilitySearch.county, facilitySearch.sector, facilitySearch.year]);

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
      `Claim assessment outcome: ${claimComparison}. Discrepancy score: ${discrepancyScore ?? 'Needs More Data'} with risk level ${riskLevel}.`,
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
    claimGap: discrepancyScore == null || claimParsed.claimReductionPct == null || calculatedReduction === 'Needs More Data' ? null : claimParsed.claimReductionPct - Number(calculatedReduction.replace('%', '')),
    discrepancyScore,
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

  const handleSave = async () => {
    if (!canSaveOrExport) {
      setMessage('Select a CARB facility and comparison years before generating an audit.');
      return;
    }
    const payload = buildPayload();
    const result = savedAuditId ? await updateCarbAudit(savedAuditId, payload) : await createCarbAudit(payload);
    setSavedAuditId(result.auditId);
    setMessage(`CARB audit saved: ${result.auditId}`);
  };

  const handleExport = async () => {
    if (!canSaveOrExport) {
      setMessage('Select a CARB facility and comparison years before generating an audit.');
      return;
    }
    if (!savedAuditId) {
      const blob = new Blob([JSON.stringify(evidencePacket, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${evidencePacket.auditId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Exported local CARB evidence packet JSON.');
      return;
    }
    await exportCarbAudit(savedAuditId);
    setMessage(`Exported persisted CARB audit ${savedAuditId}.`);
  };

  return (
    <div className="mx-auto max-w-[1450px] px-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">DPAL CARB Emissions Audit</h1>
        <button onClick={onReturn} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100">Return</button>
      </div>
      <p className="mb-4 text-sm text-slate-300">California-focused CARB reporting, reduction review, and discrepancy analysis.</p>
      {message ? <div className="mb-3 rounded-xl border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-200">{message}</div> : null}
      {showAdminImportPanel ? (
        <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold text-white">Admin CARB Import Panel</h2>
          <p className="mt-1 text-xs text-slate-300">For file-based import, place .csv or .json files in backend/data/carb/.</p>
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
              <p>Imported count: {importResult.imported}</p>
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
              <p className="mt-1 text-xs text-slate-300">For file-based import, place .csv or .json files in backend/data/carb/.</p>
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
                  <p>Imported count: {importResult.imported}</p>
                  <p>Source mode: {importResult.sourceMode}</p>
                  <p>Warnings: {importResult.warnings.length ? importResult.warnings.join(' | ') : 'None'}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold text-white">California facility map and search</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(facilitySearch).map(([k, v]) => (
              <input key={k} value={v} placeholder={k} onChange={(e) => setFacilitySearch((prev) => ({ ...prev, [k]: e.target.value }))} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200" />
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
          {visibleSearchWarnings.length ? (
            <div className="mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-xs text-amber-200">
              {visibleSearchWarnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
            <MapContainer center={mapCenter} zoom={6} className="h-64 w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CarbMapRecenter center={mapCenter} />
              <CarbMapClickCapture onMapClick={(lat, lng) => setManualCoordinates([lat, lng])} />
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
            </MapContainer>
          </div>
          <div className="mt-2 rounded-xl border border-slate-700 p-3 text-sm text-slate-300">
            <p>Selected: {selected ? `${selected.facilityName} (${selected.city}, ${selected.county})` : 'None'}</p>
            <p>
              Marker: {selectedCoordinates ? `${selectedCoordinates[0]}, ${selectedCoordinates[1]}` : manualCoordinates ? `${manualCoordinates[0].toFixed(5)}, ${manualCoordinates[1].toFixed(5)} (manual)` : 'No coordinates set'}
            </p>
          </div>
          {selected && (selected.latitude == null || selected.longitude == null) ? (
            <p className="mt-2 text-xs text-amber-300">Facility location missing from CARB dataset. Click on the map to place a temporary marker before satellite comparison.</p>
          ) : null}
          <div className="mt-3 max-h-56 overflow-auto space-y-2">
            {paginatedFacilities.map((facility) => (
              <button key={`${facility.facilityId}-${facility.reportingYear}`} onClick={() => setSelected(facility)} className="w-full rounded-lg border border-slate-700 p-2 text-left text-sm text-slate-200 hover:border-emerald-500">
                <div className="font-semibold">{facility.facilityName}</div>
                <div className="text-xs text-slate-400">{facility.facilityId} | {facility.city} | {facility.reportingYear}</div>
                <div className="mt-1 inline-flex rounded-full border border-slate-500 px-2 py-0.5 text-[10px]">{facility.sourceStatus}</div>
              </button>
            ))}
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
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="text-lg font-bold text-white">Reported data and claim analyzer</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select value={String(baselineYear)} onChange={(e) => setBaselineYear(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200">
              <option value="">Baseline year</option>
              {availableYears.map((year) => <option key={`b-${year}`} value={year}>{year}</option>)}
            </select>
            <select value={String(currentYear)} onChange={(e) => setCurrentYear(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-200">
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
          <div className="mt-3 rounded-xl border border-slate-700 p-3 text-sm text-slate-200">
            <p>Reported reduction: <span className="font-semibold">{calculatedReduction}</span></p>
            <p>Methane reduction: <span className="font-semibold">{methaneReduction}</span></p>
            <p>CO2 reduction: <span className="font-semibold">{co2Reduction}</span></p>
            <p>N2O reduction: <span className="font-semibold">{n2oReduction}</span></p>
            {!baselineEmissions || !currentEmissions ? <p className="mt-1 text-amber-300">Needs More Data: emissions records missing for one or both selected years.</p> : null}
          </div>
        </section>
      </div>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Discrepancy Score</p>
          <p className="text-3xl font-black text-white">{discrepancyScore ?? 'Needs More Data'}</p>
          <p className="mt-1 text-sm text-slate-300">Risk level: {riskLevel}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-widest text-slate-400">CARB Data Sources</p>
          <p className="text-sm text-slate-300">Source mode: {sourceMode} | Dataset version: {datasetVersion} | Retrieval date: {retrievalDate || 'n/a'}</p>
          {sourceMode === 'IMPORTED' ? (
            <p className="mt-1 text-xs text-emerald-300">
              Imported CARB dataset is active and being used for this review.
            </p>
          ) : null}
          {sourceMode === 'DEMO_FALLBACK' ? (
            <p className="mt-1 text-xs text-amber-300">
              Demo fallback data is active. This mode is for testing and not suitable for real conclusions.
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-200">
            {dataSources.map((s) => <p key={s.sourceName}>{s.sourceName} | {s.sourceStatus} | {s.datasetVersion}</p>)}
          </div>
        </div>
      </section>

      {showCompanyPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Select Company or Facility</h3>
              <button onClick={() => setShowCompanyPicker(false)} className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200">Close</button>
            </div>
            <p className="mt-1 text-xs text-slate-300">Pick an operator or facility name to auto-fill search and quickly review matching records.</p>
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
          </div>
        </div>
      ) : null}

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
            <p className="mt-1"><span className="text-slate-400">Score:</span> {String(verificationSummary.discrepancyInterpretation.discrepancyScore)}</p>
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

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-bold text-white">Legal / Regulatory Context</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {legalContext.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

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

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-lg font-bold text-white">Evidence packet preview</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void handleSave()} disabled={!canSaveOrExport} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save CARB Audit</button>
          <button onClick={() => void handleExport()} disabled={!canSaveOrExport} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Export Evidence Packet JSON</button>
          <button onClick={() => setMessage('Export PDF placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Export PDF Placeholder</button>
          <button onClick={() => setMessage('Link to DPAL Evidence Vault placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Link to DPAL Evidence Vault</button>
          <button onClick={() => setMessage('Link to DPAL MRV Project placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Link to DPAL MRV Project</button>
          <button onClick={() => setMessage('Create Investigation Case placeholder selected.')} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Create Investigation Case</button>
          <button onClick={() => void listCarbAudits().then((res) => setMessage(`Loaded ${res.audits.length} saved CARB audits.`)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Failed to load audits.'))} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100">Load Saved Audits</button>
        </div>
        {!canSaveOrExport ? <p className="mt-2 text-sm text-amber-300">Select a CARB facility and comparison years before generating an audit.</p> : null}
        <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(evidencePacket, null, 2)}</pre>
      </section>
    </div>
  );
};

export default CarbEmissionsAuditPage;
