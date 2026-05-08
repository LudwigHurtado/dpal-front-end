import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Droplets, ShieldCheck } from '../../../components/icons';
import RussWaterMarketAssistant from './RussWaterMarketAssistant';
import ColoradoExchangeWorkflowPanel from './ColoradoExchangeWorkflowPanel';
import WaterProjectCard from './components/WaterProjectCard';
import type { ExchangeWorkflowStepId } from './coloradoExchangeWorkflow';
import {
  COLORADO_EXCHANGE_PILOT,
  COLORADO_PLANNED_LAYERS,
  COLORADO_PUBLIC_VERIFICATION_RECORDS,
} from './services/coloradoRiverMockData';
import { waterIntelligenceService } from './services/waterIntelligenceService';
export default function ColoradoRiverExchangePilotView(): React.ReactElement {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dashboard = waterIntelligenceService.getDashboard();
  const projects = waterIntelligenceService.listProjects();
  const baselineSectionRef = useRef<HTMLDivElement>(null);
  const monitoringSectionRef = useRef<HTMLDivElement>(null);
  const workflowSectionRef = useRef<HTMLDivElement>(null);
  const [workflowDone, setWorkflowDone] = useState<ExchangeWorkflowStepId[]>([]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    const el =
      focus === 'baseline'
        ? baselineSectionRef.current
        : focus === 'monitoring'
          ? monitoringSectionRef.current
          : focus === 'workflow'
            ? workflowSectionRef.current
            : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl p-5 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
        <Link
          to="/water-intelligence"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold dpal-text-muted hover:opacity-80 mb-3"
          style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Water Intelligence home
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Droplets className="w-6 h-6" style={{ color: 'var(--dpal-primary)' }} />
              <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                Colorado River Exchange
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.4)' }}
              >
                Mock / Demo data
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              {COLORADO_EXCHANGE_PILOT.name}
            </h1>
            <p className="text-xs md:text-sm dpal-text-secondary max-w-3xl leading-relaxed">{COLORADO_EXCHANGE_PILOT.headline}</p>
          </div>
          <div
            className="rounded-xl p-3 text-[11px] space-y-1 max-w-md shrink-0"
            style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
              Claim safety
            </div>
            <p className="dpal-text-secondary leading-relaxed">
              Not an official government product. No agency approval. No legal water-right transfer through this UI.
              VWCUs are pilot demonstration units unless accepted by a governing authority or contract program.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { k: 'Total pilot projects', v: dashboard.totalPilotProjects },
            { k: 'Baseline AF under review', v: `${dashboard.baselineAFUnderReview.toLocaleString()} AF` },
            { k: 'Estimated conserved AF', v: `${dashboard.estimatedConservedAF.toLocaleString()} AF` },
            { k: 'Net verified conservation', v: `${dashboard.netVerifiedConservationAF.toLocaleString()} AF` },
            { k: 'Pilot VWCUs eligible', v: dashboard.pilotVWcuEligible.toLocaleString() },
            { k: 'VWCUs — resale', v: dashboard.vwcuResale.toLocaleString() },
            { k: 'VWCUs — system enhancement', v: dashboard.vwcuSystemEnhancement.toLocaleString() },
            { k: 'VWCUs — sequestered/archived', v: dashboard.vwcuSequesteredArchived.toLocaleString() },
            { k: 'Evidence packets', v: String(dashboard.evidencePackets) },
            { k: 'Public verification records', v: String(dashboard.publicRecords) },
          ].map((card) => (
            <div key={card.k} className="rounded-xl px-3 py-2 border dpal-border-subtle" style={{ background: 'var(--dpal-surface-alt)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wide dpal-text-muted">{card.k}</div>
              <div className="text-[11px] mt-0.5 font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                {card.v}
              </div>
            </div>
          ))}
        </div>
      </header>

      <section>
        <h2 className="text-sm font-extrabold mb-3" style={{ color: 'var(--dpal-text-primary)' }}>
          Pilot projects (demonstration)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <WaterProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <section ref={baselineSectionRef} className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          Baseline records (demo)
        </h2>
        <p className="text-[11px] dpal-text-secondary">
          Historical consumptive use and entitlement references are illustrative. DPAL does not adjudicate water rights.
        </p>
        <ul className="text-[11px] dpal-text-secondary space-y-2 list-disc pl-5">
          {projects.map((p) => (
            <li key={p.id}>
              <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                {p.name}
              </span>{' '}
              — baseline {p.baselineUseAF.toLocaleString()} AF · sources labeled mock/demo.
            </li>
          ))}
        </ul>
      </section>

      <section ref={monitoringSectionRef} className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          Conservation monitoring (demo)
        </h2>
        <p className="text-[11px] dpal-text-secondary">
          After-condition signals are mixed satellite/sensor/user placeholders until live adapters are authorized.
        </p>
        <ul className="text-[11px] dpal-text-secondary space-y-2 list-disc pl-5">
          {projects.map((p) => (
            <li key={`m-${p.id}`}>
              <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>{p.name}</span> — monitored{' '}
              {p.currentMonitoredUseAF.toLocaleString()} AF · status {p.status.replace(/_/g, ' ')}.
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
          Public verification records (safe summaries)
        </h2>
        <ul className="space-y-2">
          {COLORADO_PUBLIC_VERIFICATION_RECORDS.map((r) => (
            <li key={r.recordId}>
              <Link className="text-[11px] font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--dpal-primary)' }} to={`/water-intelligence/public/${encodeURIComponent(r.recordId)}`}>
                {r.recordId} — {r.projectName}
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
              <span className="font-bold uppercase text-amber-200/90">{layer.provenance}</span>
              {layer.notes && <span className="w-full dpal-text-muted">{layer.notes}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div ref={workflowSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ColoradoExchangeWorkflowPanel completedIds={workflowDone} onCompletedChange={setWorkflowDone} />
        </div>
        <RussWaterMarketAssistant
          context={{
            screen: 'colorado_exchange',
            completedSteps: workflowDone,
            routePath: location.pathname,
          }}
        />
      </div>
    </div>
  );
}
