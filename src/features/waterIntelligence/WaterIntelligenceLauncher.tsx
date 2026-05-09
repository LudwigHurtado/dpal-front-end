import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Droplets,
  ShieldCheck,
  Waves,
} from '../../../components/icons';

function MiniChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{
        background: 'rgba(148,163,184,0.15)',
        color: '#cbd5e1',
        border: '1px solid rgba(148,163,184,0.35)',
      }}
    >
      {children}
    </span>
  );
}

/**
 * Home surface for `/water-intelligence` — Colorado exchange flagship + FloodGuard city demo entry points.
 * Optional `onReturn` when embedded (e.g. from `/floodguard`).
 */
export default function WaterIntelligenceLauncher({
  onReturn,
}: {
  onReturn?: () => void;
}): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header className="rounded-2xl p-6 border dpal-border-subtle" style={{ background: 'var(--dpal-card)' }}>
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            {onReturn && (
              <button
                type="button"
                onClick={onReturn}
                className="text-[11px] font-semibold dpal-text-muted hover:opacity-80 mb-1"
              >
                ← Back
              </button>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Droplets className="w-7 h-7" style={{ color: 'var(--dpal-primary)' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] dpal-text-muted">
                DPAL Environmental Suite
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              DPAL Water Intelligence
            </h1>
            <p className="text-sm md:text-base dpal-text-secondary leading-relaxed">
              Verified water intelligence for rivers, reservoirs, cities, conservation programs, and public
              accountability.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <MiniChip>Pilot / Demonstration Mode</MiniChip>
              <MiniChip>Preview routing only</MiniChip>
              <MiniChip>Mock ledger capable</MiniChip>
              <MiniChip>Not government emergency alerts</MiniChip>
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-xs space-y-2 shrink-0 max-w-md"
            style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--dpal-text-primary)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
              Choose a Water Intelligence Project
            </div>
            <p className="dpal-text-secondary leading-relaxed">
              This hub lets users open basin-scale conservation intelligence, city flood-risk demos, new water
              projects, and investor/stakeholder presentations. FloodGuard handles flood-focused screening. Water
              Intelligence adds conservation accounting, acre-feet calculations, Water Ledger records, VWCU registry
              patterns, exchange categories, and public verification.
            </p>
            <p className="dpal-text-muted text-[11px] leading-relaxed">
              Human-verified and blockchain-anchored labels appear only when explicitly true for a record.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article
          className="rounded-2xl p-5 border lg:col-span-2 space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.08), var(--dpal-card))',
            borderColor: 'rgba(34,211,238,0.35)',
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#67e8f9' }}>
                Featured Project
              </div>
              <h2 className="text-lg md:text-xl font-extrabold mt-1" style={{ color: 'var(--dpal-text-primary)' }}>
                Colorado River Water Conservation Exchange Pilot
              </h2>
            </div>
            <span
              className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg"
              style={{ background: 'rgba(34,211,238,0.2)', color: '#a5f3fc', border: '1px solid rgba(34,211,238,0.45)' }}
            >
              River Basin / Conservation Exchange
            </span>
          </div>
          <p className="text-sm dpal-text-secondary leading-relaxed max-w-4xl">
            A pilot system for measuring conserved consumptive water use, protecting agricultural water-right value,
            issuing pilot Verified Water Conservation Units (VWCUs), and tracking whether saved water is used for resale,
            system enhancement, or sequestered/archived conservation.
          </p>
          <p className="text-xs dpal-text-secondary leading-relaxed max-w-4xl">
            Designed around the concept that verified water conservation can become a measurable, evidence-backed asset
            while protecting water-right holders.
          </p>
          <p className="text-[11px] dpal-text-muted">
            Includes Water Ledger · VWCU Registry · Evidence Packets · Exchange Categories · Club 20 Proposal Builder
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-[12px]">
            <div>
              <dt className="dpal-text-muted font-semibold">Project type</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>River Basin / Conservation Exchange</dd>
            </div>
            <div>
              <dt className="dpal-text-muted font-semibold">Geography</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Colorado River Basin</dd>
            </div>
            <div>
              <dt className="dpal-text-muted font-semibold">Primary unit</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Acre-feet</dd>
            </div>
            <div>
              <dt className="dpal-text-muted font-semibold">Ledger mode</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Mock / Pilot</dd>
            </div>
            <div>
              <dt className="dpal-text-muted font-semibold">Routing mode</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Preview only</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="dpal-text-muted font-semibold">Data mode</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Demo layers with future live API support</dd>
            </div>
            <div className="lg:col-span-3">
              <dt className="dpal-text-muted font-semibold">Core focus</dt>
              <dd style={{ color: 'var(--dpal-text-primary)' }}>Agriculture + urban conservation</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/water-intelligence/colorado-river')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
              style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
            >
              Open Colorado River Pilot
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/water-intelligence/colorado-river?focus=workflow')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border dpal-border-subtle"
              style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
            >
              Start Operator Workflow
            </button>
            <button
              type="button"
              onClick={() => navigate('/water-intelligence/club20')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border dpal-border-subtle"
              style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
            >
              Open Club 20 Proposal Builder
            </button>
          </div>
        </article>

        <article className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5" style={{ color: 'var(--dpal-primary)' }} />
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
              style={{ background: 'rgba(148,163,184,0.18)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.35)' }}
            >
              City Demo
            </span>
            <h2 className="text-base font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
              Santa Cruz de la Sierra FloodGuard Pilot
            </h2>
          </div>
          <p className="text-xs dpal-text-secondary leading-relaxed">
            City-level flood alert and evidence demo using API zones, API alerts, fallback rainfall, AquaScan satellite
            fallback, preview routing, and mock ledger.
          </p>
          <button
            type="button"
            onClick={() => navigate('/floodguard?p=santa-cruz')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
            style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
          >
            Open Santa Cruz FloodGuard Demo
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </article>

        <article className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
          <h2 className="text-base font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
            Water Alert Evidence Packet
          </h2>
          <p className="text-xs dpal-text-secondary leading-relaxed">
            Run a live evidence scan combining FloodGuard, USGS gauges, NWS alerts, GeoLedger, and anchor preview.
          </p>
          <button
            type="button"
            onClick={() => navigate('/water-intelligence/water-alert-evidence')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
            style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
          >
            Open Water Alert Evidence Packet
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </article>

        <article className="rounded-2xl p-5 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
          <h2 className="text-base font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
            Create New Water Project
          </h2>
          <p className="text-xs dpal-text-secondary leading-relaxed">
            Create a new water intelligence project for a river basin, irrigation district, reservoir system,
            municipality, flood-risk zone, drought program, or conservation-credit program.
          </p>
          <button
            type="button"
            onClick={() => navigate('/water-intelligence/create-project')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border dpal-border-subtle"
            style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
          >
            Create Project Placeholder
          </button>
        </article>

        <article className="rounded-2xl p-5 border lg:col-span-2 space-y-3" style={{ background: 'var(--dpal-card)' }}>
          <h2 className="text-base font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
            Investor / Stakeholder Demo
          </h2>
          <p className="text-xs dpal-text-secondary leading-relaxed max-w-4xl">
            Show how DPAL turns water signals into evidence packets, routing previews, ledger records, public verification
            pages, and verified water-conservation records — with explicit pilot labeling.
          </p>
          <button
            type="button"
            onClick={() => navigate('/water-intelligence/investor')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border dpal-border-subtle"
            style={{ background: 'var(--dpal-surface-alt)', color: 'var(--dpal-text-primary)' }}
          >
            Open Investor Demo Placeholder
          </button>
        </article>
      </div>
    </div>
  );
}
