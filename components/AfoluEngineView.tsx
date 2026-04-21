import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Camera, CheckCircle, Clock, Database,
  FileText, Globe, Map, MapPin, Plus, QrCode, ShieldCheck, Target, Upload, Users, Cloud,
} from './icons';

type AfoluTab =
  | 'home'
  | 'projects'
  | 'missions'
  | 'assets'
  | 'evidence'
  | 'monitoring'
  | 'buyers'
  | 'reports';

type ProjectStatus = 'draft' | 'active' | 'monitoring' | 'buyer_ready' | 'flagged';
type MissionStatus = 'Draft' | 'Open' | 'Assigned' | 'In Progress' | 'Submitted' | 'Under Review' | 'Verified' | 'Failed' | 'Flagged' | 'Closed';
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface AfoluProject {
  id: string;
  name: string;
  type: string;
  country: string;
  region: string;
  municipality: string;
  stewardName: string;
  communityName: string;
  hectares: number;
  status: ProjectStatus;
  riskLevel: RiskLevel;
  verificationScore: number;
  monitoringStage: string;
  treesPlanted: number;
  treesAlive: number;
  co2CapturedTons: number;
  creditsGenerated: number;
  creditsSold: number;
  revenueUsd: number;
  pricePerCreditUsd: number;
  polygonLabel: string;
  registryTarget: string;
  consentStatus: string;
  landRightsStatus: string;
  satelliteConfirmed: boolean;
  aiVerificationConfidence: number;
  buyerDemand: string;
  story: string;
}

interface AfoluMission {
  id: string;
  projectId: string;
  title: string;
  missionType: string;
  status: MissionStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  proofRules: string[];
  targetQuantity: number;
  unitType: string;
  reward: string;
}

interface AfoluAsset {
  id: string;
  projectId: string;
  assetType: string;
  assetCode: string;
  name: string;
  species?: string;
  quantityEstimate?: number;
  location: string;
  status: string;
  evidenceCount: number;
}

interface EvidenceItem {
  id: string;
  projectId: string;
  missionId: string;
  assetId: string;
  type: string;
  uploader: string;
  capturedAt: string;
  gpsValid: boolean;
  timestampValid: boolean;
  photoCountMet: boolean;
  qrMatched: boolean;
  insideBoundary: boolean;
  duplicateClear: boolean;
  fieldsComplete: boolean;
  witnessPresent: boolean;
  validatorConfirmed: boolean;
  validatorStatus: 'clean' | 'caution' | 'suspicious' | 'escalated' | 'blocked';
}

