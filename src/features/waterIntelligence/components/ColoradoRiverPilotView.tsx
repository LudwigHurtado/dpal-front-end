import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Droplets, ShieldCheck } from '../../../../components/icons';
import {
  COLORADO_MAP_AREAS,
  COLORADO_MOCK_STATUS,
  COLORADO_PLANNED_LAYERS,
  COLORADO_RIVER_PROJECT,
  COLORADO_RIVER_PROJECT_ID,
} from '../waterIntelligenceMockData';
import {
  COLORADO_WORKFLOW_STEPS,
  type ColoradoPilotTab,
  type ColoradoWorkflowStepId,
} from '../waterIntelligenceWorkflow';
import MapSourceGuidanceCard from './MapSourceGuidanceCard';
import WaterIntelligenceAssistant from './WaterIntelligenceAssistant';
import WaterIntelligenceWorkflowPanel from './WaterIntelligenceWorkflowPanel';

export interface ColoradoRiverPilotViewProps {
  onBack: () => void;
}

function provenanceTone(p: string): string {
  const x = p.toLowerCase();
  if (x.includes('mock') || x.includes('demo')) return '#fde68a';
  if (x.includes('satellite')) return '#a5f3fc';
  if (x.includes('user')) return '#c4b5fd';
  return '#cbd5e1';
}

const MOCK_ROUTING_ROWS = [
  { audience: 'Upper Basin water district', channel: 'secure_digest', decision: 'routable', note: 'Demo only' },
  { audience: 'Municipal conservation sponsor', channel: 'email_preview', decision: 'blocked', note: 'Preview policy — not sent' },
  { audience: 'Validator pool', channel: 'task_queue_preview', decision: 'routable', note: 'Dry-run' },
];

