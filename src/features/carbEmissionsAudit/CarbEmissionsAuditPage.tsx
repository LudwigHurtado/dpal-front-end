import React, { useEffect, useMemo, useState } from 'react';
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

type CarbFacility = {
  facilityId: string;
  facilityName: string;
  operatorName: string;
  city: string;
  county: string;
  latitude: number;
  longitude: number;
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

  const facilityYearRecords = useMemo(
    () => (!selected ? [] : facilities.filter((row) => row.facilityId === selected.facilityId)),
    [facilities, selected],
  );

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
    recommendedNextSteps: ['Validate facility-scope mapping and claim boundaries.', 'Cross-check CARB records with EPA GHGRP where applicable.', 'Escalate for review if discrepancy remains material.'],
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

  const totalPages = Math.max(1, Math.ceil(facilities.length / pageSize));
  const paginatedFacilities = useMemo(
    () => facilities.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [facilities, currentPage],
  );

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
          <p className="mt-2 text-xs text-slate-300">
            Results: {facilities.length} | Source mode: <span className="font-semibold">{sourceMode}</span> {isSearching ? '| Searching...' : ''}
          </p>
          {searchWarnings.length ? (
            <div className="mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-xs text-amber-200">
              {searchWarnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-slate-700 p-3 text-sm text-slate-300">
            <p>Map placeholder: marker/polygon support uses selected facility coordinates.</p>
            <p>Selected: {selected ? `${selected.facilityName} (${selected.city}, ${selected.county})` : 'None'}</p>
            <p>Marker: {selected && selected.latitude != null && selected.longitude != null ? `${selected.latitude}, ${selected.longitude}` : 'No coordinates in selected record'}</p>
          </div>
          {selected && (selected.latitude == null || selected.longitude == null) ? (
            <p className="mt-2 text-xs text-amber-300">Facility location missing from CARB dataset. Add GPS manually before satellite comparison.</p>
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
          {sourceMode !== 'LIVE' ? <p className="mt-1 text-xs text-amber-300">Live CARB source is not connected or unavailable. Using imported/demo fallback records.</p> : null}
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-200">
            {dataSources.map((s) => <p key={s.sourceName}>{s.sourceName} | {s.sourceStatus} | {s.datasetVersion}</p>)}
          </div>
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
