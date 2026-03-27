import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, QrCode, ShieldCheck, Coins, CheckCircle, Upload, Search } from './icons';
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 2.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 3.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 4.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 2.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 3.png',
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
    imageUrl: '/main-screen/Offset-Marketplace/offset-marketplace 4.png',
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

const OFFSET_MARKETPLACE_ROTATION = [
  '/main-screen/Offset-Marketplace/offset-marketplace.png',
  '/main-screen/Offset-Marketplace/offset-marketplace 2.png',
  '/main-screen/Offset-Marketplace/offset-marketplace 3.png',
  '/main-screen/Offset-Marketplace/offset-marketplace 4.png',
];

const OffsetMarketplaceView: React.FC<OffsetMarketplaceViewProps> = ({ onReturn }) => {
  const [query, setQuery] = useState('');
  const [activeParcelId, setActiveParcelId] = useState<string | null>(PARCELS[0].id);
  const [showQr, setShowQr] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PARCELS;
    return PARCELS.filter((p) =>
      `${p.projectId} ${p.name} ${p.location} ${p.address} ${p.mission}`.toLowerCase().includes(q)
    );
  }, [query]);

  const activeParcel = PARCELS.find((p) => p.id === activeParcelId) || visible[0];
  const rotatingImage = OFFSET_MARKETPLACE_ROTATION[rotationIndex % OFFSET_MARKETPLACE_ROTATION.length];
  const reportingForActive = useMemo(
    () => REPORTING_ENTRIES.filter((r) => r.projectId === activeParcel?.projectId),
    [activeParcel?.projectId]
  );
  const reportingTotals = useMemo(() => {
    const approved = REPORTING_ENTRIES.filter((r) => r.status === 'Approved').length;
    const pending = REPORTING_ENTRIES.filter((r) => r.status === 'Pending').length;
    const flagged = REPORTING_ENTRIES.filter((r) => r.status === 'Flagged').length;
    return { approved, pending, flagged };
  }, []);

  const statusStyle = (status: ParcelStatus) => {
    if (status === 'Verified') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    if (status === 'In Progress') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % OFFSET_MARKETPLACE_ROTATION.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-24 font-mono text-zinc-100">
      <button
        onClick={onReturn}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Return
      </button>

      <header className="relative overflow-hidden rounded-[2.2rem] border border-zinc-800 bg-zinc-900/70 p-5 md:p-7 mb-6">
        <img
          src={rotatingImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-700"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-300">Offset Marketplace</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-black uppercase tracking-tight text-white">Carbon Operations MVP</h1>
          <p className="mt-3 text-xs md:text-sm text-zinc-200 uppercase tracking-[0.2em]">
            Parcel registry, QR verification, mission monitoring, and traceable unit flow.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-1.5">
            {OFFSET_MARKETPLACE_ROTATION.map((_, idx) => (
              <span
                key={`rot-dot-${idx}`}
                className={`h-1.5 w-1.5 rounded-full ${idx === rotationIndex ? 'bg-cyan-300' : 'bg-zinc-500'}`}
              />
            ))}
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-300">Live image rotation</span>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parcel, project, mission..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-3">
            {visible.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveParcelId(p.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  p.id === activeParcel?.id ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-600'
                }`}
              >
                <div className="mb-3 rounded-xl overflow-hidden border border-zinc-800 h-28">
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover opacity-90" />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white uppercase">{p.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1">Project {p.projectId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>
                  <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-300" /> {p.units} tCO2e</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {p.mission}</span>
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{p.address}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          {activeParcel ? (
            <>
              <div className="rounded-2xl overflow-hidden border border-zinc-800 h-44">
                <img
                  src={activeParcel.projectId === 'CR-14527' ? rotatingImage : activeParcel.imageUrl}
                  alt=""
                  className="w-full h-full object-cover transition-opacity duration-700"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Selected Parcel</p>
                <h2 className="text-xl font-black uppercase tracking-tight mt-1">{activeParcel.name}</h2>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-zinc-400">Project ID</span><span className="font-black">{activeParcel.projectId}</span></div>
                <div className="flex items-center justify-between"><span className="text-zinc-400">Location</span><span className="font-black">{activeParcel.location}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Address</span><span className="font-black text-right">{activeParcel.address}</span></div>
                <div className="flex items-center justify-between"><span className="text-zinc-400">Carbon Units</span><span className="font-black text-amber-300">{activeParcel.units} tCO2e</span></div>
                <div className="flex items-center justify-between"><span className="text-zinc-400">Active Mission</span><span className="font-black">{activeParcel.mission}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 py-3 text-xs font-black uppercase tracking-wider hover:border-cyan-400 transition-colors"
                >
                  <QrCode className="w-4 h-4 inline mr-1" />
                  Track QR
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 py-3 text-xs font-black uppercase tracking-wider hover:border-emerald-400 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Verify
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 py-3 text-xs font-black uppercase tracking-wider hover:border-amber-400 transition-colors"
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  Upload Evidence
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 text-zinc-200 py-3 text-xs font-black uppercase tracking-wider hover:border-zinc-500 transition-colors"
                  onClick={() => window.open(activeParcel.siteUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open Site
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
              No parcel selected
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Official Reporting</p>
            <h3 className="text-lg font-black uppercase tracking-tight">Verification & Registry Activity</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-200">Approved</p>
            <p className="text-2xl font-black text-emerald-100 mt-1">{reportingTotals.approved}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200">Pending</p>
            <p className="text-2xl font-black text-amber-100 mt-1">{reportingTotals.pending}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-rose-200">Flagged</p>
            <p className="text-2xl font-black text-rose-100 mt-1">{reportingTotals.flagged}</p>
          </div>
        </div>

        <div className="space-y-3">
          {(reportingForActive.length ? reportingForActive : REPORTING_ENTRIES.slice(0, 3)).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white uppercase">{entry.reportType}</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1">
                    Report {entry.id} · Project {entry.projectId}
                  </p>
                </div>
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
              </div>
              <p className="mt-3 text-sm text-zinc-300">{entry.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Reviewer: {entry.reviewer}</span>
                <span>{new Date(entry.submittedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showQr && activeParcel && (
        <QrCodeDisplay
          type="report"
          id={activeParcel.id}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
};

export default OffsetMarketplaceView;