const ColoradoRiverPilotView: React.FC<ColoradoRiverPilotViewProps> = ({ onBack }) => {
  const location = useLocation();
  const workflowRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ColoradoPilotTab>('basin_map');
  const [completed, setCompleted] = useState<ColoradoWorkflowStepId[]>([]);
  const [evidenceDigest, setEvidenceDigest] = useState<string | null>(null);
  const [routingPreviewed, setRoutingPreviewed] = useState(false);
  const [ledgerAnchored, setLedgerAnchored] = useState(false);
  const [ledgerHash, setLedgerHash] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('focus');
    if (focus === 'public') setActiveTab('public_verify');
    else if (focus === 'workflow') {
      workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.search]);

  const markComplete = useCallback((id: ColoradoWorkflowStepId) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const openStepTab = useCallback((id: ColoradoWorkflowStepId) => {
    const step = COLORADO_WORKFLOW_STEPS.find((s) => s.id === id);
    if (step) setActiveTab(step.relatedTab);
  }, []);

  const generateEvidence = useCallback(() => {
    const demo =
      'demo-sha256-' +
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setEvidenceDigest(demo);
  }, []);

  const runRoutingPreview = useCallback(() => {
    setRoutingPreviewed(true);
  }, []);

  const anchorLedger = useCallback(() => {
    const h =
      'mock-anchor-' +
      Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setLedgerHash(h);
    setLedgerAnchored(true);
  }, []);

  const tabDefs: Array<{ id: ColoradoPilotTab; label: string }> = useMemo(
    () => [
      { id: 'basin_map', label: 'Basin Map' },
      { id: 'river_conditions', label: 'River & Reservoirs' },
      { id: 'conservation', label: 'Conservation' },
      { id: 'evidence', label: 'Evidence Packet' },
      { id: 'routing', label: 'Routing Preview' },
      { id: 'ledger', label: 'Ledger' },
      { id: 'public_verify', label: 'Public Verification' },
    ],
    [],
  );

  const statusCards = useMemo(
    () => [
      { k: 'Basin status', v: COLORADO_MOCK_STATUS.basinStatus },
      { k: 'Reservoir stress', v: COLORADO_MOCK_STATUS.reservoirStress },
      { k: 'Conservation opportunities', v: COLORADO_MOCK_STATUS.conservationOpportunities },
      { k: 'Active risk signals', v: COLORADO_MOCK_STATUS.activeRiskSignals },
      { k: 'Evidence packets', v: evidenceDigest ? `Demo digest recorded (${evidenceDigest.slice(0, 18)}…)` : COLORADO_MOCK_STATUS.evidencePackets },
      { k: 'Ledger records', v: ledgerHash ? `Mock record (${ledgerHash})` : COLORADO_MOCK_STATUS.ledgerRecords },
      { k: 'Routing mode', v: COLORADO_MOCK_STATUS.routingMode },
      { k: 'Data mode', v: COLORADO_MOCK_STATUS.dataMode },
    ],
    [evidenceDigest, ledgerHash],
  );

  return (
    <div className="space-y-4">
      <header className="rounded-2xl p-5 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold dpal-text-muted hover:opacity-80 mb-3"
          style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Water Intelligence home
        </button>
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Droplets className="w-6 h-6" style={{ color: 'var(--dpal-primary)' }} />
              <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                Water Intelligence Pilot
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.4)' }}
              >
                Mock / Demo data
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              {COLORADO_RIVER_PROJECT.name}
            </h1>
            <p className="text-xs md:text-sm dpal-text-secondary max-w-3xl leading-relaxed">
              {COLORADO_RIVER_PROJECT.description} Ledger: {COLORADO_RIVER_PROJECT.ledgerMode}. Routing:{' '}
              {COLORADO_RIVER_PROJECT.routingMode}. {COLORADO_RIVER_PROJECT.dataMode}.
            </p>
            <p className="text-[11px] dpal-text-muted">
              Project ID <span className="font-mono">{COLORADO_RIVER_PROJECT_ID}</span> · Primary geography:{' '}
              {COLORADO_RIVER_PROJECT.primaryGeography}
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-[11px] space-y-1 max-w-md shrink-0"
            style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
              Safety & labeling
            </div>
            <p className="dpal-text-secondary leading-relaxed">
              Not an official government emergency product. No agency approval implied. AI and demo layers support
              operators only — confirm provenance before external statements.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {statusCards.map((card) => (
            <div
              key={card.k}
              className="rounded-xl px-3 py-2 border dpal-border-subtle"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide dpal-text-muted">{card.k}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--dpal-text-primary)' }}>
                {card.v}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabDefs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{
                background: activeTab === tab.id ? 'rgba(34,211,238,0.18)' : 'var(--dpal-surface-alt)',
                color: activeTab === tab.id ? '#22d3ee' : 'var(--dpal-text-secondary)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(34,211,238,0.4)' : 'var(--dpal-border)'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {activeTab === 'basin_map' && (
            <section className="space-y-4">
              <div
                className="rounded-2xl border dpal-border-subtle overflow-hidden"
                style={{ background: 'var(--dpal-card)' }}
              >
                <div
                  className="px-4 py-3 border-b dpal-border-subtle flex items-center justify-between flex-wrap gap-2"
                  style={{ background: 'var(--dpal-surface-alt)' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                    Demo basin map panel
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fde68a' }}>
                    Illustrative geometry — not survey-grade
                  </span>
                </div>
                <div
                  className="relative min-h-[280px] md:min-h-[340px]"
                  style={{
                    background:
                      'radial-gradient(ellipse at 30% 40%, rgba(56,189,248,0.25), transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(34,197,94,0.12), transparent 50%), linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                  }}
                >
                  <div className="absolute inset-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-center gap-2 p-3 content-start">
                    {COLORADO_MAP_AREAS.map((area) => (
                      <div
                        key={area.id}
                        className="rounded-lg px-2 py-1.5 text-[10px] font-semibold"
                        style={{
                          background: 'rgba(15,23,42,0.75)',
                          border: '1px solid rgba(34,211,238,0.35)',
                          color: '#e2e8f0',
                        }}
                      >
                        <div>{area.label}</div>
                        {area.sublabel && <div className="text-[9px] font-normal opacity-80">{area.sublabel}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <MapSourceGuidanceCard variant="colorado" />
            </section>
          )}

          {activeTab === 'river_conditions' && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Lake Powell (demo trend)',
                  body: 'Storage stress indicator: elevated — synthetic slope for pilot storytelling.',
                  chip: 'Mock / Demo',
                },
                {
                  title: 'Lake Mead (demo trend)',
                  body: 'Lower basin pressure indicator: elevated — illustrative only.',
                  chip: 'Mock / Demo',
                },
                {
                  title: 'Stream gauges',
                  body: 'Planned USGS linkage — showing placeholder volatility band.',
                  chip: 'Fallback',
                },
                {
                  title: 'Snowpack / runoff',
                  body: 'Upper Basin outlook placeholder — connect NOAA/CBRFC feeds later.',
                  chip: 'AI-inferred',
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl p-4 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                      {card.title}
                    </h3>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a' }}>
                      {card.chip}
                    </span>
                  </div>
                  <p className="text-xs dpal-text-secondary leading-relaxed">{card.body}</p>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'conservation' && (
            <section className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                Conservation opportunities (demo)
              </h3>
              <ul className="text-xs dpal-text-secondary list-disc pl-5 space-y-2">
                <li>Agricultural irrigation efficiency — Grand Valley example corridor (illustrative acre-feet band).</li>
                <li>Urban outdoor efficiency — Front Range example conservation bundle (demo scoring).</li>
                <li>Lower Basin reuse / deficit irrigation — Yuma / Imperial example framing (no verified VCUs yet).</li>
              </ul>
              <p className="text-[11px] dpal-text-muted">
                Verified Water Conservation Units require stronger evidence chains than this demo provides.
              </p>
            </section>
          )}

          {activeTab === 'evidence' && (
            <section className="rounded-2xl p-5 border dpal-border-subtle space-y-4" style={{ background: 'var(--dpal-card)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                Evidence packet (demo generation)
              </h3>
              <p className="text-xs dpal-text-secondary">
                Generates a labeled demo digest for this pilot. Not a legal filing and not human-verified unless you
                complete an independent review process outside this UI.
              </p>
              <button
                type="button"
                onClick={generateEvidence}
                className="rounded-lg px-3 py-2 text-xs font-bold"
                style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
              >
                Generate Evidence Packet
              </button>
              {evidenceDigest && (
                <div
                  className="rounded-xl p-3 font-mono text-[11px] break-all"
                  style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
                >
                  <div className="text-[10px] font-sans font-bold uppercase dpal-text-muted mb-1">Demo content digest</div>
                  {evidenceDigest}
                </div>
              )}
            </section>
          )}

          {activeTab === 'routing' && (
            <section className="rounded-2xl p-5 border dpal-border-subtle space-y-4" style={{ background: 'var(--dpal-card)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                Routing / stakeholder preview
              </h3>
              <p className="text-xs dpal-text-secondary">
                Dry-run only — no notifications are delivered. Blocked routes illustrate policy gates.
              </p>
              <button
                type="button"
                onClick={runRoutingPreview}
                className="rounded-lg px-3 py-2 text-xs font-bold"
                style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
              >
                Generate Routing Preview
              </button>
              {routingPreviewed && (
                <div className="overflow-x-auto rounded-xl border dpal-border-subtle">
                  <table className="min-w-full text-[11px]">
                    <thead style={{ background: 'var(--dpal-surface-alt)' }}>
                      <tr className="dpal-text-muted text-left">
                        <th className="px-3 py-2">Audience</th>
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2">Decision</th>
                        <th className="px-3 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: 'var(--dpal-text-primary)' }}>
                      {MOCK_ROUTING_ROWS.map((row) => (
                        <tr key={row.audience} className="border-t dpal-border-subtle">
                          <td className="px-3 py-2">{row.audience}</td>
                          <td className="px-3 py-2">{row.channel}</td>
                          <td className="px-3 py-2">{row.decision}</td>
                          <td className="px-3 py-2 dpal-text-secondary">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'ledger' && (
            <section className="rounded-2xl p-5 border dpal-border-subtle space-y-4" style={{ background: 'var(--dpal-card)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                Anchor / register record (mock ledger)
              </h3>
              <p className="text-xs dpal-text-secondary">
                Mock ledger mode demonstrates anchoring UX. This is not represented as a production blockchain proof.
              </p>
              <button
                type="button"
                onClick={anchorLedger}
                disabled={!evidenceDigest}
                className="rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40"
                style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
              >
                Anchor / Register Record
              </button>
              {!evidenceDigest && (
                <p className="text-[11px] dpal-text-muted">Generate an evidence packet first (demo dependency).</p>
              )}
              {ledgerHash && (
                <div className="text-[11px] font-mono break-all" style={{ color: 'var(--dpal-text-primary)' }}>
                  Mock anchoring hash: {ledgerHash}
                </div>
              )}
            </section>
          )}

          {activeTab === 'public_verify' && (
            <section className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
                Public verification (demo surface)
              </h3>
              <p className="text-xs dpal-text-secondary leading-relaxed">
                Public-safe summary only — no private documents, no situation-room content, no raw citizen media. For
                FloodGuard city alerts, the production verification route remains{' '}
                <code className="text-[10px]">/floodguard/verify/:ledgerRecordId</code> after a real anchor.
              </p>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}>
                <div className="text-[10px] font-bold uppercase dpal-text-muted">Public project summary</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                  {COLORADO_RIVER_PROJECT.name}
                </div>
                <div className="text-xs dpal-text-secondary">Status: Pilot / demo intelligence record</div>
                {evidenceDigest && (
                  <div className="text-[11px] font-mono break-all">Evidence digest (demo): {evidenceDigest}</div>
                )}
                {ledgerHash && <div className="text-[11px] font-mono break-all">Ledger anchor (mock): {ledgerHash}</div>}
                <p className="text-[11px] dpal-text-muted pt-2 border-t dpal-border-subtle">
                  DPAL Water Intelligence does not replace official government emergency alerts or hydrologic authority.
                </p>
              </div>
              <button
                type="button"
                onClick={() => markComplete('cr_public')}
                className="rounded-lg px-3 py-2 text-xs font-semibold border dpal-border-subtle"
                style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
              >
                Mark public review complete
              </button>
            </section>
          )}

          <div className="rounded-2xl p-5 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--dpal-text-primary)' }}>
              Planned / demo data layers
            </h3>
            <ul className="space-y-2">
              {COLORADO_PLANNED_LAYERS.map((layer) => (
                <li
                  key={layer.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] border-b dpal-border-subtle pb-2 last:border-0"
                >
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{layer.name}</span>
                  <span className="font-bold uppercase" style={{ color: provenanceTone(layer.provenance) }}>
                    {layer.provenance}
                  </span>
                  {layer.notes && <span className="w-full dpal-text-muted">{layer.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div ref={workflowRef} className="space-y-4">
          <WaterIntelligenceAssistant
            context={{
              screen: 'colorado',
              completedSteps: completed,
              tabId: activeTab,
              evidenceGenerated: Boolean(evidenceDigest),
              routingPreviewed,
              ledgerAnchored,
              mockLedger: true,
              demoLayers: true,
            }}
          />
          <WaterIntelligenceWorkflowPanel
            heading="Colorado River operator workflow"
            subheading="Plain-English steps with checklists. Use Open to jump to the related tab, then mark complete."
            steps={COLORADO_WORKFLOW_STEPS}
            completedIds={completed}
            onOpenRelated={openStepTab}
            onMarkComplete={(id) => {
              if (id === 'cr_evidence') {
                if (evidenceDigest) markComplete(id);
                else setActiveTab('evidence');
                return;
              }
              if (id === 'cr_routing') {
                if (routingPreviewed) markComplete(id);
                else setActiveTab('routing');
                return;
              }
              if (id === 'cr_ledger') {
                if (ledgerAnchored) markComplete(id);
                else setActiveTab('ledger');
                return;
              }
              markComplete(id);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ColoradoRiverPilotView;
