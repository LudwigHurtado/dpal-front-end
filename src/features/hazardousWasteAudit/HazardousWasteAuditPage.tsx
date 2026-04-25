import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../auth/AuthContext';
import {
  createHazardousWasteAudit,
  getHazardousWasteAudit,
  exportHazardousWasteAudit,
  importRcraFacilities,
  listHazardousWasteAudits,
  recalculateHazardousWasteAudit,
  searchRcraFacilities,
  updateHazardousWasteAudit,
} from '../../../services/hazardousWasteAuditService';

type Props = { onReturn: () => void };
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Needs More Data';
type SourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';
type PacketStatus = 'Packet Ready' | 'Unsaved Packet' | 'Saved Packet' | 'Missing Required Data';
type SavedAuditSummary = { id: string; facilityName: string; updatedAt: string };
type PacketHistoryStatus = 'Unsaved' | 'Saved' | 'Regenerated' | 'Exported';
type PacketHistorySource = 'Local Form State' | 'Saved Audit API' | 'Recalculation API';
type PacketHistory = {
  status: PacketHistoryStatus;
  source: PacketHistorySource;
  lastGeneratedAt: string | null;
  lastSavedAt: string | null;
  lastExportedAt: string | null;
  auditId: string | null;
  version: number | null;
  events: Array<{
    action: 'Generated' | 'Saved' | 'Exported' | 'Loaded' | 'Recalculated' | 'Copied';
    timestamp: string;
    source: PacketHistorySource;
    auditId: string | null;
  }>;
};

type RcraFacility = {
  epaId: string;
  facilityName: string;
  operatorName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  naicsCode: string;
  generatorStatus: 'LQG' | 'SQG' | 'VSQG' | 'TSDF' | 'Transporter' | 'Unknown';
  permitStatus: string;
  complianceStatus: string;
  correctiveActionStatus: string;
  reportingYear: number;
  hazardousWasteTons: number | null;
  wasteCodes: string[];
  manifestCount: number | null;
  transporterCount: number | null;
  receivingFacilityCount: number | null;
  violationsCount: number | null;
  enforcementActionsCount: number | null;
  lastInspectionDate: string;
  sourceStatus: string;
  dataSource: string;
  sourceUrl?: string;
  datasetVersion?: string;
  retrievalDate?: string;
};

