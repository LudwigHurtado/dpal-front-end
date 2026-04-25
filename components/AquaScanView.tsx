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
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-cyan-500/50"
            >
              {showGuide ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>

          {showGuide ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-100">Workflow Steps</h3>
                <ol className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>1. Select or create a water monitoring project.</li>
                  <li>2. Choose the water concern type.</li>
                  <li>3. Review the satellite-style indicators.</li>
                  <li>4. Check the map and scan boundary.</li>
                  <li>5. Read the AI Water Intelligence Summary.</li>
                  <li>6. Upload field evidence or lab results.</li>
                  <li>7. Generate an evidence packet.</li>
                  <li>8. Send the case to the next action: field mission, sample request, authority notice, restoration project, public ledger, or export.</li>
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
                    <li>- Help prepare an evidence packet.</li>
                    <li>- Recommend next steps.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Cannot do</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    <li>- Confirm contamination without field sampling, lab testing, or official verification.</li>
                    <li>- Replace government or certified laboratory findings.</li>
                    <li>- Guarantee carbon credits or legal findings from satellite data alone.</li>
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Map / Scan Area Panel</p>
              <span className="rounded-full border border-slate-500 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">Mock map panel</span>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-cyan-950/50 to-slate-900 p-4">
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.25) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-900/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300">Selected Project Location</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedProject.locationName || 'Select a project location'}</p>
                  <p className="text-xs text-slate-300">Lat {selectedProject.latitude || '—'} · Lng {selectedProject.longitude || '—'}</p>
                </div>
                <div className="rounded-lg border border-indigo-500/40 bg-indigo-900/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-indigo-300">Scan Boundary Placeholder</p>
                  <p className="mt-1 text-xs text-slate-200">{selectedProject.polygonPlaceholder || 'No boundary set. Use intake placeholder.'}</p>
                </div>
                <div className="rounded-lg border border-rose-500/40 bg-rose-900/20 p-3 text-xs text-slate-100">Risk zone overlay placeholder: <span className="font-semibold">{riskBand(riskScore)}</span></div>
                <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-xs text-slate-100">Report pins: 4 · Sample collection points: 3</div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-900/20 p-3 text-xs text-slate-100 md:col-span-2">Upstream → Downstream direction marker: Northwest to Southeast (mock directional flow).</div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">AI Water Intelligence Summary</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{aiSummary}</p>
            <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-900/20 p-2 text-[11px] text-amber-100">
              Satellite indicators are screening tools. Confirmed contamination requires field sampling, laboratory testing, or official verification.
            </p>
          </article>
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
                <p><span className="text-slate-400">Project:</span> {packetPreview.projectName}</p>
                <p><span className="text-slate-400">Location:</span> {packetPreview.location}</p>
                <p><span className="text-slate-400">Date/time:</span> {packetPreview.timestamp}</p>
                <p><span className="text-slate-400">Selected satellite layers:</span> {packetPreview.selectedLayers.join(', ') || 'None'}</p>
                <p><span className="text-slate-400">Scan type:</span> {packetPreview.scanType}</p>
                <p><span className="text-slate-400">Risk score:</span> {packetPreview.riskScore} ({riskBand(packetPreview.riskScore)})</p>
                <p><span className="text-slate-400">AI summary:</span> {packetPreview.aiSummary}</p>
                <p><span className="text-slate-400">Uploaded evidence:</span> {packetPreview.uploadedEvidence} item(s)</p>
                <p><span className="text-slate-400">Validator status:</span> {packetPreview.validatorStatus}</p>
                <p><span className="text-slate-400">Recommended next action:</span> {packetPreview.recommendedNextAction}</p>
                <p><span className="text-slate-400">Audit ID / ledger hash:</span> {packetPreview.auditId} / {packetPreview.ledgerHash}</p>
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
