import React, { useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Cloud, Cpu, Database, Droplets,
  Globe, Map, MapPin, ShieldCheck, Target, Upload, Users, Waves, Zap,
} from './icons';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import CarbonCreditWorkbench from './CarbonCreditWorkbench';
import type { CategoryId } from './CarbonCreditWorkbench';

interface DpalCarbonViewProps {
  onReturn: () => void;
  onGoToAfolu: () => void;
  onGoToWater: () => void;
  onGoToCarbon: () => void;
  onGoToOffsets: () => void;
}

interface CarbonHQCat {
  id: CategoryId;
  name: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  creditType: string;
  accent: string;
  border: string;
  bg: string;
}

const HQ_CATEGORIES: CarbonHQCat[] = [
  { id: 'afolu',     name: 'AFOLU',                  icon: Globe,         description: 'Forests, reforestation, land protection, and indigenous stewardship.',          creditType: 'Removal + Avoidance',   accent: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { id: 'waste',     name: 'Waste & Methane',         icon: Upload,        description: 'Landfill gas capture, biogas, composting, and waste-to-energy systems.',        creditType: 'Avoidance',             accent: 'text-green-300',   border: 'border-green-500/30',   bg: 'bg-green-500/10'   },
  { id: 'water',     name: 'Water & Blue Carbon',     icon: Droplets,      description: 'Wetlands, mangroves, blue ecosystems, and waterway restoration.',              creditType: 'Removal + Co-benefit',  accent: 'text-cyan-300',    border: 'border-cyan-500/30',    bg: 'bg-cyan-500/10'    },
  { id: 'energy',    name: 'Renewable Energy',        icon: Zap,           description: 'Solar, wind, micro-hydro, and off-grid electrification for clean power.',      creditType: 'Avoidance',             accent: 'text-amber-300',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10'   },
  { id: 'agri',      name: 'Regenerative Agriculture',icon: Activity,      description: 'No-till, biochar, organic soil restoration, and healthy food systems.',        creditType: 'Removal',               accent: 'text-lime-300',    border: 'border-lime-500/30',    bg: 'bg-lime-500/10'    },
  { id: 'industry',  name: 'Industrial Reduction',    icon: Database,      description: 'Carbon capture, energy efficiency, and cleaner industrial production.',        creditType: 'Avoidance',             accent: 'text-slate-200',   border: 'border-slate-500/30',   bg: 'bg-slate-500/10'   },
  { id: 'mobility',  name: 'Transport & Mobility',    icon: MapPin,        description: 'EV fleets, ride-sharing, bike systems, and delivery route optimization.',     creditType: 'Avoidance',             accent: 'text-blue-300',    border: 'border-blue-500/30',    bg: 'bg-blue-500/10'    },
  { id: 'fire',      name: 'Fire Prevention',         icon: AlertTriangle, description: 'Early detection, controlled burns, and post-fire ecosystem restoration.',     creditType: 'Avoidance',             accent: 'text-orange-300',  border: 'border-orange-500/30',  bg: 'bg-orange-500/10'  },
  { id: 'urban',     name: 'Urban Carbon',            icon: Map,           description: 'Urban tree corridors, cool roofs, and city-scale energy efficiency.',         creditType: 'Removal + Avoidance',   accent: 'text-violet-300',  border: 'border-violet-500/30',  bg: 'bg-violet-500/10'  },
  { id: 'cooking',   name: 'Clean Cooking',           icon: Target,        description: 'Efficient cookstoves, biogas digesters, and solar cooking solutions.',        creditType: 'Avoidance',             accent: 'text-rose-300',    border: 'border-rose-500/30',    bg: 'bg-rose-500/10'    },
  { id: 'livestock', name: 'Livestock Methane',       icon: Users,         description: 'Feed additives, manure management, and rotational grazing systems.',         creditType: 'Avoidance',             accent: 'text-amber-200',   border: 'border-amber-400/30',   bg: 'bg-amber-400/10'   },
  { id: 'marine',    name: 'Marine Carbon',           icon: Waves,         description: 'Seaweed farming, coastal ecosystem protection, and coral restoration.',       creditType: 'Removal + Co-benefit',  accent: 'text-sky-300',     border: 'border-sky-500/30',     bg: 'bg-sky-500/10'     },
  { id: 'cooling',   name: 'Cooling & Refrigerants',  icon: Cloud,         description: 'AC replacement, refrigerant recovery, and cold storage efficiency.',         creditType: 'Avoidance',             accent: 'text-indigo-300',  border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10'  },
  { id: 'digital',   name: 'Digital Efficiency',      icon: Cpu,           description: 'Cloud optimization, data center efficiency, and AI compute reduction.',      creditType: 'Avoidance',             accent: 'text-fuchsia-300', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/10' },
  { id: 'biobased',  name: 'Bio-Based Materials',     icon: Award,         description: 'Bioplastics, hemp materials, and sustainable packaging alternatives.',       creditType: 'Removal + Avoidance',   accent: 'text-teal-300',    border: 'border-teal-500/30',    bg: 'bg-teal-500/10'    },
  { id: 'disaster',  name: 'Disaster Prevention',     icon: ShieldCheck,   description: 'Flood prevention, drought mitigation, and landslide stabilization.',        creditType: 'Avoidance',             accent: 'text-red-300',     border: 'border-red-500/30',     bg: 'bg-red-500/10'     },
  { id: 'community', name: 'Community Behavior',      icon: Users,         description: 'Household energy reduction, water conservation, and recycling campaigns.',   creditType: 'Avoidance',             accent: 'text-pink-300',    border: 'border-pink-500/30',    bg: 'bg-pink-500/10'    },
];

const DEMO_MAP_PROJECTS = [
  { id: 'p1', name: 'Amazon Edge Forest Protection',   lat: -16.5, lng: -62.5,  status: 'monitoring',  tco2e: 1180, credits: 760, country: 'Bolivia'   },
  { id: 'p2', name: 'Watershed Agroforestry Belt',     lat:   5.6, lng: -75.8,  status: 'active',      tco2e:  365, credits: 225, country: 'Colombia'  },
  { id: 'p3', name: 'Fire Recovery Nursery Network',   lat:  39.7, lng: -121.8, status: 'buyer_ready', tco2e:  540, credits: 330, country: 'USA'       },
  { id: 'p4', name: 'Wetland Restoration Initiative',  lat:  -1.3, lng:  36.8,  status: 'active',      tco2e:  820, credits: 510, country: 'Kenya'     },
  { id: 'p5', name: 'Borneo Peatland Protection',      lat:  -0.8, lng: 114.9,  status: 'monitoring',  tco2e: 2200, credits: 1400, country: 'Indonesia' },
];

const HOW_IT_WORKS = [
  { label: 'Report',       detail: 'Community members document conditions on the ground.' },
  { label: 'Project',      detail: 'A carbon project is structured around a methodology.' },
  { label: 'Evidence',     detail: 'Missions collect GPS-tagged photos, logs, and data.' },
  { label: 'Monitoring',   detail: 'Satellite and AI watch canopy, water, and risk signals.' },
  { label: 'Verification', detail: 'Validators review proof and the MRV engine scores it.' },
  { label: 'Credits',      detail: 'Verified impact is issued as blockchain-anchored credits.' },
  { label: 'Marketplace',  detail: 'Credits are listed for buyers, registries, and offsets.' },
];

function pinColor(status: string): string {
  if (status === 'buyer_ready') return '#10b981';
  if (status === 'active')      return '#38bdf8';
  return '#f59e0b';
}
function pinLabel(status: string): string {
  if (status === 'buyer_ready') return 'Buyer Ready';
  if (status === 'active')      return 'Active';
  return 'Monitoring';
}

const PLATFORM_STATS = [
  { label: 'Active Projects',    value: '5',      tone: 'text-emerald-300' },
  { label: 'Estimated Credits',  value: '3,225',  tone: 'text-sky-300'    },
  { label: 'Verified Credits',   value: '1,265',  tone: 'text-lime-300'   },
  { label: 'Pending Validation', value: '4',      tone: 'text-amber-300'  },
  { label: 'Revenue Potential',  value: '$48K',   tone: 'text-fuchsia-300'},
  { label: 'Communities',        value: '10',     tone: 'text-rose-300'   },
];

const DpalCarbonView: React.FC<DpalCarbonViewProps> = ({
  onReturn,
  onGoToAfolu,
  onGoToWater,
  onGoToCarbon,
  onGoToOffsets,
}) => {
  const [view, setView] = useState<'home' | 'calculator'>('home');
  const [calcCategoryId, setCalcCategoryId] = useState<CategoryId>('afolu');
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const openCategory = (cat: CarbonHQCat) => {
    if (cat.id === 'afolu')  { onGoToAfolu();  return; }
    if (cat.id === 'water')  { onGoToWater();  return; }
    setCalcCategoryId(cat.id);
    setView('calculator');
  };

  if (view === 'calculator') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button
              onClick={() => setView('home')}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">DPAL Carbon</p>
              <h1 className="text-xl font-black text-white">Credit Calculator</h1>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24">
          <CarbonCreditWorkbench key={calcCategoryId} initialCategoryId={calcCategoryId} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onReturn}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">DPAL Carbon</p>
              <h1 className="text-2xl font-black text-white md:text-3xl">Carbon Credit Platform</h1>
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button onClick={onGoToCarbon}  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">MRV Engine</button>
            <button onClick={onGoToOffsets} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">Marketplace</button>
            <button onClick={onGoToAfolu}   className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:border-emerald-400 transition">Forest Integrity</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-8 pb-24">

        {/* ── 1. Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 px-8 py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)]" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">DPAL Carbon</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl">
              Turn verified real-world action into measurable climate credits.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Every project, mission, and satellite reading feeds the MRV engine — and every verified outcome becomes a tradeable carbon credit.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition"
              >
                Explore Categories
              </button>
              <button
                onClick={onGoToAfolu}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-bold text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 transition"
              >
                Launch Project
              </button>
              <button
                onClick={onGoToOffsets}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition"
              >
                View Marketplace
              </button>
              <button
                onClick={() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition"
              >
                See Impact Map
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. Category Grid ─────────────────────────────────── */}
        <section ref={categorySectionRef}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Carbon Credit Categories</p>
              <h3 className="mt-1 text-2xl font-black text-white">{HQ_CATEGORIES.length} active methodologies</h3>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">Each generates verified credits through the DPAL proof-and-MRV engine.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {HQ_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className={`flex flex-col rounded-2xl border ${cat.border} ${cat.bg} p-5 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cat.border} bg-slate-950`}>
                      <Icon className={`h-4 w-4 ${cat.accent}`} />
                    </div>
                    <h4 className="text-sm font-black leading-tight text-white">{cat.name}</h4>
                  </div>
                  <p className="mt-3 flex-1 text-xs leading-5 text-slate-400">{cat.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-lg border ${cat.border} px-2 py-1 text-[10px] font-bold ${cat.accent}`}>{cat.creditType}</span>
                    <button
                      onClick={() => openCategory(cat)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                    >
                      Open Category
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Summary Strip ─────────────────────────────────── */}
        <section>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Platform Snapshot</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PLATFORM_STATS.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-1 text-xl font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Interactive Impact Map ─────────────────────────── */}
        <section ref={mapSectionRef}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Impact Map</p>
              <h3 className="mt-1 text-2xl font-black text-white">Where projects are active</h3>
            </div>
            <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
              {[
                { color: '#10b981', label: 'Buyer Ready' },
                { color: '#38bdf8', label: 'Active'      },
                { color: '#f59e0b', label: 'Monitoring'  },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800" style={{ height: '420px' }}>
            <MapContainer
              center={[5, -20]}
              zoom={2}
              style={{ height: '420px', width: '100%', background: '#0f172a' }}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
              {DEMO_MAP_PROJECTS.map((proj) => (
                <CircleMarker
                  key={proj.id}
                  center={[proj.lat, proj.lng]}
                  radius={14}
                  pathOptions={{ color: pinColor(proj.status), fillColor: pinColor(proj.status), fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup>
                    <div className="min-w-[180px] space-y-1 text-xs">
                      <p className="font-bold text-slate-900">{proj.name}</p>
                      <p className="text-slate-600">{proj.country}</p>
                      <p>Status: <b>{pinLabel(proj.status)}</b></p>
                      <p>Est. tCO2e: <b>{proj.tco2e.toLocaleString()}</b></p>
                      <p>Credits: <b>{proj.credits.toLocaleString()}</b></p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* ── 5. How DPAL Works ────────────────────────────────── */}
        <section>
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">The Process</p>
            <h3 className="mt-1 text-2xl font-black text-white">How DPAL Works</h3>
            <p className="mt-2 text-sm text-slate-400">Seven steps from real-world action to tradeable climate credit.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-7">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.label} className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <span className="text-lg font-black text-emerald-300">{index + 1}</span>
                </div>
                <p className="mt-3 text-sm font-black text-white">{step.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <p className="text-sm font-bold text-emerald-100">
              Report → Project → Evidence → Monitoring → Verification → Credits → Marketplace
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Every step is recorded on the DPAL ledger — an auditable chain from field action to issued credit.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={onGoToAfolu}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition"
              >
                Start Your First Project
              </button>
              <button
                onClick={() => setView('calculator')}
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition"
              >
                Estimate Credits
              </button>
              <button
                onClick={onGoToCarbon}
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition"
              >
                Open MRV Engine
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default DpalCarbonView;
