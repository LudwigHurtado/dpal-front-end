import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Plus, Waves } from './icons';
import type { Hero } from '../types';
import {
  communityImpactOptions,
  concernTypes,
  mockEvidencePackets,
  mockSatelliteLayers,
  mockWaterProjects,
  suspectedSources,
  waterBodyTypes,
  type AquaScanProject,
  type ConcernType,
  type RiskBand,
  type SatelliteLayer,
  type WaterIndicator,
} from './water/aquaScanMockData';

interface AquaScanViewProps {
  onReturn: () => void;
  hero?: Hero;
}

const concernWeights: Record<ConcernType, number> = {
  Turbidity: 48,
  'Algae Bloom': 52,
  Flooding: 59,
  Drought: 43,
  'Thermal Anomaly': 54,
  'Suspected Contamination': 68,
  Runoff: 51,
  'Industrial Discharge': 72,
};

function clampRisk(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function riskBand(score: number): RiskBand {
  if (score <= 25) return 'Low concern';
  if (score <= 50) return 'Watchlist';
  if (score <= 75) return 'Elevated';
  return 'High Risk';
}

function mapBandToStatus(score: number): WaterIndicator['status'] {
  const band = riskBand(score);
  if (band === 'Low concern') return 'Normal';
  if (band === 'Watchlist') return 'Watchlist';
  if (band === 'Elevated') return 'Elevated';
  return 'High Risk';
}

function buildAiSummary(concernType: ConcernType, locationName: string): string {
  const base = {
    Turbidity:
      'Satellite indicators show elevated turbidity compared to baseline conditions. The strongest anomaly appears downstream of the selected monitoring point.',
    'Algae Bloom':
      'Chlorophyll-style indicators are elevated against seasonal reference values, suggesting potential algae bloom development in low-flow pockets.',
    Flooding:
      'Water extent indicators show expansion beyond expected boundary limits. Radar-compatible flood signatures appear strongest in lower elevation sections.',
    Drought:
      'Basin storage signals and vegetation-water stress indicators suggest a sustained dry trend with reduced surface water persistence.',
    'Thermal Anomaly':
      'Thermal overlays indicate above-baseline surface temperature in localized stretches that may affect oxygen balance and ecosystem stress.',
    'Suspected Contamination':
      'Multi-layer screening indicates unusual patterns near the selected zone, including visible water-color variance and anomaly clustering downstream.',
    Runoff:
      'Edge and turbidity indicators show runoff-like signatures aligned with recent drainage pathways and likely sediment transport corridors.',
    'Industrial Discharge':
      'Combined thermal and optical indicators suggest a concentrated anomaly near probable discharge corridors, with stronger signal intensity downstream.',
  }[concernType];

  return `${base} This does not confirm contamination. Field sampling or lab testing is recommended before making a final determination for ${locationName}.`;
}

function statusTone(status: WaterIndicator['status']): string {
  if (status === 'Normal') return 'text-emerald-300 border-emerald-500/50 bg-emerald-900/20';
  if (status === 'Watchlist') return 'text-amber-200 border-amber-500/50 bg-amber-900/20';
  if (status === 'Elevated') return 'text-orange-200 border-orange-500/50 bg-orange-900/20';
  return 'text-rose-200 border-rose-500/50 bg-rose-900/20';
}

export default function AquaScanView({ onReturn }: AquaScanViewProps) {
  const [projects, setProjects] = useState<AquaScanProject[]>(mockWaterProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockWaterProjects[0]?.id ?? '');
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(mockSatelliteLayers.slice(0, 3).map((l) => l.id));
  const [boundaryDrawn, setBoundaryDrawn] = useState(false);
  const [showPacket, setShowPacket] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [mapZoom, setMapZoom] = useState(100);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'terrain' | 'dark'>('satellite');
  const [gpsMode, setGpsMode] = useState<'Demo' | 'Active'>('Demo');
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [boundaryRevision, setBoundaryRevision] = useState(0);
  const [overlayState, setOverlayState] = useState({
    boundary: true,
    riskZone: true,
    reportPins: true,
    samplePoints: true,
    flowDirection: true,
  });

  const [draftProject, setDraftProject] = useState<AquaScanProject>({
    id: 'AQ-DRAFT',
    projectName: '',
    waterBodyType: 'River',
    locationName: '',
    latitude: '',
    longitude: '',
    polygonPlaceholder: '',
    concernType: 'Turbidity',
    suspectedSource: 'Unknown',
    communityImpact: [],
    evidenceCount: 0,
    hasLabResult: false,
    validatorStatus: 'Pending',
  });

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? draftProject,
    [projects, selectedProjectId, draftProject],
  );

  const validatorStatus = selectedProject.validatorStatus;

  const anomalyLayerCount = selectedLayerIds.length;

  const riskScore = useMemo(() => {
    const base = concernWeights[selectedProject.concernType] ?? 40;
    const evidenceBoost = Math.min(18, selectedProject.evidenceCount * 4);
    const anomalyBoost = anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4;
    const boundaryBoost = boundaryDrawn ? 6 : 0;
    const validatorBoost = selectedProject.validatorStatus === 'Validated' ? 8 : selectedProject.validatorStatus === 'Reviewed' ? 4 : 0;
    const labReduction = selectedProject.hasLabResult ? -10 : 0;
    return clampRisk(base + evidenceBoost + anomalyBoost + boundaryBoost + validatorBoost + labReduction);
  }, [selectedProject, anomalyLayerCount, boundaryDrawn]);

  const indicators = useMemo<WaterIndicator[]>(() => {
    const status = mapBandToStatus(riskScore);
    return [
      { id: 'turbidity', label: 'Turbidity Index', value: `${Math.max(18, Math.round(riskScore * 0.9))}/100`, trend: '+12% from baseline', status, explanation: 'Suspended solids signal compared with rolling baseline.' },
      { id: 'algae', label: 'Algae / Chlorophyll Risk', value: `${Math.round(riskScore * 0.76)}/100`, trend: 'Stable over 30 days', status, explanation: 'Potential bloom pressure from chlorophyll-style indicators.' },
      { id: 'extent', label: 'Water Extent Change', value: `${Math.round(riskScore * 0.42)}%`, trend: '+5% month-over-month', status, explanation: 'Surface-water boundary shift versus prior period.' },
      { id: 'flood', label: 'Flood Risk', value: `${Math.round(riskScore * 0.81)}/100`, trend: '+9% from baseline', status, explanation: 'Flood susceptibility from extent and terrain cues.' },
      { id: 'drought', label: 'Drought Stress', value: `${Math.round(riskScore * 0.62)}/100`, trend: 'Stable over 30 days', status, explanation: 'Storage and stress patterns from basin-scale indicators.' },
      { id: 'thermal', label: 'Thermal Anomaly', value: `${Math.round(riskScore * 0.73)}/100`, trend: '+3% this week', status, explanation: 'Surface-heat variance relative to seasonal expectation.' },
      { id: 'confidence', label: 'Evidence Confidence', value: `${Math.min(95, 45 + selectedProject.evidenceCount * 4 + anomalyLayerCount * 4)}%`, trend: `${selectedProject.evidenceCount} evidence item(s) logged`, status, explanation: 'Confidence is strengthened by corroborating evidence artifacts.' },
      { id: 'validator', label: 'Verification Status', value: validatorStatus, trend: validatorStatus === 'Validated' ? 'Validator-approved packet' : 'Awaiting final validation', status, explanation: 'Current verification state of the evidence package.' },
    ];
  }, [riskScore, validatorStatus, selectedProject.evidenceCount, anomalyLayerCount]);

  const aiSummary = useMemo(
    () => buildAiSummary(selectedProject.concernType, selectedProject.locationName || 'the selected area'),
    [selectedProject.concernType, selectedProject.locationName],
  );

  const packetPreview = useMemo(() => {
    const template = mockEvidencePackets[0];
    return {
      ...template,
      projectName: selectedProject.projectName || 'Unnamed project',
      location: selectedProject.locationName || 'No location selected',
      scanType: selectedProject.concernType,
      selectedLayers: mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name),
      timestamp: new Date().toLocaleString(),
      riskScore,
      aiSummary,
      uploadedEvidence: selectedProject.evidenceCount,
      validatorStatus,
      recommendedNextAction:
        riskBand(riskScore) === 'High Risk'
          ? 'Escalate with field sampling and notify relevant authority.'
          : template.recommendedNextAction,
    };
  }, [selectedProject, selectedLayerIds, riskScore, aiSummary, validatorStatus]);

  const riskLabelTone =
    riskBand(riskScore) === 'High Risk'
      ? 'border-rose-500/50 bg-rose-900/20 text-rose-100'
      : riskBand(riskScore) === 'Elevated'
      ? 'border-orange-500/50 bg-orange-900/20 text-orange-100'
      : riskBand(riskScore) === 'Watchlist'
      ? 'border-amber-500/50 bg-amber-900/20 text-amber-100'
      : 'border-emerald-500/50 bg-emerald-900/20 text-emerald-100';

  const mapConcernOverlayLabel =
    selectedProject.concernType === 'Suspected Contamination' || selectedProject.concernType === 'Industrial Discharge'
      ? 'Priority overlay: downstream anomaly corridor'
      : selectedProject.concernType === 'Flooding'
      ? 'Priority overlay: flood-extent expansion belt'
      : selectedProject.concernType === 'Drought'
      ? 'Priority overlay: low-storage stress zone'
      : 'Priority overlay: turbidity and runoff watch zone';
  const latitudeDisplay = Number(selectedProject.latitude || 0).toFixed(4);
  const longitudeDisplay = Number(selectedProject.longitude || 0).toFixed(4);

  function toggleLayer(layerId: string): void {
    setSelectedLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
    );
  }

  function updateSelectedProject(patch: Partial<AquaScanProject>): void {
    setProjects((prev) => prev.map((project) => (project.id === selectedProjectId ? { ...project, ...patch } : project)));
  }

  function addEvidenceItem(): void {
    if (selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
    }
    setActionNotice('Evidence item added in demo mode.');
  }

  function saveDraftProject(): void {
    if (!draftProject.projectName.trim() || !draftProject.locationName.trim()) {
      setActionNotice('Add project name and location before saving.');
      return;
    }
    const next: AquaScanProject = {
      ...draftProject,
      id: `AQ-${Date.now().toString().slice(-6)}`,
      evidenceCount: draftProject.evidenceCount,
      validatorStatus: draftProject.validatorStatus,
    };
    setProjects((prev) => [next, ...prev]);
    setSelectedProjectId(next.id);
    setActionNotice('Project intake saved in demo mode.');
  }

  function runAction(actionLabel: string): void {
    if (actionLabel === 'Upload Lab Result' && selectedProjectId) {
      updateSelectedProject({ hasLabResult: true });
    }
    if (actionLabel === 'Request Water Sample' && selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
    }
    if (actionLabel === 'Export Evidence Packet') {
      setShowPacket(true);
    }
    setActionNotice(`${actionLabel} queued in demo mode.`);
  }

  function runDemoScenario(): void {
    const preferredProject =
      projects.find((project) => project.waterBodyType === 'River')
      ?? projects.find((project) => project.waterBodyType === 'Wetland')
      ?? projects[0];

    if (!preferredProject) {
      setActionNotice('Create a project first, then run demo scenario.');
      return;
    }

    setSelectedProjectId(preferredProject.id);
    setProjects((prev) =>
      prev.map((project) =>
        project.id === preferredProject.id
          ? {
              ...project,
              concernType: project.waterBodyType === 'Wetland' ? 'Turbidity' : 'Suspected Contamination',
              evidenceCount: Math.max(project.evidenceCount, 6),
              hasLabResult: false,
              validatorStatus: 'Reviewed',
            }
          : project,
      ),
    );
    setSelectedLayerIds(['sentinel2', 'sentinel1', 'landsat89', 'sentinel3', 'swot']);
    setBoundaryDrawn(true);
    setShowPacket(true);
    setActionNotice('Demo scenario loaded.');
  }

  function toggleOverlay(key: keyof typeof overlayState): void {
    setOverlayState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function centerOnProject(): void {
    setMapOffset({ x: 0, y: 0 });
    setActionNotice('Map centered on selected project.');
  }

  function centerOnGps(): void {
    setGpsMode('Active');
    setMapOffset({ x: 10, y: -8 });
    setActionNotice('Centered on current GPS (demo).');
  }

  function beginMapDrag(event: React.MouseEvent<HTMLDivElement>): void {
    setIsDraggingMap(true);
    setDragStart({ x: event.clientX - mapOffset.x, y: event.clientY - mapOffset.y });
  }

  function moveMapDrag(event: React.MouseEvent<HTMLDivElement>): void {
    if (!isDraggingMap) return;
    setMapOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  }

  function endMapDrag(): void {
    setIsDraggingMap(false);
  }

  const actionButtons = [
    'Launch Field Mission',
    'Request Water Sample',
    'Upload Lab Result',
    'Notify Authority',
    'Create Restoration Project',
    'Add to Public Ledger',
    'Export Evidence Packet',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={onReturn} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200" aria-label="Return to main menu">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">DPAL AquaScan</span>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Demo layers</span>
          </div>
          <div className="ml-auto hidden text-[11px] text-slate-400 md:block">Evidence-based water screening workspace</div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
        {actionNotice ? (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-2 text-sm text-cyan-100">{actionNotice}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">How to Use DPAL AquaScan</p>
              <p className="mt-1 text-sm text-slate-300">Simple workflow for evidence-based water monitoring in demo mode.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runDemoScenario}
                className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/35"
              >
                Run Demo Scenario
              </button>
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-cyan-500/50"
              >
                {showGuide ? 'Hide Guide' : 'Show Guide'}
              </button>
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-cyan-500/40 bg-cyan-900/20 px-3 py-2 text-xs text-cyan-100">
            Demo Mode: satellite layers, AI summary, evidence packet, and actions use mock data.
          </p>

          {showGuide ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-100">Workflow Steps</h3>
                <ol className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Step 1: Select a water project.</li>
                  <li>Step 2: Choose the concern type.</li>
                  <li>Step 3: Review satellite-style indicators.</li>
                  <li>Step 4: Inspect the scan area/map.</li>
                  <li>Step 5: Read the AI Water Intelligence Summary.</li>
                  <li>Step 6: Upload field evidence or lab results.</li>
                  <li>Step 7: Generate an evidence packet.</li>
                  <li>Step 8: Route the issue to field mission, sample request, authority notice, restoration project, public ledger, or export.</li>
                </ol>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-slate-100">What AquaScan Can and Cannot Do</h3>
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Can do</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    <li>- Identify potential water-risk indicators.</li>
                    <li>- Compare conditions against a mock baseline.</li>
                    <li>- Organize satellite, field, and community evidence.</li>
                    <li>- Recommend next steps.</li>
                    <li>- Generate a demo evidence packet.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Cannot do</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    <li>- Confirm contamination without field sampling, lab testing, or official verification.</li>
                    <li>- Replace certified laboratory results.</li>
                    <li>- Guarantee carbon credits, legal findings, or official enforcement action from satellite indicators alone.</li>
                  </ul>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Water Project Intake Panel</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Project name" value={draftProject.projectName} onChange={(event) => setDraftProject((prev) => ({ ...prev, projectName: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.waterBodyType} onChange={(event) => setDraftProject((prev) => ({ ...prev, waterBodyType: event.target.value as AquaScanProject['waterBodyType'] }))}>
              {waterBodyTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Location name" value={draftProject.locationName} onChange={(event) => setDraftProject((prev) => ({ ...prev, locationName: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.concernType} onChange={(event) => setDraftProject((prev) => ({ ...prev, concernType: event.target.value as ConcernType }))}>
              {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="GPS latitude" value={draftProject.latitude} onChange={(event) => setDraftProject((prev) => ({ ...prev, latitude: event.target.value }))} />
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="GPS longitude" value={draftProject.longitude} onChange={(event) => setDraftProject((prev) => ({ ...prev, longitude: event.target.value }))} />
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" placeholder="Optional polygon / boundary placeholder" value={draftProject.polygonPlaceholder} onChange={(event) => setDraftProject((prev) => ({ ...prev, polygonPlaceholder: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.suspectedSource} onChange={(event) => setDraftProject((prev) => ({ ...prev, suspectedSource: event.target.value as AquaScanProject['suspectedSource'] }))}>
              {suspectedSources.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <button type="button" className="rounded-md border border-cyan-500/50 bg-cyan-900/25 px-2 py-1 text-cyan-100" onClick={addEvidenceItem}>Upload evidence (mock)</button>
              <span className="text-slate-400">{selectedProject.evidenceCount} total evidence item(s)</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <input id="boundary-flag" type="checkbox" checked={boundaryDrawn} onChange={(event) => setBoundaryDrawn(event.target.checked)} />
              <label htmlFor="boundary-flag" className="text-slate-300">Boundary placeholder captured</label>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-300">Community impact</p>
            <div className="flex flex-wrap gap-2">
              {communityImpactOptions.map((impact) => {
                const active = draftProject.communityImpact.includes(impact);
                return (
                  <button
                    key={impact}
                    type="button"
                    onClick={() =>
                      setDraftProject((prev) => ({
                        ...prev,
                        communityImpact: active
                          ? prev.communityImpact.filter((i) => i !== impact)
                          : [...prev.communityImpact, impact],
                      }))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? 'border-cyan-500/60 bg-cyan-900/30 text-cyan-100' : 'border-slate-600 bg-slate-800/60 text-slate-300'}`}
                  >
                    {impact}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={saveDraftProject} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-900/25 px-3 py-2 text-xs font-semibold text-emerald-100">
              <Plus className="h-3.5 w-3.5" />
              Save Project Intake
            </button>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProject.concernType}
              onChange={(event) => selectedProjectId && updateSelectedProject({ concernType: event.target.value as ConcernType })}
            >
              {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProject.validatorStatus}
              onChange={(event) => selectedProjectId && updateSelectedProject({ validatorStatus: event.target.value as AquaScanProject['validatorStatus'] })}
            >
              <option value="Pending">Validator: Pending</option>
              <option value="Reviewed">Validator: Reviewed</option>
              <option value="Validated">Validator: Validated</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={selectedProject.hasLabResult}
                onChange={(event) => selectedProjectId && updateSelectedProject({ hasLabResult: event.target.checked })}
              />
              Lab result uploaded
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Satellite Layer Selector</p>
              <span className="rounded-full border border-amber-400/40 bg-amber-900/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">Mock / demo layers</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {mockSatelliteLayers.map((layer: SatelliteLayer) => {
                const active = selectedLayerIds.includes(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={`rounded-xl border p-3 text-left transition ${active ? 'border-cyan-500/60 bg-cyan-900/20' : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100">{layer.name}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                        {active ? <CheckCircle className="h-3.5 w-3.5 text-cyan-300" /> : null}
                        {layer.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{layer.purpose}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{layer.capability}</p>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Risk Score Logic</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between"><span>Concern type baseline</span><span>+{concernWeights[selectedProject.concernType]}</span></div>
              <div className="flex justify-between"><span>Evidence items</span><span>+{Math.min(18, selectedProject.evidenceCount * 4)} ({selectedProject.evidenceCount})</span></div>
              <div className="flex justify-between"><span>Satellite anomaly status</span><span>+{anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4}</span></div>
              <div className="flex justify-between"><span>Lab result uploaded</span><span>{selectedProject.hasLabResult ? '-10' : '0'}</span></div>
              <div className="flex justify-between"><span>Validator status</span><span>{validatorStatus === 'Validated' ? '+8' : validatorStatus === 'Reviewed' ? '+4' : '0'}</span></div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-600 bg-slate-950 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Current risk score</p>
              <p className="mt-1 text-2xl font-black text-white">{riskScore} / 100</p>
              <p className="text-xs text-cyan-200">{riskBand(riskScore)}</p>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <div className="mb-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">AquaScan Map &amp; GPS</p>
            <p className="mt-1 text-xs text-slate-300">
              Visual monitoring area for the selected water project, including project location, scan boundary, risk zones, evidence points, and GPS context. The map can be adjusted by the user to inspect, refine, and manage the monitoring area.
            </p>
          </div>

          <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 md:grid-cols-6">
              <span>Location: <span className="font-semibold text-white">{selectedProject.locationName || 'Unspecified'}</span></span>
              <span>Lat: <span className="font-semibold text-white">{latitudeDisplay}</span></span>
              <span>Lng: <span className="font-semibold text-white">{longitudeDisplay}</span></span>
              <span>GPS: <span className="font-semibold text-cyan-200">{gpsMode}</span></span>
              <span>Concern: <span className="font-semibold text-amber-200">{selectedProject.concernType}</span></span>
              <span>Layers: <span className="font-semibold text-emerald-200">{selectedLayerIds.length} selected</span></span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMapZoom((prev) => Math.min(180, prev + 10))} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Zoom +</button>
              <button type="button" onClick={() => setMapZoom((prev) => Math.max(70, prev - 10))} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Zoom -</button>
              <button type="button" onClick={centerOnProject} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Center on project</button>
              <button type="button" onClick={centerOnGps} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Use current GPS</button>
              <button type="button" onClick={() => setMapExpanded((prev) => !prev)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">{mapExpanded ? 'Collapse map' : 'Expand map'}</button>
              <button type="button" onClick={() => setBoundaryDrawn((prev) => !prev)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">{boundaryDrawn ? 'Hide boundary' : 'Show boundary'}</button>
              <button type="button" onClick={() => setBoundaryRevision((prev) => prev + 1)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Edit/Redraw boundary</button>
              <select
                value={mapStyle}
                onChange={(event) => setMapStyle(event.target.value as 'satellite' | 'terrain' | 'dark')}
                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="satellite">Satellite-style</option>
                <option value="terrain">Terrain-style</option>
                <option value="dark">Dark monitoring-style</option>
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <button type="button" onClick={() => toggleOverlay('boundary')} className={`rounded border px-2 py-1 ${overlayState.boundary ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Boundary</button>
              <button type="button" onClick={() => toggleOverlay('riskZone')} className={`rounded border px-2 py-1 ${overlayState.riskZone ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Risk zone</button>
              <button type="button" onClick={() => toggleOverlay('reportPins')} className={`rounded border px-2 py-1 ${overlayState.reportPins ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Report pins</button>
              <button type="button" onClick={() => toggleOverlay('samplePoints')} className={`rounded border px-2 py-1 ${overlayState.samplePoints ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Sample points</button>
              <button type="button" onClick={() => toggleOverlay('flowDirection')} className={`rounded border px-2 py-1 ${overlayState.flowDirection ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Flow direction</button>
            </div>
          </div>

          <div
            role="presentation"
            onMouseDown={beginMapDrag}
            onMouseMove={moveMapDrag}
            onMouseUp={endMapDrag}
            onMouseLeave={endMapDrag}
            className={`relative cursor-grab overflow-hidden rounded-xl border border-slate-700 ${mapExpanded ? 'h-[34rem]' : 'h-[24rem]'} ${
              mapStyle === 'satellite'
                ? 'bg-gradient-to-br from-slate-900 via-cyan-950/50 to-slate-900'
                : mapStyle === 'terrain'
                ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-amber-950/30'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40'
            }`}
          >
            <div
              className="absolute inset-0 transition-transform duration-150"
              style={{
                transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.25) 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <div className="absolute left-[8%] top-[56%] h-2 w-[84%] rounded-full bg-cyan-500/30 blur-sm" />
              <div className="absolute left-[20%] top-[38%] h-28 w-28 rounded-full border border-cyan-300/30 bg-cyan-500/10" />

              {overlayState.boundary && boundaryDrawn ? (
                <div
                  className="absolute left-[24%] top-[26%] h-[42%] w-[47%] rounded-[28%_34%_40%_24%] border-2 border-cyan-300/70 bg-cyan-500/10"
                  style={{ transform: `rotate(${boundaryRevision % 2 === 0 ? '-6deg' : '4deg'})` }}
                />
              ) : null}
              {overlayState.riskZone ? (
                <div className={`absolute left-[40%] top-[34%] h-24 w-36 rounded-full border ${riskLabelTone} opacity-80`} />
              ) : null}
              {overlayState.reportPins ? (
                <>
                  <span className="absolute left-[34%] top-[42%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  <span className="absolute left-[58%] top-[50%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  <span className="absolute left-[47%] top-[61%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                </>
              ) : null}
              {overlayState.samplePoints ? (
                <>
                  <span className="absolute left-[41%] top-[48%] h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="absolute left-[52%] top-[43%] h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="absolute left-[55%] top-[58%] h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </>
              ) : null}
              <span className="absolute left-[49%] top-[46%] h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
              {overlayState.flowDirection ? (
                <div className="absolute bottom-4 right-4 rounded-md border border-slate-500/70 bg-black/45 px-2 py-1 text-[10px] font-semibold text-slate-100">
                  Flow NW → SE
                </div>
              ) : null}
            </div>

            <div className="absolute right-3 top-3 rounded-md border border-slate-500/70 bg-black/45 px-2 py-1 text-[10px] font-semibold text-cyan-100">
              Drag to pan · Zoom {mapZoom}%
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-[11px] text-slate-200 md:grid-cols-6">
            <div><span className="text-slate-400">Project ID:</span> {selectedProject.id}</div>
            <div><span className="text-slate-400">Water body type:</span> {selectedProject.waterBodyType}</div>
            <div><span className="text-slate-400">Last updated:</span> {new Date().toLocaleTimeString()}</div>
            <div><span className="text-slate-400">Boundary status:</span> {boundaryDrawn ? `Adjusted v${boundaryRevision + 1}` : 'Not defined'}</div>
            <div><span className="text-slate-400">Evidence points:</span> {selectedProject.evidenceCount}</div>
            <div><span className="text-slate-400">Selected layers:</span> {mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name).join(', ') || 'None'}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {indicators.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>{item.status}</span>
              </div>
              <p className="mt-2 text-xl font-black text-white">{item.value}</p>
              <p className="text-[11px] text-cyan-200">{item.trend}</p>
              <p className="mt-1 text-[11px] text-slate-400">{item.explanation}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">AI Water Intelligence Summary</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{aiSummary}</p>
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-900/20 p-2 text-[11px] text-amber-100">
            Satellite indicators are screening tools. Confirmed contamination requires field sampling, laboratory testing, or official verification.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Evidence Packet Generator</p>
              <button type="button" onClick={() => setShowPacket((prev) => !prev)} className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                Generate Evidence Packet
              </button>
            </div>
            {showPacket ? (
              <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
                <p className="text-sm font-bold text-white">DPAL AquaScan Evidence Packet (Demo Preview)</p>
                <p><span className="text-slate-400">Generated date/time:</span> {packetPreview.timestamp}</p>
                <p><span className="text-slate-400">Project ID:</span> {selectedProject.id}</p>
                <p><span className="text-slate-400">Packet title:</span> {packetPreview.projectName}</p>
                <p><span className="text-slate-400">Location:</span> {packetPreview.location}</p>
                <p><span className="text-slate-400">Concern type:</span> {packetPreview.scanType}</p>
                <p><span className="text-slate-400">Selected satellite layers:</span> {packetPreview.selectedLayers.join(', ') || 'None'}</p>
                <p><span className="text-slate-400">Risk score band:</span> {packetPreview.riskScore} ({riskBand(packetPreview.riskScore)})</p>
                <p><span className="text-slate-400">Evidence count:</span> {packetPreview.uploadedEvidence} item(s)</p>
                <p><span className="text-slate-400">Lab status:</span> {selectedProject.hasLabResult ? 'Uploaded' : 'Pending'}</p>
                <p><span className="text-slate-400">Validator status:</span> {packetPreview.validatorStatus}</p>
                <p><span className="text-slate-400">AI summary:</span> {packetPreview.aiSummary}</p>
                <p><span className="text-slate-400">Recommended action:</span> {packetPreview.recommendedNextAction}</p>
                <p><span className="text-slate-400">Audit ID placeholder:</span> {packetPreview.auditId}</p>
                <p><span className="text-slate-400">Ledger hash placeholder:</span> {packetPreview.ledgerHash}</p>
                <p className="rounded-md border border-amber-500/40 bg-amber-900/20 px-2 py-1 text-amber-100">
                  Export not connected — demo preview only.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Generate a demo packet preview from current project state and selected layers.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Action Center</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actionButtons.map((label) => (
                <button key={label} type="button" onClick={() => runAction(label)} className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-left text-xs font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-cyan-900/20">
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Pending' })} className="rounded border border-slate-600 px-2 py-1">Set Pending</button>
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Reviewed' })} className="rounded border border-slate-600 px-2 py-1">Set Reviewed</button>
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Validated' })} className="rounded border border-slate-600 px-2 py-1">Set Validated</button>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-amber-500/40 bg-amber-900/20 p-4">
          <p className="text-sm font-semibold text-amber-100">
            DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory or official verification.
          </p>
        </section>
      </div>
    </div>
  );
}
