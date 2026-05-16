import React, { useRef } from 'react';
import { PlatformTopCommandBar } from '../../components/platform/PlatformTopCommandBar';
import { WorkspaceCard } from '../../components/platform/WorkspaceCard';
import { SystemOverviewCard } from '../../components/platform/SystemOverviewCard';
import { AlertSummaryCard } from '../../components/platform/AlertSummaryCard';

export interface PlanetaryIntelligenceHomeProps {
  onNavigate: (view: string) => void;
  onOpenLiveMap?: () => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

/**
 * Investor-grade Planetary Intelligence launcher — vertical scroll, primary workspace ribbons.
 */
export default function PlanetaryIntelligenceHome({
  onNavigate,
  onOpenLiveMap,
  onOpenMobileNav,
  useMobileLayout,
}: PlanetaryIntelligenceHomeProps): React.ReactElement {
  const workspacesRef = useRef<HTMLDivElement | null>(null);

  const scrollToWorkspaces = () => {
    workspacesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const image = {
    carbon: '/main-screen/Offset-Marketplace/hero-meadow-forest-sky.png',
    ocean: '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png',
    water: '/main-screen/satellite-water-analysis.png',
    emissions: '/main-screen/land-mineral-monitoring.png',
    biosphere: '/main-screen/Offset-Marketplace/parcel-aerial-agricultural-plot.png',
    evidence: '/main-screen/public-ledger.png',
    disaster: '/main-screen/field-missions.png',
  };

  const heroVisualUrl = '/main-screen/dpal-mission-control-hero.png';

  return (
    <div className="min-h-screen bg-slate-100/90 pb-24">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <PlatformTopCommandBar
          onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined}
        />

        {/* Hero — split panel: narrative left, Earth / intelligence visual right + overlaid overview (mockup) */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06]">
          <div className="flex min-h-[min(100vw,420px)] flex-col lg:min-h-[380px] lg:flex-row">
            <div className="flex flex-1 flex-col justify-center border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/90 px-8 py-10 sm:px-10 lg:max-w-[min(100%,520px)] lg:border-b-0 lg:border-r lg:border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Monitor. Verify. Detect. Protect.</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.125rem] sm:leading-tight lg:text-4xl">
                Planetary Intelligence Platform
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                Real-time intelligence from satellites, sensors, AI and human validation — powered by blockchain evidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scrollToWorkspaces}
                  className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/25 transition hover:bg-slate-800"
                >
                  Explore Workspaces
                </button>
                <button
                  type="button"
                  onClick={() => (onOpenLiveMap ? onOpenLiveMap() : onNavigate('hub'))}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-400/80 hover:bg-emerald-50/60"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V7.618a1 1 0 011.105-.894l5-2.5a1 1 0 01.894 0L15 7.5l5-2.5a1 1 0 011.105.894v8.764a1 1 0 01-.553.894L15 18" strokeLinejoin="round" />
                    <path d="M15 7.5V18M9 5.118V20" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  View Live Map
                </button>
              </div>
            </div>

            <div className="relative min-h-[280px] flex-1 lg:min-h-0">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(135deg,rgba(15,23,42,0.5) 0%,rgba(30,58,138,0.25) 40%,transparent 70%),url(${heroVisualUrl})`,
                }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-sky-950/20" aria-hidden />

              {/* Subtle orbit / satellite accents (static, not animated “hologram”) */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full text-white/25" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
                <ellipse cx="58%" cy="42%" rx="120" ry="48" fill="none" stroke="currentColor" strokeWidth="0.5" transform="rotate(-12 240 128)" />
                <circle cx="72%" cy="28%" r="2.5" fill="currentColor" />
                <circle cx="48%" cy="52%" r="2" fill="currentColor" />
                <circle cx="82%" cy="48%" r="1.8" fill="currentColor" />
              </svg>

              <div className="relative z-[1] flex h-full min-h-[280px] items-end justify-center p-6 sm:p-8 lg:items-center lg:justify-end">
                <div className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-slate-950/78 p-6 text-white shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-2 border-b border-white/15 pb-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.35)]" aria-hidden />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200">Live Global Overview</p>
                  </div>
                  <dl className="mt-5 space-y-5">
                    <div>
                      <dt className="text-xs font-medium text-slate-400">Active Alerts</dt>
                      <dd className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-white">37</span>
                        <span className="text-xs font-semibold text-rose-300">High Priority</span>
                      </dd>
                    </div>
                    <div className="border-t border-white/10 pt-5">
                      <dt className="text-xs font-medium text-slate-400">Monitoring Areas</dt>
                      <dd className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-white">128</span>
                        <span className="text-xs font-semibold text-emerald-300">+12 this week</span>
                      </dd>
                    </div>
                    <div className="border-t border-white/10 pt-5">
                      <dt className="text-xs font-medium text-slate-400">Evidence Packets</dt>
                      <dd className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-white">2,846</span>
                        <span className="text-xs font-semibold text-emerald-300">+245 this week</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Primary workspaces */}
        <section ref={workspacesRef} id="primary-workspaces" className="mt-14 scroll-mt-8">
          <div className="flex max-w-3xl gap-4">
            <span className="mt-1 hidden h-14 w-1 shrink-0 rounded-full bg-emerald-500 sm:block" aria-hidden />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">Primary Workspaces</h2>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Intelligence domains for a healthier planet and accountable future.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Each workspace preserves existing DPAL engines—routing stays stable for collaborators and auditors.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-6">
            <WorkspaceCard
              imageSrc={image.carbon}
              imageAlt="Forest canopy aerial view representing land-based carbon monitoring"
              title="Carbon &amp; MRV"
              description="Monitor, verify and report carbon activities with precision and integrity."
              capabilities={['MRV', 'VIUs', 'Registry', 'Nodes']}
              statusLabel="Active"
              metrics={[{ label: 'Projects', value: '54' }, { label: 'Packets', value: '1,245' }]}
              onClick={() => onNavigate('carbonComplianceWorkspace')}
            />
            <WorkspaceCard
              imageSrc={image.ocean}
              imageAlt="Sustainability and environmental imagery representing ocean and marine intelligence"
              title="Ocean &amp; Plastic Intelligence"
              description="Advanced ocean analytics, plastic detection, PACE ocean color, and marine ecosystem health."
              capabilities={['PACE', 'Plastic AI', 'Phytoplankton', 'Coastal']}
              statusLabel="Active"
              metrics={[{ label: 'Areas', value: '86' }, { label: 'Detections', value: '1,382' }]}
              onClick={() => onNavigate('hyperspectralPlasticWatch')}
            />
            <WorkspaceCard
              imageSrc={image.water}
              imageAlt="Satellite-informed water basin visualization"
              title="Water Intelligence"
              description="Surface water quality, floods, watershed health and contamination tracking."
              capabilities={['AquaScan', 'Rivers', 'Floods', 'Quality']}
              statusLabel="Active"
              metrics={[{ label: 'Stations', value: '312' }, { label: 'Alerts', value: '18' }]}
              onClick={() => onNavigate('waterMonitor')}
            />
            <WorkspaceCard
              imageSrc={image.emissions}
              imageAlt="Industrial region landscape representing facility monitoring"
              title="Emissions &amp; Industrial Audits"
              description="Detect emissions, monitor facilities, track compliance and reduce environmental risk."
              capabilities={['CARB', 'Methane', 'Flares', 'Facilities']}
              statusLabel="Active"
              metrics={[{ label: 'Facilities', value: '243' }, { label: 'Alerts', value: '29' }]}
              onClick={() => onNavigate('carbEmissionsAudit')}
            />
            <WorkspaceCard
              imageSrc={image.biosphere}
              imageAlt="Agricultural and forest parcels from aerial perspective"
              title="Biosphere &amp; Land Intelligence"
              description="Monitor forests, vegetation health, land change, and ecosystem resilience."
              capabilities={['FLEX', 'Forests', 'Drought', 'Wildfire']}
              statusLabel="Active"
              metrics={[{ label: 'Areas', value: '197' }, { label: 'Alerts', value: '16' }]}
              onClick={() => onNavigate('earthObservation')}
            />
            <WorkspaceCard
              imageSrc={image.evidence}
              imageAlt="Abstract ledger motifs suggesting evidence and anchoring workflows"
              title="Evidence &amp; Blockchain"
              description="Immutable evidence packets, QR records, blockchain verification and audit trails."
              capabilities={['Packets', 'QR Records', 'Blockchain', 'Audit Trail']}
              statusLabel="Active"
              metrics={[{ label: 'Packets', value: '2,846' }, { label: 'Records', value: '18,245' }]}
              onClick={() => onNavigate('previewEvidencePacket')}
            />
            <WorkspaceCard
              imageSrc={image.disaster}
              imageAlt="Orbital vantage of weather systems implying hazard surveillance"
              title="Disaster &amp; Risk Intelligence"
              description="Early warning, hazard monitoring and impact assessment for critical events."
              capabilities={['Storms', 'Floods', 'Fire', 'Risk Maps']}
              statusLabel="Monitoring"
              statusTone="warning"
              metrics={[{ label: 'Events', value: '12' }, { label: 'Alerts', value: '7' }]}
              onClick={() => onNavigate('globalSignals')}
            />
          </div>
        </section>

        {/* System overview */}
        <section className="mt-16">
          <h3 className="text-sm font-semibold text-slate-900">System Overview</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SystemOverviewCard title="Satellites Online" value="24 / 28" subtitle="Operational" />
            <SystemOverviewCard title="AI Models" value="18" subtitle="Active" />
            <SystemOverviewCard title="Data Sources" value="156" subtitle="Connected" />
            <SystemOverviewCard title="Validators Online" value="24" subtitle="Available" />
            <SystemOverviewCard title="Uptime" value="99.9%" subtitle="Last 30 days" />
          </div>
        </section>

        {/* Recent alerts */}
        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent global alerts</h3>
            <button
              type="button"
              onClick={() => onNavigate('globalSignals')}
              className="shrink-0 text-sm font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              View All Alerts
            </button>
          </div>
          <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:thin] sm:mx-0 sm:px-0">
            <AlertSummaryCard title="High Methane Detected" location="Permian Basin, TX, USA" timeAgo="10 min ago" priority="high" priorityLabel="High" />
            <AlertSummaryCard title="Plastic Accumulation Hotspot" location="Gulf of Thailand" timeAgo="32 min ago" priority="medium" priorityLabel="Medium" />
            <AlertSummaryCard title="Algal Bloom Detected" location="Lake Erie, North America" timeAgo="1 hr ago" priority="medium" priorityLabel="Medium" />
            <AlertSummaryCard title="Flash Flood Warning" location="Mississippi Basin, USA" timeAgo="2 hr ago" priority="high" priorityLabel="High" />
          </div>
        </section>
      </div>
    </div>
  );
}
