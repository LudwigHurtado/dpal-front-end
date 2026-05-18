import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VIEW_PATHS } from '../../../../utils/appRoutes';
import { buildCarbonPuraContextUrl, CARBONPURA_DEFAULT_PROJECT_ID } from './carbonPuraProjectContext';
import { CarbonPuraLegacyWorkspaceBody } from './CarbonPuraLegacyWorkspaceBody';
import { GlobalIntelligenceMapPreview } from '../../../../components/platform/GlobalIntelligenceMapPreview';
import { OperationalEngineCard } from '../../../../components/platform/OperationalEngineCard';
import { OperatorPathStepper, type OperatorStep } from '../../../../components/platform/OperatorPathStepper';
import { EvidenceChainTimeline, type EvidenceChainStep } from '../../../../components/platform/EvidenceChainTimeline';
import { carbonPuraSectionAnchor } from './carbonPuraSections';

type CarbonPuraCommandCenterPageProps = {
  onReturn?: () => void;
  onOpenView?: (viewKey: string) => void;
};

export default function CarbonPuraCommandCenterPage({ onReturn, onOpenView }: CarbonPuraCommandCenterPageProps) {
  const navigate = useNavigate();

  const go = (view: string) => {
    onOpenView?.(view);
  };

  const ctxNavigate = (routePath: string) => {
    navigate(buildCarbonPuraContextUrl(routePath, CARBONPURA_DEFAULT_PROJECT_ID));
  };

  const scrollEvidence = () => {
    window.setTimeout(() => {
      document.getElementById(carbonPuraSectionAnchor('evidence-chain'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const operatorSteps: OperatorStep[] = [
    { id: '1', title: 'Open Water Monitor', status: 'Available now' },
    { id: '2', title: 'Open AquaScan for AOI scan', status: 'Available now' },
    { id: '3', title: 'Open PACE Plastic Watch', status: 'Available now' },
    { id: '4', title: 'Mark evidence for draft packet', status: 'Module-local' },
    { id: '5', title: 'Create backend draft packet', status: 'Backend event available' },
    { id: '6', title: 'QR living evidence page', status: 'Pending' },
    { id: '7', title: 'Continuous monitoring', status: 'Not implemented yet' },
  ];

  const evidenceSteps: EvidenceChainStep[] = [
    { id: 'e1', label: 'Project created', state: 'complete', detail: `Project ID ${CARBONPURA_DEFAULT_PROJECT_ID} (demo label).` },
    { id: 'e2', label: 'PACE suite selected', state: 'current', detail: 'Operator selection in module or draft panel — not auto-certified.' },
    { id: 'e3', label: 'Module launch available', state: 'complete', detail: 'SPA routes registered for live engines below.' },
    { id: 'e4', label: 'Evidence event saved', state: 'pending', detail: 'Requires configured backend and operator save — no fabricated events.' },
    { id: 'e5', label: 'Draft packet created', state: 'pending', detail: 'Pending until evidence events exist on API host.' },
    { id: 'e6', label: 'QR living evidence page', state: 'pending', detail: 'Pending packet + publishing workflow.' },
    { id: 'e7', label: 'Continuous monitoring', state: 'pending', detail: 'Engine-native schedules — not hub-auto-run.' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-[min(100%,1440px)] px-5 pb-20 pt-8 sm:px-8 lg:px-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300/95">CarbonPura · Environmental integrity</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">CarbonPura Live Environmental Integrity OS</h1>
            <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-200 sm:text-[15px]">
              Powered by DPAL — launch water monitoring, AquaScan satellite analysis, PACE plastic intelligence, carbon DMRV,
              forest integrity, air quality, hazardous waste audits, GeoLedger evidence, and registry-ready reporting from existing
              live engines.
            </p>
            <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-relaxed text-slate-200">
              <strong className="text-white">Disclaimer:</strong> DPAL provides live environmental intelligence, evidence organization,
              monitoring support, and interoperability readiness. Final certification, validation, Article 6 authorization, or registry
              approval remains subject to the applicable authority, registry, standard, or validator.
            </div>
          </div>

          <div className="grid gap-6 border-b border-slate-100 px-6 py-8 lg:grid-cols-3 lg:px-10">
            <div className="lg:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Executive</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">CarbonPura Demo Project</h2>
              <p className="mt-2 text-sm text-slate-600">
                Project ID: <span className="font-mono font-semibold text-slate-800">{CARBONPURA_DEFAULT_PROJECT_ID}</span>
              </p>
              <p className="mt-2 text-sm font-medium text-amber-800">Status: Evidence preparation</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => go('waterOperationsEngine')}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
                >
                  Start at Water Monitor
                </button>
                <button
                  type="button"
                  onClick={() => go('aquaScanWater')}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-emerald-300"
                >
                  Open AquaScan
                </button>
                <button
                  type="button"
                  onClick={() => go('hyperspectralPlasticWatch')}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-emerald-300"
                >
                  Open Plastic Watch
                </button>
                <button
                  type="button"
                  onClick={scrollEvidence}
                  className="rounded-2xl border border-dashed border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Evidence Chain
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="text-xs font-semibold text-slate-900">Operational map</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Illustrative AOI and module layers — markers represent project context only, not live satellite fixes.
              </p>
              <div
                className="mt-4 h-40 rounded-xl border border-slate-200 bg-cover bg-center shadow-inner"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg,rgba(15,23,42,0.75),rgba(13,148,136,0.35)),url(/main-screen/dpal-mission-control-hero.png)',
                }}
              />
              <ul className="mt-3 space-y-1 text-[11px] font-medium text-slate-500">
                <li>Water Monitor · AquaScan · PACE Plastic · Carbon / Forest · Air · Hazardous Waste</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <GlobalIntelligenceMapPreview onOpenGlobalSignals={() => go('globalSignals')} />
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">Live Engines</h2>
          <p className="mt-1 text-sm text-slate-600">Each card opens the production DPAL route — context buttons add CarbonPura query params only.</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <OperationalEngineCard
              title="Water Operations Engine"
              description="Project-based water monitoring, validator workflow, reports, snapshots, impact tracking, and DPAL Verified Water Impact Credits."
              routeLabel={VIEW_PATHS.waterOperationsEngine}
              onOpenLive={() => go('waterOperationsEngine')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.waterOperationsEngine)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="AquaScan Technical Water Scan"
              description="Technical AOI water satellite analysis, overlays, before/after comparison, and evidence packet support."
              routeLabel={VIEW_PATHS.aquaScanWater}
              onOpenLive={() => go('aquaScanWater')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.aquaScanWater)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Hyperspectral Plastic Watch / PACE Intelligence"
              description="PACE/EMIT/Sentinel/Landsat plastic-risk screening, spectral signatures, provider readiness, confounder checks, field validation, and evidence packet generation."
              routeLabel={VIEW_PATHS.hyperspectralPlasticWatch}
              onOpenLive={() => go('hyperspectralPlasticWatch')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.hyperspectralPlasticWatch)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Carbon DMRV Engine"
              description="Carbon project monitoring, baseline/additionality support, and carbon/CO₂e evidence workflows."
              routeLabel={VIEW_PATHS.carbonDMRV}
              onOpenLive={() => go('carbonDMRV')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.carbonDMRV)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Forest Integrity"
              description="Forest/biomass monitoring, NDVI/NBR/NDMI-style intelligence, and deforestation/reversal-risk support."
              routeLabel={VIEW_PATHS.forestIntegrity}
              onOpenLive={() => go('forestIntegrity')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.forestIntegrity)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Air Quality / ppm Intelligence"
              description="Air readings, pollutants, ppm/ppb/µg/m³ normalization, OpenAQ-style monitoring, and emissions context."
              routeLabel={VIEW_PATHS.airQualityMonitor}
              onOpenLive={() => go('airQualityMonitor')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.airQualityMonitor)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Hazardous Waste / Compliance Audit"
              description="Hazardous waste facility checks, industrial proximity, compliance history, and environmental risk evidence."
              routeLabel={VIEW_PATHS.hazardousWasteAudit}
              onOpenLive={() => go('hazardousWasteAudit')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.hazardousWasteAudit)}
              onVerifyOutput={scrollEvidence}
            />
            <OperationalEngineCard
              title="Environmental Intelligence Hub"
              description="Main DPAL environmental hub connecting carbon, water, plastic, forest, air, EPA, and satellite intelligence."
              routeLabel={VIEW_PATHS.environmentalIntelligenceHub}
              onOpenLive={() => go('environmentalIntelligenceHub')}
              onOpenWithContext={() => ctxNavigate(VIEW_PATHS.environmentalIntelligenceHub)}
              onVerifyOutput={scrollEvidence}
            />
          </div>
        </section>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recommended operator path</h2>
            <p className="mt-1 text-sm text-slate-600">Honest status labels — no auto-certification.</p>
            <div className="mt-6">
              <OperatorPathStepper steps={operatorSteps} />
            </div>
          </div>
          <div>
            <EvidenceChainTimeline
              steps={evidenceSteps}
              footerNote="Backend reachable only when API host exposes /api/partners/carbonpura/* with Prisma. Validator review and draft packets remain pending until evidence events exist — not claimed as finished here."
            />
          </div>
        </div>

        <CarbonPuraLegacyWorkspaceBody onReturn={onReturn} onOpenView={onOpenView} />
      </div>
    </div>
  );
}
