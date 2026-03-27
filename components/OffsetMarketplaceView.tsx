import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, QrCode, CheckCircle, Upload, Search, Book, ChevronDown, ChevronUp } from './icons';
import QrCodeDisplay from './QrCodeDisplay';

interface OffsetMarketplaceViewProps {
  onReturn: () => void;
}

type ParcelStatus = 'Verified' | 'In Progress' | 'Needs Review';

interface ParcelItem {
  id: string;
  projectId: string;
  name: string;
  location: string;
  address: string;
  siteUrl: string;
  units: number;
  status: ParcelStatus;
  mission: string;
  imageUrl: string;
}

interface ReportingEntry {
  id: string;
  projectId: string;
  reportType: 'Mission Verification' | 'Satellite Review' | 'Carbon Batch' | 'Registry Packet';
  status: 'Approved' | 'Pending' | 'Flagged';
  submittedAt: string;
  reviewer: string;
  summary: string;
}

const PARCELS: ParcelItem[] = [
  {
    id: 'parcel-cr-14527',
    projectId: 'CR-14527',
    name: 'Protected Parcel North',
    location: 'Rainforest Zone A',
    address: 'Km 14 Forest Service Road, Rio Verde, Amazon Basin',
    siteUrl: 'https://example.org/projects/cr-14527',
    units: 1250,
    status: 'Verified',
    mission: 'Tree Health Check',
    imageUrl: '/main-screen/Offset-Marketplace/parcel-nationwide-land-data.png',
  },
  {
    id: 'parcel-cr-14528',
    projectId: 'CR-14528',
    name: 'Mangrove Block 2',
    location: 'Coastal Recovery Area',
    address: 'Muelle 8, Delta Verde Coast, Pacific Region',
    siteUrl: 'https://example.org/projects/cr-14528',
    units: 620,
    status: 'In Progress',
    mission: 'Biodiversity Survey',
    imageUrl: '/main-screen/Offset-Marketplace/parcel-satellite-parcel-overlay.png',
  },
  {
    id: 'parcel-cr-14529',
    projectId: 'CR-14529',
    name: 'Agroforestry Patch West',
    location: 'Community Farmland',
    address: 'Lot 27, San Isidro Cooperative, Valley District',
    siteUrl: 'https://example.org/projects/cr-14529',
    units: 910,
    status: 'Needs Review',
    mission: 'Methane Reduction Audit',
    imageUrl: '/main-screen/Offset-Marketplace/parcel-aerial-agricultural-plot.png',
  },
  {
    id: 'parcel-cr-14530',
    projectId: 'CR-14530',
    name: 'Cloud Forest Ridge',
    location: 'Highland Reserve',
    address: 'Sector Alto 3, Sierra Cloud Park, North Highlands',
    siteUrl: 'https://example.org/projects/cr-14530',
    units: 1430,
    status: 'Verified',
    mission: 'Canopy Growth Verification',
    imageUrl: '/main-screen/Offset-Marketplace/parcel-biome-land-use-analytics.png',
  },
  {
    id: 'parcel-cr-14531',
    projectId: 'CR-14531',
    name: 'Wetland Buffer East',
    location: 'River Protection Belt',
    address: 'Route 5 Mile 42, Azul River Wetlands',
    siteUrl: 'https://example.org/projects/cr-14531',
    units: 540,
    status: 'In Progress',
    mission: 'Waterline & Soil Carbon Check',
    imageUrl: '/main-screen/Offset-Marketplace/parcel-dual-parcel-aerial.png',
  },
  {
    id: 'parcel-cr-14532',
    projectId: 'CR-14532',
    name: 'Community Cookstove Cluster',
    location: 'Rural Energy Zone',
    address: 'Barrio Nuevo Community Center, Plot C12',
    siteUrl: 'https://example.org/projects/cr-14532',
    units: 780,
    status: 'Verified',
    mission: 'Clean Cookstove Usage Validation',
    imageUrl: '/main-screen/Offset-Marketplace/hero-community-carbon-banner.png',
  },
  {
    id: 'parcel-cr-14533',
    projectId: 'CR-14533',
    name: 'Biogas Pilot Corridor',
    location: 'Sustainable Farming Strip',
    address: 'Greenbelt Line 9, Campo Vivo Municipality',
    siteUrl: 'https://example.org/projects/cr-14533',
    units: 860,
    status: 'Needs Review',
    mission: 'Digestor Output Measurement',
    imageUrl: '/main-screen/Offset-Marketplace/hero-dpal-community-collage.png',
  },
];

