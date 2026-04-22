import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Camera, CheckCircle, Clock, Cloud,
  Cpu, Database, Droplets, FileText, Globe, Map, MapPin, Plus, QrCode, ShieldCheck,
  Target, Upload, Users, Waves, X, Zap,
} from './icons';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import CarbonCreditWorkbench from './CarbonCreditWorkbench';
import type { CategoryId } from './CarbonCreditWorkbench';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface DpalCarbonViewProps {
  onReturn: () => void;
  onGoToAfolu: () => void;
  onGoToWater: () => void;
  onGoToCarbon: () => void;
  onGoToOffsets: () => void;
  onGoToEcology?: () => void;
  onGoToMissions?: () => void;
  onGoToAir?: () => void;
  onGoToImpact?: () => void;
}

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type ProjectStatus = 'active' | 'monitoring' | 'buyer_ready' | 'seeking_funding' | 'mission_stage';

interface DpalCarbonProject {
  id: string;
  name: string;
  category: CategoryId;
  categoryName: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  status: ProjectStatus;
  tco2e: number;
  credits: number;
  creditsIssued: number;
  confidence: number;
  pricePerCredit: number;
  projectType: string;
  lastActivity: string;
  description: string;
  steward: string;
  hectares: number;
  methodology: string;
  verifiedBy: string;
  accent: string;
  border: string;
  bg: string;
}

interface ReportForm {
  reporterName: string;
  missionType: string;
  gpsConfirmed: boolean;
  photoCount: string;
  notes: string;
  conditionRating: string;
}