const projects: AfoluProject[] = [
  {
    id: 'AF-PROJ-102',
    name: 'Amazon Edge Forest Protection',
    type: 'Avoided Deforestation',
    country: 'Bolivia',
    region: 'Santa Cruz',
    municipality: 'San Ignacio',
    stewardName: 'Guardians Cooperative',
    communityName: 'Chiquitano forest stewards',
    hectares: 500,
    status: 'monitoring',
    riskLevel: 'High',
    verificationScore: 86,
    monitoringStage: 'Monthly canopy and patrol cycle',
    treesPlanted: 0,
    treesAlive: 0,
    co2CapturedTons: 1180,
    creditsGenerated: 1180,
    creditsSold: 420,
    revenueUsd: 7980,
    pricePerCreditUsd: 19,
    polygonLabel: '5-point boundary, 500 ha',
    registryTarget: 'Registry support export',
    consentStatus: 'Attached',
    landRightsStatus: 'Community stewardship docs attached',
    satelliteConfirmed: true,
    aiVerificationConfidence: 92,
    buyerDemand: '2 corporate buyers reviewing Q2 package',
    story: 'Community patrol missions and canopy checks protect the Amazon edge from clearing pressure and convert verified protection activity into saleable carbon inventory.',
  },
  {
    id: 'AF-PROJ-221',
    name: 'Watershed Agroforestry Belt',
    type: 'Agroforestry',
    country: 'Colombia',
    region: 'Antioquia',
    municipality: 'Jardin',
    stewardName: 'Rio Claro Restoration Team',
    communityName: 'Smallholder farm network',
    hectares: 84,
    status: 'active',
    riskLevel: 'Medium',
    verificationScore: 78,
    monitoringStage: '90-day survival check',
    treesPlanted: 2400,
    treesAlive: 2162,
    co2CapturedTons: 365,
    creditsGenerated: 365,
    creditsSold: 140,
    revenueUsd: 3500,
    pricePerCreditUsd: 25,
    polygonLabel: '12 parcels, 84 ha',
    registryTarget: 'Buyer-ready proof package',
    consentStatus: 'Attached',
    landRightsStatus: 'Parcel owner attestations attached',
    satelliteConfirmed: true,
    aiVerificationConfidence: 88,
    buyerDemand: 'Food brand sponsor requested 100-credit tranche',
    story: 'Farmers plant agroforestry belts, survival is verified on repeat visits, and the resulting carbon gains can be packaged for buyer-backed restoration finance.',
  },
  {
    id: 'AF-PROJ-318',
    name: 'Fire Recovery Nursery Network',
    type: 'Fire Recovery',
    country: 'United States',
    region: 'California',
    municipality: 'Butte County',
    stewardName: 'Ridge Replanting Guild',
    communityName: 'Volunteer nursery coalition',
    hectares: 42,
    status: 'buyer_ready',
    riskLevel: 'Low',
    verificationScore: 91,
    monitoringStage: '6-month review complete',
    treesPlanted: 6900,
    treesAlive: 6210,
    co2CapturedTons: 540,
    creditsGenerated: 540,
    creditsSold: 210,
    revenueUsd: 6300,
    pricePerCreditUsd: 30,
    polygonLabel: 'Recovery zones A-D',
    registryTarget: 'Sponsor report',
    consentStatus: 'Attached',
    landRightsStatus: 'County and private agreements attached',
    satelliteConfirmed: true,
    aiVerificationConfidence: 95,
    buyerDemand: 'Insurer and municipal resilience fund shortlisted',
    story: 'Post-fire replanting is tracked from nursery batch to survival plot so recovery work can support both ecological restoration and sponsor-backed finance.',
  },
];

const missions: AfoluMission[] = [
  {
    id: 'AF-MIS-001',
    projectId: 'AF-PROJ-221',
    title: 'Plant 100 native trees - Parcel 4',
    missionType: 'Plant Trees',
    status: 'Open',
    priority: 'High',
    dueDate: '2026-05-14',
    targetQuantity: 100,
    unitType: 'seedlings',
    reward: 'Steward reputation + sponsor bonus',
    proofRules: ['Minimum 3 photos', 'GPS required', 'Species field required', 'Count field required', 'Auto-create 30-day survival check'],
  },
  {
    id: 'AF-MIS-002',
    projectId: 'AF-PROJ-102',
    title: 'Patrol north boundary checkpoints',
    missionType: 'Patrol Protected Area',
    status: 'In Progress',
    priority: 'Critical',
    dueDate: '2026-04-28',
    targetQuantity: 6,
    unitType: 'checkpoints',
    reward: 'Mission points + validator badge progress',
    proofRules: ['Checkpoint QR scans', 'Photo evidence required', 'Illegal clearing question', 'Burn scar question', 'Intrusion notes'],
  },
  {
    id: 'AF-MIS-003',
    projectId: 'AF-PROJ-318',
    title: 'Verify sample plot survival',
    missionType: 'Verify Sample Plot',
    status: 'Under Review',
    priority: 'Medium',
    dueDate: '2026-04-22',
    targetQuantity: 40,
    unitType: 'sample trees',
    reward: 'Validator trust points',
    proofRules: ['Scan plot QR', 'Recount living trees', 'Upload plot photos', 'Enter mortality', 'Validator review required'],
  },
];

const assets: AfoluAsset[] = [
  {
    id: 'AF-AST-045',
    projectId: 'AF-PROJ-221',
    assetType: 'Plot',
    assetCode: 'AFT-PLT-00045',
    name: 'Agroforestry Parcel 4',
    species: 'Cacao, inga, cedar',
    quantityEstimate: 320,
    location: '5.60120, -75.81940',
    status: 'active',
    evidenceCount: 18,
  },
  {
    id: 'AF-AST-077',
    projectId: 'AF-PROJ-102',
    assetType: 'Patrol Checkpoint',
    assetCode: 'AFT-CHK-00077',
    name: 'North Boundary Gate',
    location: '-16.37280, -60.95520',
    status: 'watchlist',
    evidenceCount: 9,
  },
  {
    id: 'AF-AST-114',
    projectId: 'AF-PROJ-318',
    assetType: 'Nursery Batch',
    assetCode: 'AFT-NUR-00114',
    name: 'Ridge Pine Batch B',
    species: 'Ponderosa pine',
    quantityEstimate: 1200,
    location: '39.75610, -121.62140',
    status: 'verified',
    evidenceCount: 23,
  },
];