const REPORTING_ENTRIES: ReportingEntry[] = [
  {
    id: 'rep-cr-9012',
    projectId: 'CR-14527',
    reportType: 'Mission Verification',
    status: 'Approved',
    submittedAt: '2026-03-25T14:22:00Z',
    reviewer: 'Field Verifier Node 12',
    summary: 'Tree survival mission approved with geo-tagged evidence and QR chain match.',
  },
  {
    id: 'rep-cr-9013',
    projectId: 'CR-14531',
    reportType: 'Satellite Review',
    status: 'Pending',
    submittedAt: '2026-03-26T09:10:00Z',
    reviewer: 'Remote Sensing Queue',
    summary: 'Wetland parcel anomaly queued for satellite NDVI comparison.',
  },
  {
    id: 'rep-cr-9014',
    projectId: 'CR-14533',
    reportType: 'Mission Verification',
    status: 'Flagged',
    submittedAt: '2026-03-26T18:40:00Z',
    reviewer: 'Compliance Desk',
    summary: 'Digestor output proof requires duplicate-claim review before approval.',
  },
  {
    id: 'rep-cr-9015',
    projectId: 'CR-14530',
    reportType: 'Carbon Batch',
    status: 'Approved',
    submittedAt: '2026-03-27T08:05:00Z',
    reviewer: 'Accounting Engine v2.3',
    summary: 'Batch calculation validated against methodology and verification logs.',
  },
  {
    id: 'rep-cr-9016',
    projectId: 'CR-14532',
    reportType: 'Registry Packet',
    status: 'Pending',
    submittedAt: '2026-03-27T10:15:00Z',
    reviewer: 'Registry Prep Unit',
    summary: 'Issuance support packet generated and awaiting final legal docs.',
  },
];

const SUSTAINABILITY_COLLAGE = '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png';

/** “See my life” QR life saver mark — paired with Track QR */
const QR_LIFE_SAVER_IMAGE = '/main-screen/Offset-Marketplace/qr-life-saver-see-my-life.png';

const HERO_ROTATION = [
  '/main-screen/Offset-Marketplace/hero-future-carbon-credits.png',
  SUSTAINABILITY_COLLAGE,
  '/main-screen/Offset-Marketplace/hero-meadow-forest-sky.png',
  '/main-screen/Offset-Marketplace/edu-carbon-credit-forest.png',
  '/main-screen/Offset-Marketplace/edu-measured-valued.png',
  '/main-screen/Offset-Marketplace/hero-dpal-community-collage.png',
  '/main-screen/Offset-Marketplace/hero-community-carbon-banner.png',
  '/main-screen/Offset-Marketplace/edu-landholders-benefit.png',
  '/main-screen/Offset-Marketplace/parcel-nationwide-land-data.png',
  '/main-screen/Offset-Marketplace/edu-carbon-cycle-infographic.png',
  '/main-screen/Offset-Marketplace/reference-land-credits-marketplace.png',
] as const;

interface EduSlide {
  id: string;
  title: string;
  caption: string;
  image: string;
}

const EDU_SLIDES: EduSlide[] = [
  {
    id: 'dpal-sustainability',
    title: 'DPAL network',
    caption:
      'Renewable energy, community agriculture, stewardship, clean cooking, and water — full-color field mosaic.',
    image: SUSTAINABILITY_COLLAGE,
  },
  {
    id: 'cycle',
    title: 'Credit cycle',
    caption: 'How value moves between industry, regulation, and conservation projects.',
    image: '/main-screen/Offset-Marketplace/edu-carbon-cycle-infographic.png',
  },
  {
    id: 'stores',
    title: 'Carbon on land',
    caption: 'Illustrative stores: atmosphere, plant biomass, and soil (gigatons).',
    image: '/main-screen/Offset-Marketplace/edu-carbon-stores-land.png',
  },
  {
    id: 'quantified',
    title: 'Removal quantified',
    caption: 'From baseline and planting through verification to issued credits.',
    image: '/main-screen/Offset-Marketplace/edu-removal-quantified.png',
  },
  {
    id: 'what-are',
    title: 'What are credits?',
    caption: 'Avoidance vs removal pathways — simplified project logic.',
    image: '/main-screen/Offset-Marketplace/edu-what-are-credits.png',
  },
  {
    id: 'safeguards',
    title: 'Community context',
    caption: 'Why transparency, safeguards, and fair benefit-sharing matter.',
    image: '/main-screen/Offset-Marketplace/edu-hidden-costs-communities.png',
  },
  {
    id: 'forest-hero',
    title: 'Forest carbon',
    caption: 'Nature-based solutions in full color — credits tied to living landscapes.',
    image: '/main-screen/Offset-Marketplace/edu-carbon-credit-forest.png',
  },
  {
    id: 'future',
    title: 'Future of credits',
    caption: 'Stewardship, growth, and long-term land care.',
    image: '/main-screen/Offset-Marketplace/hero-future-carbon-credits.png',
  },
  {
    id: 'measured',
    title: 'Measured & valued',
    caption: 'Linking emissions, projects, and value on the ground.',
    image: '/main-screen/Offset-Marketplace/edu-measured-valued.png',
  },
  {
    id: 'landholders',
    title: 'Landholders',
    caption: 'How nature-based crediting can support people on the land.',
    image: '/main-screen/Offset-Marketplace/edu-landholders-benefit.png',
  },
  {
    id: 'meadow',
    title: 'Corridors',
    caption: 'Open landscapes and forest lines — registry-scale stewardship.',
    image: '/main-screen/Offset-Marketplace/hero-meadow-forest-sky.png',
  },
];