/* ─────────────────────────────────────────────
   Static data — categories
───────────────────────────────────────────── */
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
  { id: 'afolu',     name: 'AFOLU',                   icon: Globe,         description: 'Forests, reforestation, land protection, and indigenous stewardship.',         creditType: 'Removal + Avoidance',  accent: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { id: 'waste',     name: 'Waste & Methane',          icon: Upload,        description: 'Landfill gas capture, biogas, composting, and waste-to-energy systems.',       creditType: 'Avoidance',            accent: 'text-green-300',   border: 'border-green-500/30',   bg: 'bg-green-500/10'   },
  { id: 'water',     name: 'Water & Blue Carbon',      icon: Droplets,      description: 'Wetlands, mangroves, blue ecosystems, and waterway restoration.',             creditType: 'Removal + Co-benefit', accent: 'text-cyan-300',    border: 'border-cyan-500/30',    bg: 'bg-cyan-500/10'    },
  { id: 'energy',    name: 'Renewable Energy',         icon: Zap,           description: 'Solar, wind, micro-hydro, and off-grid electrification for clean power.',     creditType: 'Avoidance',            accent: 'text-amber-300',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10'   },
  { id: 'agri',      name: 'Regenerative Agriculture', icon: Activity,      description: 'No-till, biochar, organic soil restoration, and healthy food systems.',       creditType: 'Removal',              accent: 'text-lime-300',    border: 'border-lime-500/30',    bg: 'bg-lime-500/10'    },
  { id: 'industry',  name: 'Industrial Reduction',     icon: Database,      description: 'Carbon capture, energy efficiency, and cleaner industrial production.',       creditType: 'Avoidance',            accent: 'text-slate-200',   border: 'border-slate-500/30',   bg: 'bg-slate-500/10'   },
  { id: 'mobility',  name: 'Transport & Mobility',     icon: MapPin,        description: 'EV fleets, ride-sharing, bike systems, and delivery route optimization.',    creditType: 'Avoidance',            accent: 'text-blue-300',    border: 'border-blue-500/30',    bg: 'bg-blue-500/10'    },
  { id: 'fire',      name: 'Fire Prevention',          icon: AlertTriangle, description: 'Early detection, controlled burns, and post-fire ecosystem restoration.',    creditType: 'Avoidance',            accent: 'text-orange-300',  border: 'border-orange-500/30',  bg: 'bg-orange-500/10'  },
  { id: 'urban',     name: 'Urban Carbon',             icon: Map,           description: 'Urban tree corridors, cool roofs, and city-scale energy efficiency.',        creditType: 'Removal + Avoidance',  accent: 'text-violet-300',  border: 'border-violet-500/30',  bg: 'bg-violet-500/10'  },
  { id: 'cooking',   name: 'Clean Cooking',            icon: Target,        description: 'Efficient cookstoves, biogas digesters, and solar cooking solutions.',       creditType: 'Avoidance',            accent: 'text-rose-300',    border: 'border-rose-500/30',    bg: 'bg-rose-500/10'    },
  { id: 'livestock', name: 'Livestock Methane',        icon: Users,         description: 'Feed additives, manure management, and rotational grazing systems.',        creditType: 'Avoidance',            accent: 'text-amber-200',   border: 'border-amber-400/30',   bg: 'bg-amber-400/10'   },
  { id: 'marine',    name: 'Marine Carbon',            icon: Waves,         description: 'Seaweed farming, coastal ecosystem protection, and coral restoration.',      creditType: 'Removal + Co-benefit', accent: 'text-sky-300',     border: 'border-sky-500/30',     bg: 'bg-sky-500/10'     },
  { id: 'cooling',   name: 'Cooling & Refrigerants',   icon: Cloud,         description: 'AC replacement, refrigerant recovery, and cold storage efficiency.',        creditType: 'Avoidance',            accent: 'text-indigo-300',  border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10'  },
  { id: 'digital',   name: 'Digital Efficiency',       icon: Cpu,           description: 'Cloud optimization, data center efficiency, and AI compute reduction.',     creditType: 'Avoidance',            accent: 'text-fuchsia-300', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/10' },
  { id: 'biobased',  name: 'Bio-Based Materials',      icon: Award,         description: 'Bioplastics, hemp materials, and sustainable packaging alternatives.',      creditType: 'Removal + Avoidance',  accent: 'text-teal-300',    border: 'border-teal-500/30',    bg: 'bg-teal-500/10'    },
  { id: 'disaster',  name: 'Disaster Prevention',      icon: ShieldCheck,   description: 'Flood prevention, drought mitigation, and landslide stabilization.',       creditType: 'Avoidance',            accent: 'text-red-300',     border: 'border-red-500/30',     bg: 'bg-red-500/10'     },
  { id: 'community', name: 'Community Behavior',       icon: Users,         description: 'Household energy reduction, water conservation, and recycling campaigns.',  creditType: 'Avoidance',            accent: 'text-pink-300',    border: 'border-pink-500/30',    bg: 'bg-pink-500/10'    },
];

/* ─────────────────────────────────────────────
   Static data — projects (8 global demo)
───────────────────────────────────────────── */
const CARBON_PROJECTS: DpalCarbonProject[] = [
  {
    id: 'DPAL-001', name: 'Amazon Edge Forest Protection', category: 'afolu', categoryName: 'AFOLU',
    country: 'Bolivia', region: 'Santa Cruz', lat: -16.5, lng: -62.5,
    status: 'monitoring', tco2e: 1180, credits: 1180, creditsIssued: 760,
    confidence: 92, pricePerCredit: 19, projectType: 'Avoided Deforestation',
    lastActivity: '2026-04-20', description: 'Community patrol missions and canopy checks protect the Amazon edge from clearing pressure.',
    steward: 'Guardians Cooperative', hectares: 500, methodology: 'VM0015 REDD+', verifiedBy: 'DPAL Validator Network',
    accent: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10',
  },
  {
    id: 'DPAL-002', name: 'Watershed Agroforestry Belt', category: 'agri', categoryName: 'Regenerative Agriculture',
    country: 'Colombia', region: 'Antioquia', lat: 5.6, lng: -75.8,
    status: 'active', tco2e: 365, credits: 365, creditsIssued: 225,
    confidence: 88, pricePerCredit: 25, projectType: 'Agroforestry',
    lastActivity: '2026-04-18', description: 'Farmers plant agroforestry belts with repeat survival verification and parcel-level carbon tracking.',
    steward: 'Rio Claro Restoration Team', hectares: 84, methodology: 'AMS-III.AU', verifiedBy: 'DPAL + Third-party',
    accent: 'text-lime-300', border: 'border-lime-500/30', bg: 'bg-lime-500/10',
  },
  {
    id: 'DPAL-003', name: 'Fire Recovery Nursery Network', category: 'fire', categoryName: 'Fire Prevention',
    country: 'USA', region: 'California', lat: 39.7, lng: -121.8,
    status: 'buyer_ready', tco2e: 540, credits: 540, creditsIssued: 330,
    confidence: 94, pricePerCredit: 30, projectType: 'Post-fire Reforestation',
    lastActivity: '2026-04-19', description: 'Ridge replanting nursery coalition tracks post-fire regeneration through geo-tagged survival checks.',
    steward: 'Ridge Replanting Guild', hectares: 42, methodology: 'VM0047 ARR', verifiedBy: 'Sierra Mutual + DPAL',
    accent: 'text-orange-300', border: 'border-orange-500/30', bg: 'bg-orange-500/10',
  },
  {
    id: 'DPAL-004', name: 'Borneo Peatland Protection', category: 'water', categoryName: 'Water & Blue Carbon',
    country: 'Indonesia', region: 'Kalimantan', lat: -0.8, lng: 114.9,
    status: 'monitoring', tco2e: 2200, credits: 2200, creditsIssued: 1400,
    confidence: 89, pricePerCredit: 22, projectType: 'Peatland Conservation',
    lastActivity: '2026-04-17', description: 'Satellite-monitored peatland patrols prevent drainage and burning across one of the world\'s densest carbon stores.',
    steward: 'Kalimantan Land Trust', hectares: 1200, methodology: 'VM0004 Peatlands', verifiedBy: 'DPAL Validator Network',
    accent: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10',
  },
  {
    id: 'DPAL-005', name: 'Nairobi Solar District', category: 'energy', categoryName: 'Renewable Energy',
    country: 'Kenya', region: 'Nairobi County', lat: -1.3, lng: 36.8,
    status: 'active', tco2e: 820, credits: 820, creditsIssued: 510,
    confidence: 96, pricePerCredit: 12, projectType: 'Solar Electrification',
    lastActivity: '2026-04-21', description: 'Community solar microgrids displacing diesel generation across 14 sub-districts with metered output tracking.',
    steward: 'Nairobi Solar Cooperative', hectares: 0, methodology: 'AMS-I.D', verifiedBy: 'DPAL + AfDB',
    accent: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10',
  },
  {
    id: 'DPAL-006', name: 'Punjab Biogas Capture Network', category: 'waste', categoryName: 'Waste & Methane',
    country: 'India', region: 'Punjab', lat: 31.1, lng: 75.3,
    status: 'seeking_funding', tco2e: 640, credits: 640, creditsIssued: 0,
    confidence: 81, pricePerCredit: 14, projectType: 'Agricultural Biogas',
    lastActivity: '2026-04-15', description: 'Farm-level biogas digesters capture methane from livestock waste, replacing kerosene and LPG in rural kitchens.',
    steward: 'Punjab Rural Energy Collective', hectares: 0, methodology: 'AMS-III.D', verifiedBy: 'Pending',
    accent: 'text-green-300', border: 'border-green-500/30', bg: 'bg-green-500/10',
  },
  {
    id: 'DPAL-007', name: 'Patagonia Wetland Restoration', category: 'water', categoryName: 'Water & Blue Carbon',
    country: 'Argentina', region: 'Patagonia', lat: -43.5, lng: -65.8,
    status: 'buyer_ready', tco2e: 910, credits: 910, creditsIssued: 570,
    confidence: 91, pricePerCredit: 21, projectType: 'Wetland Restoration',
    lastActivity: '2026-04-20', description: 'Seasonal wetland restoration programs re-flood drained pampas marshes, rebuilding blue carbon stocks and biodiversity.',
    steward: 'Patagonia Conservation Alliance', hectares: 280, methodology: 'VM0033 Wetlands', verifiedBy: 'DPAL Validator Network',
    accent: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10',
  },
  {
    id: 'DPAL-008', name: 'Jakarta Urban Canopy Initiative', category: 'urban', categoryName: 'Urban Carbon',
    country: 'Indonesia', region: 'Jakarta', lat: -6.2, lng: 106.8,
    status: 'mission_stage', tco2e: 280, credits: 280, creditsIssued: 0,
    confidence: 74, pricePerCredit: 11, projectType: 'Urban Reforestation',
    lastActivity: '2026-04-16', description: 'Street-level canopy missions plant native species along transit corridors, with photo and GPS verification per tree.',
    steward: 'Jakarta Green Guild', hectares: 18, methodology: 'AR-ACM0003', verifiedBy: 'In Progress',
    accent: 'text-violet-300', border: 'border-violet-500/30', bg: 'bg-violet-500/10',
  },
];

/* ─────────────────────────────────────────────
   Static data — activity feed
───────────────────────────────────────────── */
const ACTIVITY_FEED = [
  { type: 'credit_issued',   icon: Award,        color: 'text-emerald-300', project: 'Amazon Edge Forest Protection', detail: '120 new credits issued',                          time: '2h ago'  },
  { type: 'mission_done',    icon: CheckCircle,  color: 'text-sky-300',     project: 'Watershed Agroforestry Belt',   detail: 'Plant Trees mission verified — 340 seedlings',     time: '4h ago'  },
  { type: 'validation',      icon: ShieldCheck,  color: 'text-lime-300',    project: 'Fire Recovery Nursery',         detail: 'MRV package approved by validator',                time: '6h ago'  },
  { type: 'buyer_match',     icon: Users,        color: 'text-fuchsia-300', project: 'Borneo Peatland Protection',    detail: 'Pacific Carbon Trust matched — 500 credits',       time: '8h ago'  },
  { type: 'satellite',       icon: Globe,        color: 'text-cyan-300',    project: 'Nairobi Solar District',        detail: 'NDVI scan completed — 0.71 vegetation index',      time: '10h ago' },
  { type: 'credit_retired',  icon: FileText,     color: 'text-amber-300',   project: 'Patagonia Wetland Restoration', detail: '200 credits retired by Alpine Foods Group',        time: '1d ago'  },
  { type: 'new_project',     icon: Plus,         color: 'text-violet-300',  project: 'Jakarta Urban Canopy',          detail: 'Mission stage launched — 4 active missions',       time: '1d ago'  },
  { type: 'mrv_complete',    icon: Database,     color: 'text-rose-300',    project: 'Punjab Biogas Network',         detail: 'MRV baseline model completed — confidence 81%',    time: '2d ago'  },
  { type: 'credit_issued',   icon: Award,        color: 'text-emerald-300', project: 'Nairobi Solar District',        detail: '85 avoidance credits issued — Q1 output verified', time: '2d ago'  },
  { type: 'satellite',       icon: Globe,        color: 'text-cyan-300',    project: 'Amazon Edge Forest',            detail: 'Canopy recovery confirmed — no deforestation signal', time: '3d ago' },
];

/* ─────────────────────────────────────────────
   Static data — validator queue
───────────────────────────────────────────── */
const VALIDATOR_QUEUE = [
  { project: 'Amazon Edge Forest Protection',  type: 'Evidence Review',       priority: 'High',   daysOpen: 1,  credits: 120  },
  { project: 'Punjab Biogas Capture Network',  type: 'MRV Baseline Submission', priority: 'Medium', daysOpen: 3, credits: 640  },
  { project: 'Jakarta Urban Canopy Initiative', type: 'Satellite Confirmation', priority: 'Medium', daysOpen: 4, credits: 280  },
  { project: 'Watershed Agroforestry Belt',    type: 'Plot Survival Check',    priority: 'Low',    daysOpen: 6,  credits: 65   },
  { project: 'Borneo Peatland Protection',     type: 'Boundary Anomaly Review', priority: 'High',  daysOpen: 2,  credits: 200  },
];

/* ─────────────────────────────────────────────
   Static data — market pricing intel
───────────────────────────────────────────── */
const PRICING_ROWS = [
  { category: 'AFOLU — Reforestation',        low: 12,  avg: 16, high: 22, trend: 'up',   volume: '4.2M',  demand: 'Strong'  },
  { category: 'Blue Carbon (Mangroves)',       low: 18,  avg: 24, high: 35, trend: 'up',   volume: '1.1M',  demand: 'Very High' },
  { category: 'Renewable Energy (Solar/Wind)', low: 8,   avg: 11, high: 15, trend: 'flat', volume: '12M',   demand: 'Stable'  },
  { category: 'Waste & Methane Capture',       low: 10,  avg: 14, high: 19, trend: 'up',   volume: '3.8M',  demand: 'Growing' },
  { category: 'Transport & Mobility',          low: 6,   avg: 9,  high: 12, trend: 'down', volume: '2.5M',  demand: 'Moderate' },
  { category: 'Industrial Reduction',          low: 25,  avg: 32, high: 45, trend: 'up',   volume: '0.8M',  demand: 'Very High' },
  { category: 'Clean Cooking',                 low: 8,   avg: 12, high: 16, trend: 'up',   volume: '2.2M',  demand: 'Growing' },
  { category: 'Urban & Community Carbon',      low: 7,   avg: 10, high: 14, trend: 'flat', volume: '1.4M',  demand: 'Stable'  },
];

/* ─────────────────────────────────────────────
   Static data — how it works steps
───────────────────────────────────────────── */
const HOW_IT_WORKS = [
  { label: 'Report',       detail: 'Community members document field conditions with GPS-tagged evidence.' },
  { label: 'Project',      detail: 'A carbon project is structured around a registered area and methodology.' },
  { label: 'Evidence',     detail: 'DPAL missions collect photos, logs, plot checks, and QR-verified scans.' },
  { label: 'Monitoring',   detail: 'Satellite and AI continuously watch canopy, water, and disturbance signals.' },
  { label: 'Verification', detail: 'Validators review the proof stack and the MRV engine scores each batch.' },
  { label: 'Credits',      detail: 'Verified impact is issued as blockchain-anchored DPAL carbon credits.' },
  { label: 'Marketplace',  detail: 'Credits are listed for corporate buyers, registries, and retail offset programs.' },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function statusColor(s: ProjectStatus): string {
  if (s === 'buyer_ready')      return '#10b981';
  if (s === 'active')           return '#38bdf8';
  if (s === 'monitoring')       return '#f59e0b';
  if (s === 'seeking_funding')  return '#a855f7';
  return '#64748b';
}
function statusLabel(s: ProjectStatus): string {
  if (s === 'buyer_ready')      return 'Buyer Ready';
  if (s === 'active')           return 'Active';
  if (s === 'monitoring')       return 'Monitoring';
  if (s === 'seeking_funding')  return 'Seeking Funding';
  return 'Mission Stage';
}
function statusBadge(s: ProjectStatus): string {
  if (s === 'buyer_ready')      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
  if (s === 'active')           return 'border-sky-500/40 bg-sky-500/15 text-sky-200';
  if (s === 'monitoring')       return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
  if (s === 'seeking_funding')  return 'border-purple-500/40 bg-purple-500/15 text-purple-200';
  return 'border-slate-600 bg-slate-800 text-slate-300';
}
function trendIcon(t: string): string {
  if (t === 'up')   return '↑';
  if (t === 't')   return '→';
  return '↓';
}
function trendColor(t: string): string {
  if (t === 'up')   return 'text-emerald-400';
  if (t === 'flat') return 'text-slate-400';
  return 'text-rose-400';
}
function priorityBadge(p: string): string {
  if (p === 'High')   return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (p === 'Medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-slate-600 bg-slate-800 text-slate-400';
}
function buildQrPayload(p: DpalCarbonProject) {
  return {
    platform: 'dpal',
    version: '1',
    project_id: p.id,
    project_name: p.name,
    category: p.category,
    type: p.projectType,
    country: p.country,
    region: p.region,
    lat: p.lat,
    lng: p.lng,
    steward: p.steward,
    methodology: p.methodology,
    action: 'report_evidence',
    link: `/carbon-hub?project=${p.id}&action=report`,
  };
}
function fakeHash(): string {
  return '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

/* ─────────────────────────────────────────────
   QrCodeImage component
───────────────────────────────────────────── */
const QrCodeImage: React.FC<{ payload: object; size?: number }> = ({ payload, size = 96 }) => {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    QRCode.toDataURL(JSON.stringify(payload), {
      width: size,
      margin: 1,
      color: { dark: '#10b981', light: '#0f172a' },
    }).then(setDataUrl).catch(() => {});
  }, [payload, size]);
  if (!dataUrl) return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-slate-800" />;
  return <img src={dataUrl} alt="Project QR Code" style={{ width: size, height: size }} className="rounded-lg" />;
};

/* ─────────────────────────────────────────────
   QR Evidence Reporting Modal — 4-step flow
───────────────────────────────────────────── */
const QrReportModal: React.FC<{ project: DpalCarbonProject; onClose: () => void }> = ({ project, onClose }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ReportForm>({
    reporterName: '', missionType: '', gpsConfirmed: false,
    photoCount: '', notes: '', conditionRating: '',
  });
  const [submittedHash, setSubmittedHash] = useState('');

  const MISSION_TYPES: Record<string, string[]> = {
    afolu:     ['Plant Trees', 'Patrol Protected Area', 'Verify Sample Plot', 'Fire Recovery', 'Agroforestry'],
    agri:      ['Soil Sample Collection', 'Plot Measurement', 'Crop Inspection', 'Biochar Application Verify'],
    water:     ['Water Level Check', 'Wetland Boundary Patrol', 'Species Count', 'Drainage Monitoring'],
    energy:    ['Meter Reading', 'Panel Inspection', 'Output Verification', 'Grid Connection Check'],
    waste:     ['Biogas Output Meter', 'Landfill Gas Capture Check', 'Compost Verification'],
    fire:      ['Fire Patrol', 'Early Detection Survey', 'Post-fire Recovery Assessment'],
    urban:     ['Tree Survey', 'Canopy Cover Measurement', 'Species Registration'],
    default:   ['Field Inspection', 'Evidence Upload', 'Condition Report', 'Monitoring Visit'],
  };
  const missions = MISSION_TYPES[project.category] || MISSION_TYPES.default;

  const handleSubmit = () => {
    const hash = fakeHash();
    setSubmittedHash(hash);
    const saved = JSON.parse(localStorage.getItem('dpal_qr_reports') || '[]');
    saved.unshift({
      hash, project_id: project.id, project_name: project.name, ...form,
      submittedAt: new Date().toISOString(),
    });
    localStorage.setItem('dpal_qr_reports', JSON.stringify(saved.slice(0, 50)));
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">QR Evidence Report</p>
            <h3 className="mt-0.5 text-lg font-black text-white">{project.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-slate-800 px-6 py-3 gap-2">
          {['Project', 'Reporter', 'Evidence', 'Confirm'].map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'border border-emerald-400 text-emerald-300' : 'border border-slate-700 text-slate-600'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`text-[9px] uppercase tracking-wide font-bold ${i === step ? 'text-emerald-300' : 'text-slate-600'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {/* Step 0 — Project identification + QR */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <QrCodeImage payload={buildQrPayload(project)} size={96} />
                  <p className="mt-1 text-center text-[9px] text-slate-500">Scan on mobile to open</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Project ID</p>
                    <p className="mt-0.5 text-sm font-black text-white font-mono">{project.id}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Type</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{project.projectType}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Location</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{project.region}, {project.country}</p>
                  </div>
                </div>
              </div>
              <div className={`rounded-xl border ${project.border} ${project.bg} p-4`}>
                <p className="text-xs text-slate-300">{project.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400">Methodology: {project.methodology}</span>
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400">Steward: {project.steward}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Reporter details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Your name or field ID</label>
                <input
                  type="text"
                  value={form.reporterName}
                  onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                  placeholder="e.g. Maria Santos / FIELD-042"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Mission type</label>
                <select
                  value={form.missionType}
                  onChange={(e) => setForm({ ...form, missionType: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select mission type...</option>
                  {missions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Condition rating</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Poor', 'Fair', 'Good', 'Excellent'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, conditionRating: r })}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${form.conditionRating === r ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                <input
                  type="checkbox"
                  checked={form.gpsConfirmed}
                  onChange={(e) => setForm({ ...form, gpsConfirmed: e.target.checked })}
                  className="accent-emerald-500 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-bold text-white">GPS location confirmed</p>
                  <p className="text-xs text-slate-500">I confirm my current location matches the project area</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 2 — Evidence details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Number of photos captured</label>
                <input
                  type="number"
                  min="0"
                  value={form.photoCount}
                  onChange={(e) => setForm({ ...form, photoCount: e.target.value })}
                  placeholder="Minimum 3 required"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Field notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={5}
                  placeholder="Describe what you observed — vegetation condition, boundary status, anomalies, species counts, or anything notable..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs font-bold text-amber-200">Proof requirements for this project</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  <li>• Minimum 3 geo-tagged photos</li>
                  <li>• GPS coordinates must fall within registered project boundary</li>
                  <li>• Timestamp automatically recorded at submission</li>
                  <li>• All submissions reviewed by a DPAL validator within 48h</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Evidence report submitted</h4>
                <p className="mt-1 text-sm text-slate-400">Your report has been anchored to the DPAL ledger and queued for validator review.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Blockchain anchor</p>
                <p className="mt-1 break-all font-mono text-xs text-emerald-300">{submittedHash}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Project</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{project.name}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Reporter</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{form.reporterName || 'Anonymous'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Mission</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{form.missionType || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-300">Awaiting Review</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">A DPAL validator will review this submission within 24–48 hours. Once approved, eligible evidence contributes to the project's MRV score.</p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          {step < 3 ? (
            <>
              <button
                onClick={step === 0 ? onClose : () => setStep(step - 1)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < 2 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!form.reporterName || !form.missionType || !form.gpsConfirmed)}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={Number(form.photoCount) < 1 || !form.notes.trim()}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Evidence
                </button>
              )}
            </>
          ) : (
            <button onClick={onClose} className="ml-auto rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main view
───────────────────────────────────────────── */
const DpalCarbonView: React.FC<DpalCarbonViewProps> = ({
  onReturn, onGoToAfolu, onGoToWater, onGoToCarbon, onGoToOffsets,
  onGoToEcology, onGoToMissions, onGoToAir, onGoToImpact,
}) => {
  const [view, setView] = useState<'home' | 'calculator'>('home');
  const [calcCategoryId, setCalcCategoryId] = useState<CategoryId>('afolu');
  const [reportProject, setReportProject] = useState<DpalCarbonProject | null>(null);
  const [qrModalProject, setQrModalProject] = useState<DpalCarbonProject | null>(null);

  const categorySectionRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const projectsSectionRef = useRef<HTMLDivElement>(null);

  const openCategory = (cat: CarbonHQCat) => {
    if (cat.id === 'afolu')  { onGoToAfolu(); return; }
    if (cat.id === 'water')  { onGoToWater(); return; }
    setCalcCategoryId(cat.id);
    setView('calculator');
  };

  const PLATFORM_MODULES = [
    { id: 'afolu',   name: 'Forest Integrity',    desc: 'AFOLU projects, patrol missions, proof, and buyer packages.',         icon: Globe,        accent: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', onClick: onGoToAfolu,                             status: 'Live'         },
    { id: 'water',   name: 'Water Monitor',        desc: 'Satellite water snapshots, blue carbon projects, and impact scores.', icon: Droplets,     accent: 'text-cyan-300',    border: 'border-cyan-500/30',    bg: 'bg-cyan-500/10',    onClick: onGoToWater,                             status: 'Live'         },
    { id: 'carbon',  name: 'Carbon MRV Engine',    desc: 'Register projects, run MRV reviews, and generate credit packages.',   icon: Database,     accent: 'text-sky-300',     border: 'border-sky-500/30',     bg: 'bg-sky-500/10',     onClick: onGoToCarbon,                            status: 'Live'         },
    { id: 'offsets', name: 'Carbon Marketplace',   desc: 'Buy, sell, and retire verified carbon credits on the open market.',  icon: Award,        accent: 'text-amber-300',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10',   onClick: onGoToOffsets,                           status: 'Live'         },
    { id: 'ecology', name: 'Ecological Conservation', desc: 'Landsat foliage scans, NDVI mapping, and habitat risk analysis.',  icon: Activity,     accent: 'text-lime-300',    border: 'border-lime-500/30',    bg: 'bg-lime-500/10',    onClick: onGoToEcology ?? (() => {}),             status: onGoToEcology ? 'Live' : 'Explore' },
    { id: 'missions',name: 'Missions Hub',          desc: 'Launch, track, and validate field missions across all categories.',  icon: Target,       accent: 'text-violet-300',  border: 'border-violet-500/30',  bg: 'bg-violet-500/10',  onClick: onGoToMissions ?? (() => {}),            status: onGoToMissions ? 'Live' : 'Explore' },
    { id: 'air',     name: 'Air Quality Monitor',  desc: 'Live OpenAQ readings, CO₂/CH₄ scans, and AQI dashboards.',          icon: Cloud,        accent: 'text-rose-300',    border: 'border-rose-500/30',    bg: 'bg-rose-500/10',    onClick: onGoToAir ?? (() => {}),                 status: onGoToAir ? 'Live' : 'Explore' },
    { id: 'impact',  name: 'Impact Hub',            desc: 'Environmental project registry, evidence tracking, and claims.',    icon: ShieldCheck,  accent: 'text-indigo-300',  border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10',  onClick: onGoToImpact ?? (() => {}),              status: onGoToImpact ? 'Live' : 'Explore' },
  ];

  const PLATFORM_STATS = [
    { label: 'Active Projects',    value: '8',       sub: '+2 this month',  tone: 'text-emerald-300', onClick: () => projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Estimated Credits',  value: '6,935',   sub: 'tCO2e pipeline', tone: 'text-sky-300',     onClick: () => setView('calculator') },
    { label: 'Verified Credits',   value: '3,795',   sub: 'issued to date', tone: 'text-lime-300',    onClick: onGoToOffsets },
    { label: 'Pending Validation', value: '5',       sub: 'in queue',       tone: 'text-amber-300',   onClick: () => {} },
    { label: 'Revenue Potential',  value: '$118K',   sub: 'at avg pricing', tone: 'text-fuchsia-300', onClick: onGoToOffsets },
    { label: 'Communities',        value: '16',      sub: 'stewards active', tone: 'text-rose-300',   onClick: () => projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  /* ─ Calculator sub-view ─ */
  if (view === 'calculator') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button onClick={() => setView('home')} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white">
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

  /* ─ Home view ─ */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {reportProject && <QrReportModal project={reportProject} onClose={() => setReportProject(null)} />}

      {/* QR detail overlay */}
      {qrModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Project QR Code</p>
                <h3 className="mt-0.5 text-base font-black text-white">{qrModalProject.name}</h3>
              </div>
              <button onClick={() => setQrModalProject(null)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 p-8">
              <QrCodeImage payload={buildQrPayload(qrModalProject)} size={200} />
              <p className="text-center text-xs text-slate-400">Scan with any QR reader to open the project reporting page. Field workers can scan to start an evidence submission directly from mobile.</p>
              <div className="w-full space-y-2 text-xs">
                {[
                  ['Project ID', qrModalProject.id],
                  ['Methodology', qrModalProject.methodology],
                  ['Steward', qrModalProject.steward],
                  ['Coordinates', `${qrModalProject.lat}, ${qrModalProject.lng}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-bold text-white font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-800 px-6 py-4">
              <button onClick={() => { setQrModalProject(null); setReportProject(qrModalProject); }} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition">
                Report Evidence
              </button>
              <button onClick={() => setQrModalProject(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onReturn} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">DPAL Carbon</p>
              <h1 className="text-2xl font-black text-white md:text-3xl">Carbon Credit Platform</h1>
            </div>
          </div>
          <div className="hidden gap-2 sm:flex flex-wrap">
            <button onClick={onGoToCarbon}  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">MRV Engine</button>
            <button onClick={onGoToOffsets} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">Marketplace</button>
            <button onClick={() => setView('calculator')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">Calculator</button>
            <button onClick={onGoToAfolu}   className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:border-emerald-400 transition">Forest Integrity</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-8 pb-24">

        {/* ── 1. Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 px-8 py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)]" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">DPAL Carbon</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl">
              Turn verified real-world action into measurable climate credits.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Every project, mission, and satellite reading feeds the MRV engine. Every verified outcome becomes a tradeable carbon credit. Every QR scan on the ground connects a field worker to the proof chain.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition">Explore Categories</button>
              <button onClick={() => projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-bold text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 transition">View Projects & QR Codes</button>
              <button onClick={onGoToOffsets} className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition">View Marketplace</button>
              <button onClick={() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-bold text-slate-200 hover:border-slate-500 hover:text-white transition">See Impact Map</button>
            </div>
          </div>
        </section>

        {/* ── 2. Platform Module Navigation ───────────────────────── */}
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Platform Modules</p>
            <h3 className="mt-1 text-2xl font-black text-white">Every DPAL carbon tool in one place</h3>
            <p className="mt-1 text-sm text-slate-400">Each module is a live engine. Navigate directly to any workflow from here.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={mod.onClick}
                  className={`flex flex-col rounded-2xl border ${mod.border} ${mod.bg} p-5 text-left transition hover:shadow-[0_0_24px_rgba(16,185,129,0.12)] active:scale-[0.98]`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${mod.border} bg-slate-950`}>
                      <Icon className={`h-4 w-4 ${mod.accent}`} />
                    </div>
                    <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${mod.status === 'Live' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>{mod.status}</span>
                  </div>
                  <p className="mt-3 text-sm font-black text-white">{mod.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{mod.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 3. Platform Stats Strip ──────────────────────────────── */}
        <section>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Platform Snapshot</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PLATFORM_STATS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-600"
              >
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-1 text-xl font-black ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[10px] text-slate-600">{item.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── 4. Category Grid ─────────────────────────────────────── */}
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
                <div key={cat.id} className={`flex flex-col rounded-2xl border ${cat.border} ${cat.bg} p-5 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cat.border} bg-slate-950`}>
                      <Icon className={`h-4 w-4 ${cat.accent}`} />
                    </div>
                    <h4 className="text-sm font-black leading-tight text-white">{cat.name}</h4>
                  </div>
                  <p className="mt-3 flex-1 text-xs leading-5 text-slate-400">{cat.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-lg border ${cat.border} px-2 py-1 text-[10px] font-bold ${cat.accent}`}>{cat.creditType}</span>
                    <button onClick={() => openCategory(cat)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-bold text-slate-300 transition hover:border-slate-500 hover:text-white">
                      Open Category
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. Project Registry with QR Codes ───────────────────── */}
        <section ref={projectsSectionRef}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Project Registry</p>
              <h3 className="mt-1 text-2xl font-black text-white">Live projects with QR evidence codes</h3>
              <p className="mt-1 text-sm text-slate-400">Each QR code links a field worker directly to the project evidence reporting flow. Scan on mobile to start a submission.</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {CARBON_PROJECTS.map((proj) => (
              <div key={proj.id} className={`rounded-2xl border ${proj.border} bg-slate-900/60 p-5`}>
                {/* Project header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${statusBadge(proj.status)}`}>{statusLabel(proj.status)}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${proj.accent}`}>{proj.categoryName}</span>
                    </div>
                    <h4 className="mt-1.5 text-base font-black text-white leading-snug">{proj.name}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">{proj.region}, {proj.country} — {proj.steward}</p>
                  </div>
                  {/* QR code */}
                  <div className="shrink-0">
                    <button
                      onClick={() => setQrModalProject(proj)}
                      className={`rounded-xl border ${proj.border} bg-slate-950 p-1.5 transition hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]`}
                      title="View & scan QR code"
                    >
                      <QrCodeImage payload={buildQrPayload(proj)} size={72} />
                    </button>
                    <p className="mt-1 text-center text-[9px] text-slate-600">Tap to enlarge</p>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { label: 'tCO2e', value: proj.tco2e.toLocaleString() },
                    { label: 'Credits', value: proj.creditsIssued.toLocaleString() },
                    { label: 'Confidence', value: `${proj.confidence}%` },
                    { label: 'Price/t', value: `$${proj.pricePerCredit}` },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">{m.label}</p>
                      <p className="mt-0.5 text-sm font-black text-white">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <p className="mt-3 text-xs leading-5 text-slate-400">{proj.description}</p>

                {/* Metadata */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                  <span>Methodology: <b className="text-slate-300">{proj.methodology}</b></span>
                  {proj.hectares > 0 && <span>Area: <b className="text-slate-300">{proj.hectares.toLocaleString()} ha</b></span>}
                  <span>Verified by: <b className="text-slate-300">{proj.verifiedBy}</b></span>
                  <span>Last activity: <b className="text-slate-300">{proj.lastActivity}</b></span>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setReportProject(proj)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Report Evidence
                  </button>
                  <button
                    onClick={() => setQrModalProject(proj)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    View QR Code
                  </button>
                  {proj.category === 'afolu' && (
                    <button onClick={onGoToAfolu} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-emerald-500 hover:text-emerald-200 transition">
                      Open in Forest Integrity
                    </button>
                  )}
                  {(proj.category === 'water') && (
                    <button onClick={onGoToWater} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-cyan-500 hover:text-cyan-200 transition">
                      Open in Water Monitor
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Interactive Impact Map ──────────────────────────────── */}
        <section ref={mapSectionRef}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Impact Map</p>
              <h3 className="mt-1 text-2xl font-black text-white">Global project footprint</h3>
              <p className="mt-1 text-sm text-slate-400">Click any marker for project details. Colors show current project stage.</p>
            </div>
            <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
              {[
                { color: '#10b981', label: 'Buyer Ready'      },
                { color: '#38bdf8', label: 'Active'           },
                { color: '#f59e0b', label: 'Monitoring'       },
                { color: '#a855f7', label: 'Seeking Funding'  },
                { color: '#64748b', label: 'Mission Stage'    },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800" style={{ height: '480px' }}>
            <MapContainer center={[5, 20]} zoom={2} style={{ height: '480px', width: '100%', background: '#0f172a' }} scrollWheelZoom={false}>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
              {CARBON_PROJECTS.map((proj) => (
                <CircleMarker
                  key={proj.id}
                  center={[proj.lat, proj.lng]}
                  radius={15}
                  pathOptions={{ color: statusColor(proj.status), fillColor: statusColor(proj.status), fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup>
                    <div className="min-w-[200px] space-y-1.5 text-xs">
                      <p className="font-black text-slate-900 text-sm">{proj.name}</p>
                      <p className="text-slate-600">{proj.region}, {proj.country}</p>
                      <p>Category: <b>{proj.categoryName}</b></p>
                      <p>Status: <b>{statusLabel(proj.status)}</b></p>
                      <p>Est. tCO2e: <b>{proj.tco2e.toLocaleString()}</b></p>
                      <p>Credits issued: <b>{proj.creditsIssued.toLocaleString()}</b></p>
                      <p>Confidence: <b>{proj.confidence}%</b></p>
                      <p>Steward: <b>{proj.steward}</b></p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* ── 7. Activity Feed + Validator Queue ──────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Platform Activity</p>
            <h3 className="mb-4 text-xl font-black text-white">Latest events across all projects</h3>
            <div className="space-y-2">
              {ACTIVITY_FEED.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950">
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.project}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-600">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Validator Queue</p>
            <h3 className="mb-4 text-xl font-black text-white">{VALIDATOR_QUEUE.length} items pending</h3>
            <div className="space-y-3">
              {VALIDATOR_QUEUE.map((item, index) => (
                <div key={index} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-black text-white leading-snug">{item.project}</p>
                    <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${priorityBadge(item.priority)}`}>{item.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.type}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Open {item.daysOpen}d · {item.credits} credits at stake</span>
                    <button onClick={onGoToCarbon} className="text-emerald-400 hover:text-emerald-300 font-bold transition">Review →</button>
                  </div>
                </div>
              ))}
              <button onClick={onGoToCarbon} className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">
                Open MRV Engine for full queue →
              </button>
            </div>
          </div>
        </section>

        {/* ── 8. Revenue Intelligence ─────────────────────────────── */}
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Market Intelligence</p>
            <h3 className="mt-1 text-2xl font-black text-white">Carbon credit pricing by methodology</h3>
            <p className="mt-1 text-sm text-slate-400">Current voluntary carbon market price ranges (USD/tCO2e). Updated quarterly from public registry data.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Low</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Avg</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">High</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Trend</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Volume</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Demand</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row, index) => (
                  <tr key={row.category} className={`border-b border-slate-800/50 transition hover:bg-slate-900/40 ${index % 2 === 0 ? 'bg-slate-950/50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-white text-xs">{row.category}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">${row.low}</td>
                    <td className="px-4 py-3 text-right text-xs font-black text-white">${row.avg}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">${row.high}</td>
                    <td className={`px-4 py-3 text-right text-xs font-bold ${trendColor(row.trend)}`}>{trendIcon(row.trend)} {row.trend}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{row.volume} t</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold ${row.demand === 'Very High' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : row.demand === 'Strong' || row.demand === 'Growing' ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{row.demand}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={onGoToOffsets} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition">Browse Carbon Marketplace</button>
            <button onClick={() => setView('calculator')} className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition">Estimate Project Revenue</button>
          </div>
        </section>

        {/* ── 9. How DPAL Works ────────────────────────────────────── */}
        <section>
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">The Process</p>
            <h3 className="mt-1 text-2xl font-black text-white">How DPAL Works</h3>
            <p className="mt-2 text-sm text-slate-400">Seven steps from real-world action to tradeable climate credit. QR codes connect every field step to the proof chain.</p>
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
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <p className="text-center text-sm font-bold text-emerald-100">
              Report → Project → Evidence → Monitoring → Verification → Credits → Marketplace
            </p>
            <p className="mt-2 text-center text-xs text-slate-400">
              Every step is anchored on the DPAL ledger. Field workers scan project QR codes to start evidence flows on any device. Validators review the proof. The MRV engine issues credits. Buyers access the marketplace.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Start a Project',    action: onGoToAfolu,              tone: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
                { label: 'Estimate Credits',   action: () => setView('calculator'), tone: 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white' },
                { label: 'Open MRV Engine',    action: onGoToCarbon,             tone: 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white' },
                { label: 'Browse Marketplace', action: onGoToOffsets,            tone: 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white' },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.action} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${btn.tone}`}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default DpalCarbonView;