const evidence: EvidenceItem[] = [
  {
    id: 'AF-EV-9001',
    projectId: 'AF-PROJ-221',
    missionId: 'AF-MIS-001',
    assetId: 'AF-AST-045',
    type: 'Photo + GPS + species count',
    uploader: 'Field team A',
    capturedAt: '2026-04-18 10:42',
    gpsValid: true,
    timestampValid: true,
    photoCountMet: true,
    qrMatched: true,
    insideBoundary: true,
    duplicateClear: true,
    fieldsComplete: true,
    witnessPresent: false,
    validatorConfirmed: false,
    validatorStatus: 'caution',
  },
  {
    id: 'AF-EV-9002',
    projectId: 'AF-PROJ-102',
    missionId: 'AF-MIS-002',
    assetId: 'AF-AST-077',
    type: 'Checkpoint QR + patrol photo',
    uploader: 'Community steward',
    capturedAt: '2026-04-19 16:10',
    gpsValid: true,
    timestampValid: true,
    photoCountMet: true,
    qrMatched: true,
    insideBoundary: true,
    duplicateClear: true,
    fieldsComplete: true,
    witnessPresent: true,
    validatorConfirmed: true,
    validatorStatus: 'clean',
  },
  {
    id: 'AF-EV-9003',
    projectId: 'AF-PROJ-318',
    missionId: 'AF-MIS-003',
    assetId: 'AF-AST-114',
    type: 'Survival count log',
    uploader: 'Validator node',
    capturedAt: '2026-04-15 09:05',
    gpsValid: true,
    timestampValid: true,
    photoCountMet: false,
    qrMatched: true,
    insideBoundary: true,
    duplicateClear: true,
    fieldsComplete: true,
    witnessPresent: false,
    validatorConfirmed: true,
    validatorStatus: 'clean',
  },
];

const tabs: Array<{ id: AfoluTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'missions', label: 'Missions' },
  { id: 'assets', label: 'Assets' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'buyers', label: 'Buyers' },
  { id: 'reports', label: 'Reports' },
];