const OffsetMarketplaceView: React.FC<OffsetMarketplaceViewProps> = ({ onReturn }) => {
  const [query, setQuery] = useState('');
  const [activeParcelId, setActiveParcelId] = useState<string | null>(PARCELS[0].id);
  const [showQr, setShowQr] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [activeEdu, setActiveEdu] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [reportingScope, setReportingScope] = useState<'active' | 'network'>('active');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PARCELS;
    return PARCELS.filter((p) =>
      `${p.projectId} ${p.name} ${p.location} ${p.address} ${p.mission}`.toLowerCase().includes(q)
    );
  }, [query]);

  const activeParcel = PARCELS.find((p) => p.id === activeParcelId) || visible[0];
  const rotatingImage = HERO_ROTATION[rotationIndex % HERO_ROTATION.length];
  const reportingTotals = useMemo(() => {
    const approved = REPORTING_ENTRIES.filter((r) => r.status === 'Approved').length;
    const pending = REPORTING_ENTRIES.filter((r) => r.status === 'Pending').length;
    const flagged = REPORTING_ENTRIES.filter((r) => r.status === 'Flagged').length;
    return { approved, pending, flagged };
  }, []);

  const networkTotals = useMemo(() => {
    const units = PARCELS.reduce((sum, p) => sum + p.units, 0);
    const verified = PARCELS.filter((p) => p.status === 'Verified').length;
    return { parcels: PARCELS.length, units, verified };
  }, []);

  const statusStyle = (status: ParcelStatus) => {
    if (status === 'Verified') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    if (status === 'In Progress') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  };

  useEffect(() => {
    if (heroPaused) return;
    const timer = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % HERO_ROTATION.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [heroPaused]);

  const reportingRows = useMemo(
    () =>
      reportingScope === 'active'
        ? REPORTING_ENTRIES.filter((r) => r.projectId === activeParcel?.projectId)
        : REPORTING_ENTRIES,
    [reportingScope, activeParcel?.projectId]
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-24 text-zinc-100">
      <div className="rounded-[2rem] border border-emerald-950/40 bg-gradient-to-b from-emerald-950/25 via-zinc-950/80 to-zinc-950 p-4 sm:p-6 md:p-8">
        <button
          onClick={onReturn}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-emerald-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Return
        </button>

        <header
          className="relative min-h-[min(42vw,280px)] overflow-hidden rounded-2xl border border-emerald-200/25 bg-emerald-950/20 shadow-xl shadow-emerald-950/30"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
        >
          <img
            src={rotatingImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-100 saturate-[1.05] transition-[transform,opacity] duration-700 ease-out"
            style={{ transform: heroPaused ? 'scale(1.02)' : 'scale(1)' }}
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/25 via-transparent to-sky-100/10"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl rounded-2xl border border-white/25 bg-white/20 px-5 py-4 shadow-lg backdrop-blur-md md:px-6 md:py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-900/90">Offset Marketplace</p>
                <h1 className="mt-1 text-3xl md:text-4xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
                  Carbon Operations MVP
                </h1>
                <p className="mt-3 text-xs md:text-sm text-white/95 normal-case tracking-normal max-w-lg [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
                  Registry-grade parcel view: search projects, inspect missions, and follow verification activity in one flow.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-0.5 rounded-xl border border-white/20 bg-black/10 px-3 py-2.5 backdrop-blur-sm md:min-w-[200px]">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/90">
                  {heroPaused ? 'Paused — hover to explore' : 'Scene rotation'}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {HERO_ROTATION.map((src, idx) => (
                    <button
                      key={`hero-dot-${idx}`}
                      type="button"
                      aria-label={`Show scene ${idx + 1}`}
                      onClick={() => setRotationIndex(idx)}
                      className={`h-2.5 w-2.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                        idx === rotationIndex % HERO_ROTATION.length
                          ? 'scale-125 bg-white shadow-[0_0_0_2px_rgba(16,185,129,0.6)]'
                          : 'bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          className="group relative mt-4 overflow-hidden rounded-2xl border border-emerald-200/25 bg-zinc-950 shadow-lg"
          aria-label="DPAL sustainability and community impact"
        >
          <img
            src={SUSTAINABILITY_COLLAGE}
            alt=""
            className="w-full max-h-[min(72vh,680px)] object-contain object-center transition duration-500 ease-out group-hover:scale-[1.01]"
            draggable={false}
          />
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 transition-transform duration-200 hover:scale-[1.02] hover:border-emerald-500/30">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Parcels live</p>
            <p className="text-2xl font-black text-white mt-0.5">{networkTotals.parcels}</p>
          </div>
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 transition-transform duration-200 hover:scale-[1.02] hover:border-emerald-400/50">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200/80">Verified sites</p>
            <p className="text-2xl font-black text-emerald-100 mt-0.5">{networkTotals.verified}</p>
          </div>
          <div className="rounded-2xl border border-amber-900/35 bg-amber-950/25 px-4 py-3 transition-transform duration-200 hover:scale-[1.02] hover:border-amber-400/50">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/80">Network tCO2e</p>
            <p className="text-2xl font-black text-amber-100 mt-0.5">{networkTotals.units.toLocaleString()}</p>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-emerald-800/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-950 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Book className="h-4 w-4 text-emerald-300" aria-hidden />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-200/80">Learn</p>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Carbon credits in context</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {EDU_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveEdu(idx)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  activeEdu === idx
                    ? 'border-emerald-400 bg-emerald-500/25 text-white shadow-[0_0_0_1px_rgba(52,211,153,0.4)]'
                    : 'border-zinc-600 bg-zinc-950/50 text-zinc-400 hover:border-emerald-600/50 hover:text-zinc-200'
                }`}
              >
                {slide.title}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-inner">
            <div className="relative max-h-[min(72vh,560px)] w-full overflow-auto bg-zinc-900/50">
              <img
                src={EDU_SLIDES[activeEdu]?.image}
                alt=""
                className="mx-auto w-full max-w-4xl object-contain object-top"
                draggable={false}
              />
            </div>
            <p className="border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-sm leading-relaxed text-zinc-300">
              {EDU_SLIDES[activeEdu]?.caption}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Parcel registry</p>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Projects & missions</h2>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{visible.length} shown</p>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID, place, or mission..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            <div className="max-h-[min(70vh,520px)] overflow-y-auto pr-1 space-y-2.5">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveParcelId(p.id)}
                  className={`group w-full text-left rounded-2xl border transition-all duration-200 ${
                    p.id === activeParcel?.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_24px_-8px_rgba(52,211,153,0.35)]'
                      : 'border-zinc-800 bg-zinc-950/50 hover:border-emerald-600/40 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 ring-0 transition-[box-shadow] duration-200 group-hover:ring-2 group-hover:ring-emerald-500/30">
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white uppercase truncate">{p.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5 font-mono">{p.projectId}</p>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusStyle(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-zinc-400 line-clamp-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0 text-zinc-500" />
                          {p.location}
                        </span>
                        <span className="text-zinc-600 mx-1.5">·</span>
                        <span className="text-amber-200/90">{p.units} tCO2e</span>
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-zinc-500 truncate">{p.mission}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
              {activeParcel ? (
                <>
                  <div className="group overflow-hidden rounded-2xl border border-zinc-700 aspect-[16/10] max-h-56 bg-zinc-900 shadow-lg">
                    <img
                      src={activeParcel.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Selected parcel</p>
                    <h2 className="text-xl font-black uppercase tracking-tight mt-1 text-white">{activeParcel.name}</h2>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono">{activeParcel.projectId}</p>
                  </div>

                  <dl className="mt-4 grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                    <div className="flex justify-between gap-3 border-b border-zinc-800/80 pb-2">
                      <dt className="text-zinc-500">Location</dt>
                      <dd className="font-semibold text-right text-zinc-100">{activeParcel.location}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-zinc-800/80 pb-2">
                      <dt className="text-zinc-500">Carbon units</dt>
                      <dd className="font-black text-amber-300">{activeParcel.units} tCO2e</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-zinc-800/80 pb-2">
                      <dt className="text-zinc-500">Mission</dt>
                      <dd className="font-semibold text-right text-emerald-200/90">{activeParcel.mission}</dd>
                    </div>
                    <div className="pt-1">
                      <dt className="text-zinc-500 text-xs">Address</dt>
                      <dd className="mt-1 text-xs text-zinc-300 leading-relaxed">{activeParcel.address}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-2xl border border-zinc-600 bg-white p-3 shadow-inner">
                    <p className="text-center text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">QR life saver</p>
                    <img
                      src={QR_LIFE_SAVER_IMAGE}
                      alt="See my life — QR life saver"
                      className="mx-auto mt-2 max-h-44 w-full max-w-[220px] object-contain"
                      draggable={false}
                    />
                    <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
                      See my life
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQr(true)}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 py-2.5 text-[11px] font-black uppercase tracking-wider hover:border-cyan-400 transition-colors"
                    >
                      <QrCode className="w-4 h-4 inline mr-1 align-text-bottom" />
                      Track QR
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 py-2.5 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1 align-text-bottom" />
                      Verify
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 py-2.5 text-[11px] font-black uppercase tracking-wider hover:border-amber-400 transition-colors"
                    >
                      <Upload className="w-4 h-4 inline mr-1 align-text-bottom" />
                      Evidence
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-700 bg-zinc-950/60 text-zinc-200 py-2.5 text-[11px] font-black uppercase tracking-wider hover:border-zinc-500 transition-colors"
                      onClick={() => window.open(activeParcel.siteUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Open site
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
                  No parcel selected
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Official reporting</p>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Verification & registry</h3>
            </div>
            <div className="inline-flex rounded-xl border border-zinc-700 bg-zinc-950/60 p-1 text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setReportingScope('active')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  reportingScope === 'active' ? 'bg-emerald-600/40 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                This parcel
              </button>
              <button
                type="button"
                onClick={() => setReportingScope('network')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  reportingScope === 'network' ? 'bg-emerald-600/40 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Full network
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition duration-200 hover:scale-[1.02] hover:border-emerald-400/50">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-200">Approved</p>
              <p className="text-2xl font-black text-emerald-100 mt-1">{reportingTotals.approved}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition duration-200 hover:scale-[1.02] hover:border-amber-400/50">
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200">Pending</p>
              <p className="text-2xl font-black text-amber-100 mt-1">{reportingTotals.pending}</p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 transition duration-200 hover:scale-[1.02] hover:border-rose-400/50">
              <p className="text-[10px] uppercase tracking-[0.25em] text-rose-200">Flagged</p>
              <p className="text-2xl font-black text-rose-100 mt-1">{reportingTotals.flagged}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {reportingRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-500">
                {reportingScope === 'active'
                  ? 'No verification reports are linked to this parcel in the demo dataset.'
                  : 'No reporting records loaded.'}
              </div>
            ) : (
              reportingRows.map((entry) => {
                const expanded = expandedReportId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-zinc-800/90 bg-zinc-950/50 transition-colors hover:border-emerald-700/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedReportId((prev) => (prev === entry.id ? null : entry.id))}
                      className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-2xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white uppercase">{entry.reportType}</p>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1 font-mono">
                          {entry.id} · {entry.projectId}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            entry.status === 'Approved'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                              : entry.status === 'Pending'
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                          }`}
                        >
                          {entry.status}
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-zinc-500" aria-hidden />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-zinc-500" aria-hidden />
                        )}
                      </div>
                    </button>
                    <div className="px-4 pb-3">
                      <p className="text-sm text-zinc-300 leading-relaxed">{entry.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        <span>Reviewer: {entry.reviewer}</span>
                        <span>{new Date(entry.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-xs leading-relaxed text-zinc-400">
                        Demo row: in production this expands to signer hashes, methodology link, and immutable audit references
                        for project {entry.projectId}.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {showQr && activeParcel && (
        <QrCodeDisplay
          type="report"
          id={activeParcel.id}
          onClose={() => setShowQr(false)}
          brandImageUrl={QR_LIFE_SAVER_IMAGE}
          brandImageAlt="See my life — QR life saver"
        />
      )}
    </div>
  );
};

export default OffsetMarketplaceView;