const markerIcon = L.divIcon({
  className: 'dpal-rcra-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#f97316;border:2px solid #fff;box-shadow:0 0 0 4px rgba(249,115,22,0.24)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const parseClaim = (claim: string) => {
  const pctMatch = claim.match(/(\d+(?:\.\d+)?)\s*%/);
  return pctMatch ? Number(pctMatch[1]) : null;
};

const pctChange = (baseline: number | '' | null, current: number | '' | null): number | null => {
  if (baseline == null || current == null || baseline === '' || current === '' || Number(baseline) <= 0) return null;
  return Number((((Number(baseline) - Number(current)) / Number(baseline)) * 100).toFixed(2));
};

const formatNum = (n: number | null | '' | undefined) => (n == null || n === '' ? 'n/a' : Number(n).toLocaleString());

const legalContext = [
  'RCRAInfo is EPA’s official information system for tracking facilities and activities regulated under the Resource Conservation and Recovery Act.',
  'DPAL does not replace EPA or make final legal findings. DPAL reviews available records and supporting evidence to identify potential discrepancies requiring further review.',
  'RCRA facility records',
  'hazardous waste generators',
  'transporters',
  'treatment, storage, and disposal facilities',
  'biennial reporting',
  'permits',
  'compliance and corrective action',
  'evidence limitations',
];

const riskBadgeClass = (risk: RiskLevel): string => {
  if (risk === 'High') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (risk === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (risk === 'Low') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const checklistBadgeClass = (status: string): string => {
  if (status === 'Complete') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Missing') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const packetHistoryBadgeClass = (status: PacketHistoryStatus): string => {
  if (status === 'Saved') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (status === 'Regenerated') return 'border-blue-200 bg-blue-100 text-blue-700';
  if (status === 'Exported') return 'border-indigo-200 bg-indigo-100 text-indigo-700';
  return 'border-amber-200 bg-amber-100 text-amber-700';
};

const HazardousWasteAuditPage: React.FC<Props> = ({ onReturn }) => {
  const auth = useAuth();
  const [facilitySearch, setFacilitySearch] = useState({
    q: '',
    epaId: '',
    facilityName: '',
    city: '',
    county: '',
    state: '',
    zip: '',
    parentCompany: '',
    frsId: '',
    generatorStatus: '',
    permitStatus: '',
    reportingYear: '',
    naicsCode: '',
  });
  const [facilities, setFacilities] = useState<RcraFacility[]>([]);
  const [sourceMode, setSourceMode] = useState<SourceMode>('DEMO_FALLBACK');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [datasetVersion, setDatasetVersion] = useState('unavailable');
  const [retrievalDate, setRetrievalDate] = useState('');
  const [selected, setSelected] = useState<RcraFacility | null>(null);
  const [message, setMessage] = useState('');
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [companyClaim, setCompanyClaim] = useState('');
  const [baselineYear, setBaselineYear] = useState<number | ''>('');
  const [currentYear, setCurrentYear] = useState<number | ''>('');
  const [baselineHazWasteTons, setBaselineHazWasteTons] = useState<number | ''>('');
  const [currentHazWasteTons, setCurrentHazWasteTons] = useState<number | ''>('');
  const [baselineManifestCount, setBaselineManifestCount] = useState<number | ''>('');
  const [currentManifestCount, setCurrentManifestCount] = useState<number | ''>('');
  const [dpalEvidenceAttached, setDpalEvidenceAttached] = useState(false);
  const [showDevImport, setShowDevImport] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importDatasetVersion, setImportDatasetVersion] = useState('');
  const [importSourceUrl, setImportSourceUrl] = useState('');
  const [importDataType, setImportDataType] = useState('facility_master');
  const [importResult, setImportResult] = useState<{ imported: number; warnings: string[]; sourceMode: 'IMPORTED' | 'DEMO_FALLBACK' } | null>(null);
  const [savedAudits, setSavedAudits] = useState<SavedAuditSummary[]>([]);
  const [selectedAuditToLoad, setSelectedAuditToLoad] = useState('');
  const [evidencePacketPreview, setEvidencePacketPreview] = useState<any | null>(null);
  const [packetStatus, setPacketStatus] = useState<PacketStatus>('Missing Required Data');
  const [packetHistory, setPacketHistory] = useState<PacketHistory>({
    status: 'Unsaved',
    source: 'Local Form State',
    lastGeneratedAt: null,
    lastSavedAt: null,
    lastExportedAt: null,
    auditId: null,
    version: null,
    events: [],
  });

  const facilityRecords = useMemo(() => (!selected ? [] : facilities.filter((row) => row.epaId === selected.epaId)), [facilities, selected]);
  const availableYears = useMemo(() => Array.from(new Set(facilityRecords.map((row) => row.reportingYear))).sort((a, b) => b - a), [facilityRecords]);

  useEffect(() => {
    if (!availableYears.length) return;
    const current = availableYears[0];
    const baseline = availableYears[1] ?? availableYears[0];
    setCurrentYear(current);
    setBaselineYear(baseline);
  }, [availableYears.join(',')]);

  useEffect(() => {
    if (!selected || !baselineYear || !currentYear) return;
    const baseline = facilityRecords.find((row) => row.reportingYear === baselineYear);
    const current = facilityRecords.find((row) => row.reportingYear === currentYear);
    setBaselineHazWasteTons(baseline?.hazardousWasteTons ?? '');
    setCurrentHazWasteTons(current?.hazardousWasteTons ?? '');
    setBaselineManifestCount(baseline?.manifestCount ?? '');
    setCurrentManifestCount(current?.manifestCount ?? '');
  }, [selected?.epaId, baselineYear, currentYear, facilityRecords]);

  const yearOverYearWasteChangePct = useMemo(() => pctChange(baselineHazWasteTons, currentHazWasteTons), [baselineHazWasteTons, currentHazWasteTons]);
  const manifestChangePct = useMemo(() => pctChange(baselineManifestCount, currentManifestCount), [baselineManifestCount, currentManifestCount]);
  const claimReductionPct = useMemo(() => parseClaim(companyClaim), [companyClaim]);

  const activityDiscrepancy = useMemo(() => {
    if (yearOverYearWasteChangePct == null || manifestChangePct == null) return 'Needs additional source verification due to incomplete records.';
    const wasteDropLarge = yearOverYearWasteChangePct > 20;
    const manifestStableOrUp = manifestChangePct <= 5;
    if (wasteDropLarge && manifestStableOrUp) {
      return 'Reported hazardous waste reduction is not fully supported by manifest activity trends and requires review.';
    }
    return 'Available reporting and manifest activity are directionally consistent.';
  }, [yearOverYearWasteChangePct, manifestChangePct]);

  const complianceRiskScore = useMemo(() => {
    if (!selected) return null;
    const violations = Number(selected.violationsCount ?? 0);
    const enforcement = Number(selected.enforcementActionsCount ?? 0);
    const permitPenalty = selected.permitStatus.toLowerCase().includes('active') ? 0 : 12;
    const correctivePenalty = selected.correctiveActionStatus.toLowerCase().includes('active') ? 14 : 0;
    const missingDataPenalty = yearOverYearWasteChangePct == null || manifestChangePct == null ? 18 : 0;
    const inspectionRecencyPenalty = selected.lastInspectionDate === 'Unknown' ? 8 : 0;
    const activityPenalty = activityDiscrepancy.includes('requires review') ? 20 : 3;
    return Math.min(100, Math.max(0, Math.round(violations * 5 + enforcement * 7 + permitPenalty + correctivePenalty + missingDataPenalty + inspectionRecencyPenalty + activityPenalty)));
  }, [selected, yearOverYearWasteChangePct, manifestChangePct, activityDiscrepancy]);

  const riskLevel: RiskLevel = complianceRiskScore == null ? 'Needs More Data' : complianceRiskScore <= 25 ? 'Low' : complianceRiskScore <= 60 ? 'Medium' : 'High';

  const claimAnalysis = useMemo(() => {
    if (!companyClaim.trim() || claimReductionPct == null || yearOverYearWasteChangePct == null) return 'Requires More Data';
    const gap = Math.abs(claimReductionPct - yearOverYearWasteChangePct);
    if (gap <= 4) return 'Consistent';
    if (gap <= 10) return 'Partially Supported';
    return 'Potentially Inconsistent';
  }, [companyClaim, claimReductionPct, yearOverYearWasteChangePct]);

  const recommendedNextSteps = useMemo(() => {
    const steps: string[] = [];
    if (sourceMode === 'IMPORTED') {
      steps.push('Confirm imported dataset matches official RCRA-style download.');
      steps.push('Record dataset filename and retrieval date.');
    }
    if (activityDiscrepancy.includes('requires review')) {
      steps.push('Review reported waste reduction against manifest activity records.');
    }
    if (!dpalEvidenceAttached) {
      steps.push('Attach DPAL evidence artifacts for independent verification.');
    }
    if (!selected || selected.latitude == null || selected.longitude == null) {
      steps.push('Add facility coordinates for geospatial evidence comparison.');
    }
    if (riskLevel === 'Low') {
      steps.push('Save audit and export evidence packet for recordkeeping.');
    }
    if (!steps.length) steps.push('Continue routine compliance review with updated inspection records.');
    return steps;
  }, [sourceMode, activityDiscrepancy, dpalEvidenceAttached, selected, riskLevel]);

  const checklist = useMemo(
    () => [
      { label: 'Facility selected', status: selected ? 'Complete' : 'Missing' },
      { label: 'Baseline year selected', status: baselineYear ? 'Complete' : 'Missing' },
      { label: 'Current year selected', status: currentYear ? 'Complete' : 'Missing' },
      { label: 'RCRA-style data available', status: baselineHazWasteTons !== '' && currentHazWasteTons !== '' ? 'Complete' : 'Missing' },
      { label: 'Coordinates available', status: selected && selected.latitude != null && selected.longitude != null ? 'Complete' : 'Needs Review' },
      { label: 'Permit status available', status: selected?.permitStatus ? 'Complete' : 'Needs Review' },
      { label: 'Compliance history available', status: selected?.complianceStatus ? 'Complete' : 'Needs Review' },
      { label: 'Manifest/activity data available', status: baselineManifestCount !== '' && currentManifestCount !== '' ? 'Complete' : 'Needs Review' },
      { label: 'DPAL evidence attached', status: dpalEvidenceAttached ? 'Complete' : 'Needs Review' },
      { label: 'Evidence packet ready', status: selected && baselineYear && currentYear ? 'Complete' : 'Missing' },
    ],
    [selected, baselineYear, currentYear, baselineHazWasteTons, currentHazWasteTons, baselineManifestCount, currentManifestCount, dpalEvidenceAttached],
  );

  const verificationSummary = useMemo(
    () => ({
      facilityIdentity: selected
        ? {
            epaId: selected.epaId,
            facilityName: selected.facilityName,
            operatorName: selected.operatorName,
            city: selected.city,
            county: selected.county,
            state: selected.state,
            generatorStatus: selected.generatorStatus,
          }
        : null,
      dataSourceBasis:
        sourceMode === 'LIVE'
          ? 'This review uses a live RCRA-connected dataset.'
          : sourceMode === 'IMPORTED'
            ? 'This review uses an imported RCRA-style dataset derived from reporting records.'
            : 'This review uses demo data and is not suitable for real conclusions.',
      yearOverYearWasteChange:
        yearOverYearWasteChangePct == null
          ? 'DPAL needs more data to complete year-over-year hazardous waste comparison.'
          : `DPAL compared ${baselineYear} to ${currentYear}. Hazardous waste changed from ${formatNum(baselineHazWasteTons)} to ${formatNum(currentHazWasteTons)} tons (${yearOverYearWasteChangePct.toFixed(2)}%).`,
      compliancePosture: selected ? `${selected.complianceStatus}; permit status ${selected.permitStatus}; corrective action ${selected.correctiveActionStatus}.` : 'Select a facility to review compliance posture.',
      activityDiscrepancyInterpretation: activityDiscrepancy,
      limitations: ['Imported or live records may include reporting lag.', 'Facility boundaries and manifest scope may differ from claim language.'],
      recommendedNextSteps,
      checklist,
      generatedAt: new Date().toISOString(),
    }),
    [selected, sourceMode, yearOverYearWasteChangePct, baselineYear, currentYear, baselineHazWasteTons, currentHazWasteTons, activityDiscrepancy, recommendedNextSteps, checklist],
  );

  const dataSources = useMemo(
    () => facilities.slice(0, 5).map((row) => ({ dataSource: row.dataSource, sourceStatus: row.sourceStatus, datasetVersion: row.datasetVersion, retrievalDate: row.retrievalDate })),
    [facilities],
  );
  const baselineRecord = useMemo(() => (baselineYear ? facilityRecords.find((row) => row.reportingYear === baselineYear) ?? null : null), [facilityRecords, baselineYear]);
  const currentRecord = useMemo(() => (currentYear ? facilityRecords.find((row) => row.reportingYear === currentYear) ?? null : null), [facilityRecords, currentYear]);
  const requiredDataMissing = useMemo(
    () => !selected || !baselineYear || !currentYear || !baselineRecord || !currentRecord || !sourceMode || !dataSources.length,
    [selected, baselineYear, currentYear, baselineRecord, currentRecord, sourceMode, dataSources.length],
  );

  const evidencePacket = useMemo(() => ({
    packetHistory,
    hazardousWasteIntegrity: {
      facilityIdentity: verificationSummary.facilityIdentity,
      reportingComparison: {
        baselineYear,
        currentYear,
        baselineHazardousWasteTons: baselineHazWasteTons,
        currentHazardousWasteTons: currentHazWasteTons,
        baselineManifestCount,
        currentManifestCount,
        yearOverYearWasteChangePct,
        manifestChangePct,
      },
      complianceSummary: selected
        ? {
            permitStatus: selected.permitStatus,
            complianceStatus: selected.complianceStatus,
            correctiveActionStatus: selected.correctiveActionStatus,
            violationsCount: selected.violationsCount,
            enforcementActionsCount: selected.enforcementActionsCount,
            lastInspectionDate: selected.lastInspectionDate,
          }
        : null,
      activityIndicators: {
        activityDiscrepancy,
      },
      discrepancyScore: complianceRiskScore,
      integrityScore: complianceRiskScore,
      riskLevel,
      claimAnalysis: { claimText: companyClaim, claimReductionPct, classification: claimAnalysis },
      verificationSummary,
      sourceMode,
      dataSources,
      limitations: verificationSummary.limitations,
      recommendedNextSteps,
      generatedAt: new Date().toISOString(),
      dpalLedgerPlaceholder: { status: 'not_connected' },
      checksumPlaceholder: 'pending-checksum',
      packetHistory,
    },
  }), [verificationSummary, baselineYear, currentYear, baselineHazWasteTons, currentHazWasteTons, baselineManifestCount, currentManifestCount, yearOverYearWasteChangePct, manifestChangePct, selected, activityDiscrepancy, complianceRiskScore, riskLevel, companyClaim, claimReductionPct, claimAnalysis, sourceMode, dataSources, recommendedNextSteps, packetHistory]);

  const canSave = Boolean(selected && baselineYear && currentYear && baselineHazWasteTons !== '' && currentHazWasteTons !== '');

  useEffect(() => {
    if (requiredDataMissing) {
      setPacketStatus('Missing Required Data');
      return;
    }
    setPacketStatus(savedAuditId ? 'Saved Packet' : evidencePacketPreview ? 'Unsaved Packet' : 'Packet Ready');
  }, [requiredDataMissing, savedAuditId, evidencePacketPreview]);

  const executeSearch = async () => {
    const res = await searchRcraFacilities({
      ...facilitySearch,
      limit: '500',
      reportingYear: facilitySearch.reportingYear,
    });
    setFacilities(res.results as RcraFacility[]);
    setSourceMode(res.sourceMode);
    setWarnings(res.warnings ?? []);
    setDatasetVersion(res.datasetVersion ?? 'unavailable');
    setRetrievalDate(res.retrievalDate ?? '');
    setMessage(`Loaded ${res.count} facility result(s). Source mode: ${res.sourceMode}.`);
  };

  const devLog = (event: string, payload?: unknown) => {
    if (import.meta.env.DEV) {
      console.log(`[hazardous-waste-audit] ${event}`, payload ?? '');
    }
  };
  const nowIso = () => new Date().toISOString();
  const pushPacketEvent = (
    history: PacketHistory,
    action: 'Generated' | 'Saved' | 'Exported' | 'Loaded' | 'Recalculated' | 'Copied',
    source: PacketHistorySource,
    auditId: string | null,
  ) => [{ action, timestamp: nowIso(), source, auditId }, ...(history.events ?? [])].slice(0, 3);

  const handleImport = async () => {
    const result = await importRcraFacilities({
      csvText: importCsvText.trim() || undefined,
      jsonText: importJsonText.trim() || undefined,
      datasetVersion: importDatasetVersion.trim() || undefined,
      sourceUrl: importSourceUrl.trim() || undefined,
      dataType: importDataType,
    });
    setImportResult(result);
    setMessage(`Imported ${result.imported} RCRA record(s).`);
    await executeSearch();
  };

  const buildPayload = () => ({
    epaId: selected?.epaId,
    facilityName: selected?.facilityName,
    operatorName: selected?.operatorName,
    address: selected?.address,
    city: selected?.city,
    county: selected?.county,
    state: selected?.state,
    latitude: selected?.latitude ?? null,
    longitude: selected?.longitude ?? null,
    naicsCode: selected?.naicsCode ?? 'Unknown',
    generatorStatus: selected?.generatorStatus ?? 'Unknown',
    permitStatus: selected?.permitStatus ?? 'Needs Review',
    complianceStatus: selected?.complianceStatus ?? 'Needs Review',
    correctiveActionStatus: selected?.correctiveActionStatus ?? 'Needs Review',
    baselineYear: Number(baselineYear),
    currentYear: Number(currentYear),
    baselineHazardousWasteTons: Number(baselineHazWasteTons || 0),
    currentHazardousWasteTons: Number(currentHazWasteTons || 0),
    baselineManifestCount: Number(baselineManifestCount || 0),
    currentManifestCount: Number(currentManifestCount || 0),
    violationsCount: Number(selected?.violationsCount || 0),
    enforcementActionsCount: Number(selected?.enforcementActionsCount || 0),
    complianceRiskScore,
    activityDiscrepancy,
    claimText: companyClaim,
    claimReductionPct,
    claimGap: claimReductionPct == null || yearOverYearWasteChangePct == null ? null : claimReductionPct - yearOverYearWasteChangePct,
    claimAnalysis,
    riskLevel,
    sourceMode,
    verificationSummary,
    dataSources,
    evidencePacket: evidencePacketPreview ?? evidencePacket,
    limitations: verificationSummary.limitations,
    recommendedNextSteps,
    linkedMRVProjectId: null,
    linkedEvidenceVaultId: null,
    linkedReportId: null,
  });

  const handleSave = async () => {
    if (!canSave) {
      setMessage('Select a facility and comparison years before saving.');
      return;
    }
    const payload = buildPayload();
    const result = savedAuditId ? await updateHazardousWasteAudit(savedAuditId, payload) : await createHazardousWasteAudit(payload);
    setSavedAuditId(result.auditId);
    const savedAt = nowIso();
    const nextHistory: PacketHistory = {
      ...packetHistory,
      status: 'Saved',
      source: 'Saved Audit API',
      lastSavedAt: savedAt,
      auditId: result.auditId,
      version: Number(result.audit?.version ?? packetHistory.version ?? 1),
      lastGeneratedAt: packetHistory.lastGeneratedAt ?? savedAt,
      events: pushPacketEvent(packetHistory, 'Saved', 'Saved Audit API', result.auditId),
    };
    setPacketHistory(nextHistory);
    setEvidencePacketPreview(
      (evidencePacketPreview ?? evidencePacket)
        ? {
            ...(evidencePacketPreview ?? evidencePacket),
            packetHistory: nextHistory,
            hazardousWasteIntegrity: {
              ...((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity ?? {}),
              packetHistory: nextHistory,
            },
          }
        : evidencePacketPreview ?? evidencePacket,
    );
    setPacketStatus('Saved Packet');
    devLog('evidence packet saved', { auditId: result.auditId });
    setMessage(`Hazardous waste audit saved: ${result.auditId}`);
  };

  const handleGeneratePacket = () => {
    if (requiredDataMissing) {
      setPacketStatus('Missing Required Data');
      setMessage('Missing required data for packet generation. Select facility, years, records, and ensure data sources are present.');
      return;
    }
    const generatedAt = nowIso();
    const nextHistory: PacketHistory = {
      ...packetHistory,
      status: 'Regenerated',
      source: 'Local Form State',
      lastGeneratedAt: generatedAt,
      auditId: savedAuditId ?? packetHistory.auditId,
      events: pushPacketEvent(packetHistory, 'Generated', 'Local Form State', savedAuditId ?? packetHistory.auditId),
    };
    setPacketHistory(nextHistory);
    setEvidencePacketPreview({ ...evidencePacket, packetHistory: nextHistory, hazardousWasteIntegrity: { ...(evidencePacket.hazardousWasteIntegrity ?? {}), packetHistory: nextHistory } });
    setPacketStatus(savedAuditId ? 'Saved Packet' : 'Unsaved Packet');
    devLog('evidence packet generated', { savedAuditId, sourceMode });
    setMessage(savedAuditId ? 'Evidence packet regenerated.' : 'Evidence packet generated. Save audit to preserve it.');
  };

  const handleExport = async () => {
    if (requiredDataMissing) {
      setPacketStatus('Missing Required Data');
      setMessage('Missing required data for export.');
      return;
    }
    const packetToExport = evidencePacketPreview ?? evidencePacket;
    if (!savedAuditId) {
      const blob = new Blob([JSON.stringify(packetToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCRA-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setPacketStatus('Unsaved Packet');
      const exportedAt = nowIso();
      setPacketHistory((prev) => ({
        ...prev,
        status: 'Exported',
        source: 'Local Form State',
        lastExportedAt: exportedAt,
        events: pushPacketEvent(prev, 'Exported', 'Local Form State', prev.auditId),
      }));
      setMessage('This packet has not been saved yet. Save the audit to preserve it.');
      devLog('evidence packet export requested', { mode: 'local-unsaved' });
      return;
    }
    const response = await exportHazardousWasteAudit(savedAuditId);
    const blob = new Blob([JSON.stringify(response.export, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${savedAuditId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setEvidencePacketPreview((response.export as any) ?? packetToExport);
    setPacketStatus('Saved Packet');
    const exportedAt = nowIso();
    setPacketHistory((prev) => ({
      ...prev,
      status: 'Exported',
      lastExportedAt: exportedAt,
      source: prev.auditId ? 'Saved Audit API' : prev.source,
      events: pushPacketEvent(prev, 'Exported', prev.auditId ? 'Saved Audit API' : prev.source, prev.auditId),
    }));
    devLog('evidence packet export requested', { mode: 'api', auditId: savedAuditId });
    setMessage(`Exported persisted audit ${savedAuditId}.`);
  };

  const handleExportPdfPlaceholder = () => {
    const packetToExport = evidencePacketPreview ?? evidencePacket;
    const blob = new Blob([JSON.stringify({ pdfPlaceholder: true, packet: packetToExport }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${savedAuditId ?? `RCRA-${Date.now()}`}-pdf-placeholder.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Exported PDF placeholder payload.');
  };

  const handleCopyPacketJson = async () => {
    const packetToCopy = evidencePacketPreview ?? evidencePacket;
    await navigator.clipboard.writeText(JSON.stringify(packetToCopy, null, 2));
    setPacketHistory((prev) => ({
      ...prev,
      status: 'Exported',
      lastExportedAt: nowIso(),
      events: pushPacketEvent(prev, 'Copied', prev.source, prev.auditId),
    }));
    setMessage('Evidence packet JSON copied to clipboard.');
  };

  const handleLoadSavedAudits = async () => {
    const res = await listHazardousWasteAudits();
    setSavedAudits((res.audits ?? []).map((item) => ({ id: item.id, facilityName: item.facilityName, updatedAt: item.updatedAt })));
    setMessage(`Loaded ${res.audits.length} saved hazardous waste audits.`);
  };

  const handleLoadSavedAudit = async () => {
    if (!selectedAuditToLoad) return;
    const res = await getHazardousWasteAudit(selectedAuditToLoad);
    const audit = res.audit;
    setSavedAuditId(audit.id);
    setSourceMode((String(audit.sourceMode || sourceMode) as SourceMode));
    setBaselineYear(Number(audit.baselineYear || ''));
    setCurrentYear(Number(audit.currentYear || ''));
    setBaselineHazWasteTons(Number(audit.baselineHazardousWasteTons || ''));
    setCurrentHazWasteTons(Number(audit.currentHazardousWasteTons || ''));
    setBaselineManifestCount(Number(audit.baselineManifestCount || ''));
    setCurrentManifestCount(Number(audit.currentManifestCount || ''));
    setCompanyClaim(String(audit.claimText || ''));
    setEvidencePacketPreview((audit.evidencePacketJson as any) ?? null);
    const savedHistory = (audit.evidencePacketJson as any)?.packetHistory as Partial<PacketHistory> | undefined;
    setPacketHistory((prev) => ({
      ...prev,
      ...savedHistory,
      status: 'Saved',
      source: 'Saved Audit API',
      auditId: audit.id,
      version: Number(audit.version ?? savedHistory?.version ?? prev.version ?? 1),
      lastSavedAt: String(savedHistory?.lastSavedAt ?? audit.updatedAt ?? nowIso()),
      events: pushPacketEvent(
        {
          ...prev,
          ...savedHistory,
          events: Array.isArray(savedHistory?.events) ? (savedHistory?.events as PacketHistory['events']) : prev.events,
        },
        'Loaded',
        'Saved Audit API',
        audit.id,
      ),
    }));
    setPacketStatus('Saved Packet');
    setMessage(`Loaded saved audit ${audit.id}.`);
  };

  const handleRecalculate = async () => {
    if (!savedAuditId) {
      setMessage('Save the audit before recalculating.');
      return;
    }
    const res = await recalculateHazardousWasteAudit(savedAuditId);
    setEvidencePacketPreview((res.audit?.evidencePacketJson as any) ?? evidencePacket);
    setPacketHistory((prev) => ({
      ...prev,
      status: 'Regenerated',
      source: 'Recalculation API',
      auditId: savedAuditId,
      version: Number(res.audit?.version ?? prev.version ?? 1),
      lastGeneratedAt: nowIso(),
      events: pushPacketEvent(prev, 'Recalculated', 'Recalculation API', savedAuditId),
    }));
    setPacketStatus('Saved Packet');
    setMessage(`Recalculated audit ${savedAuditId} and regenerated evidence packet.`);
  };

  const center: [number, number] =
    selected && selected.latitude != null && selected.longitude != null ? [selected.latitude, selected.longitude] : [36.7783, -119.4179];

  const gaugeScore = complianceRiskScore ?? 0;
  const gaugeCirc = 2 * Math.PI * 42;
  const gaugeOffset = gaugeCirc - (Math.max(0, Math.min(100, gaugeScore)) / 100) * gaugeCirc;

  return (
    <div className="min-h-screen bg-slate-100 px-3 pb-10 pt-4 xl:px-6">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 xl:grid-cols-[330px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-black">Hazardous Waste Integrity Audit</h1>
            <button onClick={onReturn} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Return</button>
          </div>
          <p className="text-xs text-slate-300">RCRA facility reporting, permit, compliance, and waste activity review.</p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Source Mode</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${sourceMode === 'LIVE' ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200' : sourceMode === 'IMPORTED' ? 'border-sky-500/50 bg-sky-500/20 text-sky-200' : 'border-amber-500/50 bg-amber-500/20 text-amber-200'}`}>{sourceMode}</span>
              <span className="text-xs text-slate-300">v {datasetVersion}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Retrieved: {retrievalDate || 'n/a'}</p>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Integrity Score</p>
            <div className="mt-2 flex items-center gap-3">
              <svg width="102" height="102" viewBox="0 0 102 102" className="shrink-0">
                <circle cx="51" cy="51" r="42" stroke="#1e293b" strokeWidth="10" fill="none" />
                <circle cx="51" cy="51" r="42" stroke={riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f59e0b' : '#22c55e'} strokeWidth="10" fill="none" strokeDasharray={gaugeCirc} strokeDashoffset={gaugeOffset} strokeLinecap="round" transform="rotate(-90 51 51)" />
                <text x="51" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill="#e2e8f0">{complianceRiskScore ?? '--'}</text>
              </svg>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Risk</p>
                <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${riskBadgeClass(riskLevel)}`}>{riskLevel}</span>
                <p className="mt-2 text-xs text-slate-300">Activity: {activityDiscrepancy.includes('requires review') ? 'Requires review' : 'Aligned'}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowDevImport((v) => !v)} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm font-semibold">
            Developer Import Tools {showDevImport ? '[-]' : '[+]'}
          </button>
          {showDevImport ? (
            <div className="mt-2 space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-300">Use `backend/data/rcra/` for file-based import.</p>
              <select value={importDataType} onChange={(e) => setImportDataType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200">
                <option value="facility_master">Facility Master List</option>
                <option value="biennial_report">Biennial Waste Report</option>
                <option value="compliance">Compliance / Enforcement</option>
                <option value="permit">Permit Records</option>
                <option value="manifest">Manifest / Shipment Activity</option>
                <option value="evidence">DPAL Evidence Layer</option>
              </select>
              <textarea value={importCsvText} onChange={(e) => setImportCsvText(e.target.value)} placeholder="Paste RCRA CSV text" className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
              <textarea value={importJsonText} onChange={(e) => setImportJsonText(e.target.value)} placeholder="Paste RCRA JSON array text" className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
              <input value={importDatasetVersion} onChange={(e) => setImportDatasetVersion(e.target.value)} placeholder="datasetVersion" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
              <input value={importSourceUrl} onChange={(e) => setImportSourceUrl(e.target.value)} placeholder="sourceUrl" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200" />
              <button onClick={() => void handleImport()} className="w-full rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Import RCRA Dataset</button>
              {importResult ? <p className="text-xs text-slate-300">Imported: {importResult.imported} | Warnings: {importResult.warnings.join(' | ') || 'None'}</p> : null}
            </div>
          ) : null}
        </aside>

        <main className="space-y-4">
          {message ? <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{message}</div> : null}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.03fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Facility Search and Location</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(facilitySearch).map(([k, v]) => (
                  <input key={k} value={v} onChange={(e) => setFacilitySearch((prev) => ({ ...prev, [k]: e.target.value }))} placeholder={k} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
                ))}
              </div>
              <button onClick={() => void executeSearch()} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Search RCRA Facilities</button>
              {warnings.length ? <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{warnings.map((w) => <p key={w}>{w}</p>)}</div> : null}
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <MapContainer center={center} zoom={selected ? 11 : 6} className="h-56 w-full">
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {selected && selected.latitude != null && selected.longitude != null ? (
                    <>
                      <Marker position={[selected.latitude, selected.longitude]} icon={markerIcon} />
                      <CircleMarker center={[selected.latitude, selected.longitude]} radius={24} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15 }} />
                    </>
                  ) : null}
                </MapContainer>
              </div>
              <div className="mt-3 max-h-44 overflow-auto space-y-2">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-2 py-1">EPA ID</th>
                      <th className="px-2 py-1">Facility</th>
                      <th className="px-2 py-1">City</th>
                      <th className="px-2 py-1">State</th>
                      <th className="px-2 py-1">Generator</th>
                      <th className="px-2 py-1">Permit</th>
                      <th className="px-2 py-1">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map((facility) => (
                      <tr key={`${facility.epaId}-${facility.reportingYear}`} onClick={() => setSelected(facility)} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-2 py-1">{facility.epaId}</td>
                        <td className="px-2 py-1">{facility.facilityName}</td>
                        <td className="px-2 py-1">{facility.city}</td>
                        <td className="px-2 py-1">{facility.state}</td>
                        <td className="px-2 py-1">{facility.generatorStatus}</td>
                        <td className="px-2 py-1">{facility.permitStatus}</td>
                        <td className="px-2 py-1">{facility.sourceStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Compliance and Activity Analysis</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                <p><span className="font-semibold">EPA ID:</span> {selected?.epaId ?? 'n/a'}</p>
                <p><span className="font-semibold">Generator:</span> {selected?.generatorStatus ?? 'n/a'}</p>
                <p><span className="font-semibold">Permit:</span> {selected?.permitStatus ?? 'n/a'}</p>
                <p><span className="font-semibold">Compliance:</span> {selected?.complianceStatus ?? 'n/a'}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select value={String(baselineYear)} onChange={(e) => setBaselineYear(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800">
                  <option value="">Baseline year</option>
                  {availableYears.map((y) => <option key={`b-${y}`} value={y}>{y}</option>)}
                </select>
                <select value={String(currentYear)} onChange={(e) => setCurrentYear(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800">
                  <option value="">Current year</option>
                  {availableYears.map((y) => <option key={`c-${y}`} value={y}>{y}</option>)}
                </select>
                <input value={String(baselineHazWasteTons)} onChange={(e) => setBaselineHazWasteTons(e.target.value ? Number(e.target.value) : '')} placeholder="Baseline waste tons" className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
                <input value={String(currentHazWasteTons)} onChange={(e) => setCurrentHazWasteTons(e.target.value ? Number(e.target.value) : '')} placeholder="Current waste tons" className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
                <input value={String(baselineManifestCount)} onChange={(e) => setBaselineManifestCount(e.target.value ? Number(e.target.value) : '')} placeholder="Baseline manifests" className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
                <input value={String(currentManifestCount)} onChange={(e) => setCurrentManifestCount(e.target.value ? Number(e.target.value) : '')} placeholder="Current manifests" className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
              </div>
              <textarea value={companyClaim} onChange={(e) => setCompanyClaim(e.target.value)} placeholder='Paste claim: "Facility reduced hazardous waste generation by 40% in 2024."' className="mt-3 h-20 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={dpalEvidenceAttached} onChange={(e) => setDpalEvidenceAttached(e.target.checked)} />
                DPAL evidence attached
              </label>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>Year-over-year waste change: {yearOverYearWasteChangePct == null ? 'Needs More Data' : `${yearOverYearWasteChangePct.toFixed(2)}%`}</p>
                <p>Manifest change: {manifestChangePct == null ? 'Needs More Data' : `${manifestChangePct.toFixed(2)}%`}</p>
                <p>Claim analyzer: <span className="font-semibold">{claimAnalysis}</span></p>
                <p className="mt-1 text-xs">{activityDiscrepancy}</p>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Verification Summary</h2>
              <p className="mt-2 text-sm text-slate-700">{verificationSummary.dataSourceBasis}</p>
              <p className="mt-2 text-sm text-slate-700">{verificationSummary.yearOverYearWasteChange}</p>
              <p className="mt-2 text-sm text-slate-700">{verificationSummary.compliancePosture}</p>
              <p className="mt-2 text-sm text-slate-700">{verificationSummary.activityDiscrepancyInterpretation}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span>{item.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 ${checklistBadgeClass(item.status)}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Legal and Data Sources</h2>
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-semibold">Data Source Confidence</p>
                <p>Facility identity layer: {sourceMode === 'LIVE' ? 'Live EPA feed' : sourceMode === 'IMPORTED' ? 'Imported facility master layer' : 'Demo fallback only'}</p>
                <p>Waste/manifest layer: {facilities.some((f) => f.manifestCount != null) ? 'Present' : 'Needs additional upload'}</p>
                <p>Compliance/permit layer: {facilities.some((f) => f.permitStatus && f.complianceStatus) ? 'Present' : 'Needs additional upload'}</p>
                <p>Evidence layer: {dpalEvidenceAttached ? 'Manual DPAL evidence attached' : 'No DPAL evidence linked yet'}</p>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {facilities.slice(0, 6).map((row) => (
                  <p key={`${row.epaId}-${row.reportingYear}`}>{row.dataSource} | {row.sourceStatus} | {row.datasetVersion || 'n/a'}</p>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {legalContext.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Evidence Packet Preview</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${packetStatus === 'Saved Packet' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : packetStatus === 'Unsaved Packet' ? 'border-amber-300 bg-amber-50 text-amber-700' : packetStatus === 'Packet Ready' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-rose-300 bg-rose-50 text-rose-700'}`}>{packetStatus}</span>
              {packetStatus === 'Missing Required Data' ? <span className="text-xs text-rose-700">facility, years, baseline/current records, source mode, and data sources are required.</span> : null}
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Packet History</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${packetHistoryBadgeClass(packetHistory.status)}`}>{packetHistory.status}</span>
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold">Packet Source:</span> {packetHistory.source}</p>
                <p><span className="font-semibold">Audit ID:</span> {packetHistory.auditId || 'n/a'}</p>
                <p><span className="font-semibold">Packet Version:</span> {packetHistory.version ?? 'n/a'}</p>
                <p><span className="font-semibold">Last Generated At:</span> {packetHistory.lastGeneratedAt || 'n/a'}</p>
                <p><span className="font-semibold">Last Saved At:</span> {packetHistory.lastSavedAt || 'n/a'}</p>
                <p><span className="font-semibold">Last Exported At:</span> {packetHistory.lastExportedAt || 'n/a'}</p>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Packet Event Trail</p>
                <div className="mt-1 space-y-1">
                  {(packetHistory.events ?? []).length ? (
                    packetHistory.events.slice(0, 3).map((event, index) => (
                      <div key={`${event.action}-${event.timestamp}-${index}`} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{event.action}</span>
                          <span>{event.source}</span>
                          <span>{event.auditId || 'no-audit-id'}</span>
                        </div>
                        <span>{event.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">No packet events yet.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleGeneratePacket} disabled={requiredDataMissing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Generate Evidence Packet</button>
              <button onClick={() => void handleSave()} disabled={!canSave} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Audit</button>
              <button onClick={() => void handleExport()} disabled={requiredDataMissing} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Export JSON</button>
              <button onClick={handleExportPdfPlaceholder} disabled={requiredDataMissing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Export PDF Placeholder</button>
              <button onClick={() => void handleCopyPacketJson()} disabled={requiredDataMissing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Copy Packet JSON</button>
              <button onClick={() => void handleRecalculate()} disabled={!savedAuditId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Recalculate Audit</button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => void handleLoadSavedAudits()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">Load Saved Audits</button>
              <select value={selectedAuditToLoad} onChange={(e) => setSelectedAuditToLoad(e.target.value)} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-800">
                <option value="">Select saved audit</option>
                {savedAudits.map((audit) => (
                  <option key={audit.id} value={audit.id}>{audit.facilityName || 'Unnamed'} ({audit.id})</option>
                ))}
              </select>
              <button onClick={() => void handleLoadSavedAudit()} disabled={!selectedAuditToLoad} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Load Selected Audit</button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Facility Identity</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.facilityIdentity ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Reporting Comparison</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.reportingComparison ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Compliance Summary</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.complianceSummary ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Activity Indicators</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.activityIndicators ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Integrity Score & Risk Level</p><pre className="mt-1 overflow-auto">{JSON.stringify({ integrityScore: (evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.integrityScore, riskLevel: (evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.riskLevel }, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Claim Analysis</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.claimAnalysis ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Verification Summary</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.verificationSummary ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Data Sources</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.dataSources ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Limitations</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.limitations ?? null, null, 2)}</pre></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">Recommended Next Steps</p><pre className="mt-1 overflow-auto">{JSON.stringify((evidencePacketPreview ?? evidencePacket).hazardousWasteIntegrity?.recommendedNextSteps ?? null, null, 2)}</pre></div>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(evidencePacketPreview ?? evidencePacket, null, 2)}</pre>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HazardousWasteAuditPage;