function proofScore(item: EvidenceItem): number {
  return [
    item.gpsValid ? 20 : 0,
    item.timestampValid ? 10 : 0,
    item.photoCountMet ? 10 : 0,
    item.qrMatched ? 10 : 0,
    item.insideBoundary ? 15 : 0,
    item.duplicateClear ? 10 : 0,
    item.fieldsComplete ? 10 : 0,
    item.witnessPresent ? 5 : 0,
    item.validatorConfirmed ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Strong proof';
  if (score >= 70) return 'Acceptable';
  if (score >= 50) return 'Needs review';
  return 'Flagged';
}

function usd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('verified') || normalized.includes('ready') || normalized.includes('clean')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('flag') || normalized.includes('suspicious')) return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (normalized.includes('review') || normalized.includes('caution') || normalized.includes('watch')) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-lg border border-slate-700/70 bg-slate-900/70 p-4 shadow-lg ${className}`}>
    {children}
  </div>
);

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode; tone?: string }> = ({ label, value, icon, tone = 'text-emerald-300' }) => (
  <Card>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </div>
      <div className={`rounded-lg border border-current/30 bg-white/5 p-2 ${tone}`}>{icon}</div>
    </div>
  </Card>
);

interface AfoluEngineViewProps {
  onReturn: () => void;
}

const AfoluEngineView: React.FC<AfoluEngineViewProps> = ({ onReturn }) => {
  const [activeTab, setActiveTab] = useState<AfoluTab>('home');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const projectMissions = missions.filter((mission) => mission.projectId === selectedProject.id);
  const projectAssets = assets.filter((asset) => asset.projectId === selectedProject.id);
  const projectEvidence = evidence.filter((item) => item.projectId === selectedProject.id);

  const totals = useMemo(() => {
    const hectares = projects.reduce((sum, project) => sum + project.hectares, 0);
    const planted = projects.reduce((sum, project) => sum + project.treesPlanted, 0);
    const alive = projects.reduce((sum, project) => sum + project.treesAlive, 0);
    const survival = planted > 0 ? Math.round((alive / planted) * 100) : 0;
    const co2Captured = projects.reduce((sum, project) => sum + project.co2CapturedTons, 0);
    const creditsGenerated = projects.reduce((sum, project) => sum + project.creditsGenerated, 0);
    const creditsSold = projects.reduce((sum, project) => sum + project.creditsSold, 0);
    const revenueUsd = projects.reduce((sum, project) => sum + project.revenueUsd, 0);
    const avgVerificationConfidence = Math.round(projects.reduce((sum, project) => sum + project.aiVerificationConfidence, 0) / projects.length);
    return {
      hectares,
      planted,
      survival,
      co2Captured,
      creditsGenerated,
      creditsSold,
      revenueUsd,
      avgVerificationConfidence,
      pendingEvidence: evidence.filter((item) => item.validatorStatus !== 'clean').length,
      verifiedMissions: missions.filter((mission) => mission.status === 'Verified' || mission.status === 'Under Review').length,
      alerts: projects.filter((project) => project.riskLevel === 'High' || project.riskLevel === 'Critical').length,
    };
  }, []);

  const qrPayload = {
    asset_id: projectAssets[0]?.assetCode || 'AFT-PLT-00045',
    project_id: selectedProject.id,
    asset_type: projectAssets[0]?.assetType || 'plot',
    region: selectedProject.region,
    status: projectAssets[0]?.status || 'active',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={onReturn}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white"
              aria-label="Return"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">DPAL Forest Integrity</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-4xl">AFOLU Proof Engine</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Report to mission to evidence to monitoring to verification to buyer-ready impact record.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
              Create Project
            </button>
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500">
              Launch Mission
            </button>
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500">
              Upload Evidence
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24">
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'home' && (
          <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 via-slate-900/80 to-slate-950">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Investor Narrative</p>
                <h2 className="mt-2 text-3xl font-black text-white">We turn environmental activity into verified carbon credits using real-time data and sell them to global buyers.</h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                  Field missions create proof. Monitoring confirms survival and protection. The MRV engine converts validated activity into carbon-ready outputs, buyer packages, and revenue visibility.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-700/70 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Raw Activity</p>
                    <p className="mt-1 text-sm font-bold text-white">Planting, patrol, plot verification, survival checks</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/70 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">MRV Conversion</p>
                    <p className="mt-1 text-sm font-bold text-white">Satellite, AI, validator, and proof scoring confirm asset quality</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/70 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Financial Output</p>
                    <p className="mt-1 text-sm font-bold text-white">Credits generated, sold, and translated into project revenue</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">MRV Engine Snapshot</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Verification Confidence</p>
                    <p className="mt-1 text-3xl font-black text-white">{totals.avgVerificationConfidence}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Satellite confirmed growth: <span className="font-bold text-emerald-300">YES</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    AI fraud and consistency scoring: <span className="font-bold text-white">Active across all evidence submissions</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Buyer-ready projects: <span className="font-bold text-white">{projects.filter((project) => project.status === 'buyer_ready').length}</span>
                  </div>
                </div>
              </Card>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active Projects" value={String(projects.length)} icon={<Globe className="h-5 w-5" />} />
              <Metric label="CO2 Captured" value={`${totals.co2Captured.toLocaleString()} t`} icon={<Cloud className="h-5 w-5" />} tone="text-sky-300" />
              <Metric label="Credits Generated" value={totals.creditsGenerated.toLocaleString()} icon={<Award className="h-5 w-5" />} tone="text-lime-300" />
              <Metric label="Revenue Generated" value={usd(totals.revenueUsd)} icon={<Database className="h-5 w-5" />} tone="text-amber-300" />
              <Metric label="Credits Sold" value={totals.creditsSold.toLocaleString()} icon={<CheckCircle className="h-5 w-5" />} tone="text-emerald-300" />
              <Metric label="Hectares Monitored" value={totals.hectares.toLocaleString()} icon={<Map className="h-5 w-5" />} tone="text-cyan-300" />
              <Metric label="Trees Registered" value={totals.planted.toLocaleString()} icon={<Target className="h-5 w-5" />} tone="text-lime-300" />
              <Metric label="Survival Rate" value={`${totals.survival}%`} icon={<Activity className="h-5 w-5" />} tone="text-amber-300" />
              <Metric label="Open Missions" value={String(missions.filter((mission) => !['Verified', 'Closed'].includes(mission.status)).length)} icon={<Clock className="h-5 w-5" />} tone="text-cyan-300" />
              <Metric label="Pending Evidence" value={String(totals.pendingEvidence)} icon={<Upload className="h-5 w-5" />} tone="text-amber-300" />
              <Metric label="High-Risk Alerts" value={String(totals.alerts)} icon={<AlertTriangle className="h-5 w-5" />} tone="text-rose-300" />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">Registry-Ready Flow</h2>
                    <p className="mt-1 text-sm text-slate-400">This is the product: raw field activity becomes a verified financial asset pipeline.</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {[
                    ['Project Setup', 'Define land, rights, project type, and boundaries'],
                    ['Activity Logging', 'Plant trees, patrol forest, protect hectares, register proof'],
                    ['Monitoring', 'Satellite, photos, sensors, survival checks, anomaly watch'],
                    ['Verification Package', 'MRV engine calculates impact, confidence, and risk'],
                    ['Buyer Submission', 'Credits and reports move into the buyer workflow'],
                  ].map(([stage, detail], index) => (
                    <div key={stage} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs font-black text-emerald-300">Stage {index + 1}</p>
                      <p className="mt-2 text-sm font-bold text-white">{stage}</p>
                      <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Launch Set</h2>
                <p className="mt-1 text-sm text-slate-400">Start with three mission types that prove the full DPAL model.</p>
                <div className="mt-4 space-y-3">
                  {['Plant Trees', 'Patrol Protected Area', 'Verify Sample Plot'].map((template) => (
                    <div key={template} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <Target className="h-4 w-4 text-emerald-300" />
                      <span className="text-sm font-bold text-white">{template}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Each mission feeds proof into the MRV engine, which is how field activity becomes carbon inventory and buyer-ready credit supply.
                </p>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h2 className="text-lg font-black text-white">How Money Moves</h2>
                <div className="mt-4 space-y-3">
                  {[
                    'Communities and field teams log verified activity',
                    'DPAL monitoring confirms location, survival, and protection outcomes',
                    'The MRV engine calculates CO2 and credit-ready outputs',
                    'Buyers purchase credits or sponsor project tranches',
                    'Revenue flows back to projects, patrols, and restoration work',
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-black text-emerald-300">{index + 1}</div>
                      <p className="text-sm text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Buyer Marketplace Preview</h2>
                <div className="mt-4 space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{project.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{project.buyerDemand}</p>
                        </div>
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(project.status)}`}>{project.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Credits</span><br /><b>{project.creditsGenerated}</b></div>
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Price</span><br /><b>{usd(project.pricePerCreditUsd)}</b></div>
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Revenue</span><br /><b>{usd(project.revenueUsd)}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedProject.id === project.id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{project.type}</p>
                      <h2 className="mt-1 text-lg font-black text-white">{project.name}</h2>
                      <p className="mt-1 text-sm text-slate-400">{project.municipality}, {project.region}, {project.country}</p>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(project.riskLevel)}`}>{project.riskLevel}</span>
                  </div>
                </button>
              ))}
            </div>
            <Card>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{selectedProject.id}</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{selectedProject.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">{selectedProject.stewardName} with {selectedProject.communityName}</p>
                </div>
                <span className={`rounded-lg border px-3 py-2 text-xs font-bold ${statusClass(selectedProject.status)}`}>{selectedProject.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Hectares', selectedProject.hectares.toLocaleString()],
                  ['Polygon', selectedProject.polygonLabel],
                  ['Verification Score', `${selectedProject.verificationScore}/100`],
                  ['CO2 Captured', `${selectedProject.co2CapturedTons.toLocaleString()} tons`],
                  ['Credits Generated', selectedProject.creditsGenerated.toLocaleString()],
                  ['Revenue', usd(selectedProject.revenueUsd)],
                  ['Monitoring Stage', selectedProject.monitoringStage],
                  ['Consent', selectedProject.consentStatus],
                  ['Land Rights', selectedProject.landRightsStatus],
                  ['Registry Target', selectedProject.registryTarget],
                  ['Risk Level', selectedProject.riskLevel],
                  ['Buyer Demand', selectedProject.buyerDemand],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Project Story</p>
                <p className="mt-2 text-sm text-emerald-50">{selectedProject.story}</p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {missions.map((mission) => {
              const project = projects.find((item) => item.id === mission.projectId);
              return (
                <Card key={mission.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{mission.missionType}</p>
                      <h2 className="mt-1 text-lg font-black text-white">{mission.title}</h2>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(mission.status)}`}>{mission.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{project?.name}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-500">Target</span><br /><b>{mission.targetQuantity} {mission.unitType}</b></div>
                    <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-500">Due</span><br /><b>{mission.dueDate}</b></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {mission.proofRules.map((rule) => (
                      <div key={rule} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
                        {rule}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {projectAssets.map((asset) => (
                <Card key={asset.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">{asset.assetType}</p>
                      <h2 className="mt-1 text-lg font-black text-white">{asset.name}</h2>
                    </div>
                    <QrCode className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Code:</span> {asset.assetCode}</p>
                    <p><span className="text-slate-500">Location:</span> {asset.location}</p>
                    {asset.species && <p><span className="text-slate-500">Species:</span> {asset.species}</p>}
                    <p><span className="text-slate-500">Evidence:</span> {asset.evidenceCount} records</p>
                  </div>
                </Card>
              ))}
            </div>
            <Card>
              <h2 className="text-lg font-black text-white">QR Payload Preview</h2>
              <p className="mt-1 text-sm text-slate-400">QR tags should attach to plots, clusters, nursery batches, checkpoints, and routes.</p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-black/40 p-4 text-xs text-emerald-100">{JSON.stringify(qrPayload, null, 2)}</pre>
              <div className="mt-4 grid gap-2 text-xs text-slate-300">
                {['Open asset page', 'Show mission history', 'Upload new evidence', 'Mark visit', 'Verify condition'].map((action) => (
                  <div key={action} className="rounded-lg border border-slate-800 bg-slate-950 p-2">{action}</div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-4">
            {evidence.map((item) => {
              const score = proofScore(item);
              const mission = missions.find((entry) => entry.id === item.missionId);
              const asset = assets.find((entry) => entry.id === item.assetId);
              return (
                <Card key={item.id}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.6fr]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{item.id}</p>
                      <h2 className="mt-1 text-lg font-black text-white">{item.type}</h2>
                      <p className="mt-2 text-sm text-slate-400">{mission?.title} - {asset?.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Uploaded by {item.uploader} at {item.capturedAt}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['GPS valid', item.gpsValid],
                        ['Timestamp valid', item.timestampValid],
                        ['Photo count met', item.photoCountMet],
                        ['QR matched', item.qrMatched],
                        ['Inside boundary', item.insideBoundary],
                        ['Duplicate clear', item.duplicateClear],
                        ['Fields complete', item.fieldsComplete],
                        ['Witness present', item.witnessPresent],
                      ].map(([label, ok]) => (
                        <div key={String(label)} className={`rounded-lg border p-2 ${ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Proof Score</p>
                      <p className="mt-1 text-3xl font-black text-white">{score}/100</p>
                      <p className="mt-1 text-sm font-bold text-emerald-300">{scoreLabel(score)}</p>
                      <span className={`mt-4 inline-block rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(item.validatorStatus)}`}>{item.validatorStatus}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <h2 className="text-lg font-black text-white">Monitoring Cycle Types</h2>
              <div className="mt-4 space-y-2">
                {['Baseline', 'Planting event', 'Establishment phase', 'Survival cycle', 'Seasonal review', 'Annual verification', 'Incident response cycle'].map((cycle) => (
                  <div key={cycle} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{cycle}</div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-black text-white">{selectedProject.name} Timeline</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Verification Confidence</p>
                  <p className="mt-1 text-2xl font-black text-white">{selectedProject.aiVerificationConfidence}%</p>
                </div>
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Satellite Confirmed Growth</p>
                  <p className="mt-1 text-2xl font-black text-white">{selectedProject.satelliteConfirmed ? 'YES' : 'NO'}</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk Level</p>
                  <p className="mt-1 text-2xl font-black text-white">{selectedProject.riskLevel}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Baseline', 'Polygon, consent, land-rights documents, first satellite snapshot'],
                  ['Initial activity', 'Missions launched and assets registered'],
                  ['30-day check', 'Survival count and replanting trigger'],
                  ['90-day check', `${selectedProject.treesAlive.toLocaleString()} living trees recorded where applicable`],
                  ['Annual cycle', 'Export buyer and registry support package'],
                ].map(([label, detail]) => (
                  <div key={label} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-black text-white">{label}</p>
                      <p className="mt-1 text-sm text-slate-400">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'buyers' && (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Buyer Project Page</p>
              <h2 className="mt-1 text-3xl font-black text-white">{selectedProject.name}</h2>
              <p className="mt-3 text-slate-400">{selectedProject.communityName} - {selectedProject.hectares.toLocaleString()} hectares - Active monitoring by {selectedProject.stewardName}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Hectares" value={String(selectedProject.hectares)} icon={<MapPin className="h-4 w-4" />} />
                <Metric label="CO2" value={`${selectedProject.co2CapturedTons} t`} icon={<Cloud className="h-4 w-4" />} />
                <Metric label="Credits" value={String(selectedProject.creditsGenerated)} icon={<Award className="h-4 w-4" />} />
                <Metric label="Revenue" value={usd(selectedProject.revenueUsd)} icon={<Database className="h-4 w-4" />} />
              </div>
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Trust Summary</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Verification Confidence</p>
                    <p className="text-lg font-black text-white">{selectedProject.aiVerificationConfidence}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Price Per Credit</p>
                    <p className="text-lg font-black text-white">{usd(selectedProject.pricePerCreditUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Monitoring Cadence</p>
                    <p className="text-sm font-bold text-white">{selectedProject.monitoringStage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Demand Signal</p>
                    <p className="text-sm font-bold text-white">{selectedProject.buyerDemand}</p>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-black text-white">Buyer Marketplace Preview</h2>
              <div className="mt-4 space-y-3">
                {[
                  `Buy ${Math.min(100, selectedProject.creditsGenerated - selectedProject.creditsSold)} fresh credits`,
                  'Sponsor 1 hectare',
                  'Sponsor monitoring cycle',
                  'Sponsor patrol team',
                ].map((option) => (
                  <button key={option} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-sm font-bold text-white hover:border-emerald-500">
                    {option}
                    <Plus className="h-4 w-4 text-emerald-300" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-black text-white">Observed Claims</h2>
              <p className="mt-1 text-sm text-slate-400">Hard facts collected from missions and evidence.</p>
              <div className="mt-4 space-y-2">
                {[
                  `${selectedProject.treesPlanted.toLocaleString()} seedlings planted`,
                  `${selectedProject.hectares.toLocaleString()} hectares monitored`,
                  `${projectMissions.length} linked missions`,
                  `${projectEvidence.length} evidence records in current proof stack`,
                  `${selectedProject.creditsGenerated.toLocaleString()} credits generated`,
                ].map((claim) => (
                  <div key={claim} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{claim}</div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-black text-white">Estimated Impact Claims</h2>
              <p className="mt-1 text-sm text-slate-400">Modeled outputs stay separate until a validated methodology supports them.</p>
              <div className="mt-4 space-y-2">
                {[
                  `Estimated sequestration: ${selectedProject.co2CapturedTons.toLocaleString()} tons CO2`,
                  `Estimated credit value: ${usd(selectedProject.creditsGenerated * selectedProject.pricePerCreditUsd)}`,
                  'Projected biodiversity uplift: methodology attachment required',
                  'Projected watershed benefit: methodology attachment required',
                ].map((claim) => (
                  <div key={claim} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">{claim}</div>
                ))}
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-black text-white">Verification Package Export</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {['Mission log', 'Evidence summaries', 'Monitoring cycle reports', 'Asset inventory', 'Incident history'].map((item) => (
                  <button key={item} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-sm font-bold text-white hover:border-emerald-500">
                    <FileText className="mb-2 h-4 w-4 text-emerald-300" />
                    {item}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AfoluEngineView;
