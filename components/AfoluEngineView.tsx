import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Camera, CheckCircle, Clock, Database,
  FileText, Globe, Map, MapPin, Plus, QrCode, ShieldCheck, Target, Upload, Users, Cloud, Loader, X,
} from './icons';
import ProjectDetailView from './ProjectDetailView';
import MRVResultsView from './MRVResultsView';
import DpalCarbonViuCalculator from './DpalCarbonViuCalculator';

type AfoluTab =
  | 'home'
  | 'calculator'
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
type MissionLaunchType = 'Plant Trees' | 'Patrol Protected Area' | 'Verify Sample Plot' | 'Fire Recovery' | 'Agroforestry';

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
  monthlyCo2Tons: number;
  projectedRevenueUsd: number;
  mrvLastValidatedAt: string;
  anomalyStatus: string;
  buyerPipelineCount: number;
  inventoryAvailable: number;
  packageCompleteness: number;
  evidenceFiles: number;
  verifiedProjectMaps: number;
  availableLots: number;
  priceRangeUsd: string;
}

interface BuyerRecord {
  id: string;
  name: string;
  buyerType: string;
  projectId: string;
  interest: string;
  requestedCredits: number;
  offerPriceUsd: number;
  status: 'pipeline' | 'negotiating' | 'won';
  lastTouch: string;
}

interface MissionTypeOption {
  title: MissionLaunchType;
  impactType: string;
  description: string;
  expectedTco2e: number;
  unitLabel: string;
  whatThisProves: string;
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

const PROJECTS_STORAGE_KEY = 'dpal_afolu_projects_v1';

const seededProjects: AfoluProject[] = [
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
    monthlyCo2Tons: 96,
    projectedRevenueUsd: 22420,
    mrvLastValidatedAt: '2026-04-20',
    anomalyStatus: 'Caution - boundary pressure on north corridor',
    buyerPipelineCount: 2,
    inventoryAvailable: 760,
    packageCompleteness: 84,
    evidenceFiles: 27,
    verifiedProjectMaps: 3,
    availableLots: 2,
    priceRangeUsd: '$8-$18 / credit',
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
    monthlyCo2Tons: 31,
    projectedRevenueUsd: 9125,
    mrvLastValidatedAt: '2026-04-18',
    anomalyStatus: 'Clean',
    buyerPipelineCount: 1,
    inventoryAvailable: 225,
    packageCompleteness: 79,
    evidenceFiles: 18,
    verifiedProjectMaps: 2,
    availableLots: 1,
    priceRangeUsd: '$12-$20 / credit',
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
    monthlyCo2Tons: 44,
    projectedRevenueUsd: 16200,
    mrvLastValidatedAt: '2026-04-19',
    anomalyStatus: 'Clean',
    buyerPipelineCount: 2,
    inventoryAvailable: 330,
    packageCompleteness: 91,
    evidenceFiles: 34,
    verifiedProjectMaps: 4,
    availableLots: 3,
    priceRangeUsd: '$14-$24 / credit',
  },
];

const buyers: BuyerRecord[] = [
  {
    id: 'BUY-001',
    name: 'Andean Foods Group',
    buyerType: 'Corporate inset buyer',
    projectId: 'AF-PROJ-221',
    interest: 'Scope 3 agroforestry credits',
    requestedCredits: 100,
    offerPriceUsd: 25,
    status: 'negotiating',
    lastTouch: '2026-04-20',
  },
  {
    id: 'BUY-002',
    name: 'Amazon Logistics Alliance',
    buyerType: 'Voluntary carbon buyer',
    projectId: 'AF-PROJ-102',
    interest: 'Avoided deforestation tranche',
    requestedCredits: 250,
    offerPriceUsd: 19,
    status: 'pipeline',
    lastTouch: '2026-04-19',
  },
  {
    id: 'BUY-003',
    name: 'Sierra Mutual',
    buyerType: 'Resilience sponsor',
    projectId: 'AF-PROJ-318',
    interest: 'Fire recovery credit package',
    requestedCredits: 120,
    offerPriceUsd: 30,
    status: 'won',
    lastTouch: '2026-04-17',
  },
];

const missionTypeOptions: MissionTypeOption[] = [
  {
    title: 'Plant Trees',
    impactType: 'Sequestration',
    description: 'Launch planting and survival operations that create new carbon stock.',
    expectedTco2e: 120,
    unitLabel: '500 trees',
    whatThisProves: 'Proves sequestration through planting and survival tracking.',
  },
  {
    title: 'Patrol Protected Area',
    impactType: 'Avoided Emissions',
    description: 'Deploy field patrols to document protection activity and deter clearing.',
    expectedTco2e: 90,
    unitLabel: '50 hectares',
    whatThisProves: 'Proves avoided deforestation with geo-tagged field presence and incident reporting.',
  },
  {
    title: 'Verify Sample Plot',
    impactType: 'Verification Boost',
    description: 'Improve biomass confidence through plot checks and recounts.',
    expectedTco2e: 45,
    unitLabel: '12 plots',
    whatThisProves: 'Improves carbon confidence through plot-level verification.',
  },
  {
    title: 'Fire Recovery',
    impactType: 'Sequestration',
    description: 'Track post-fire regeneration, nursery batches, and recovery evidence.',
    expectedTco2e: 110,
    unitLabel: '40 hectares',
    whatThisProves: 'Proves recovery-driven sequestration and restoration progress.',
  },
  {
    title: 'Agroforestry',
    impactType: 'Sequestration',
    description: 'Coordinate parcel-based agroforestry expansion with mixed-species logging.',
    expectedTco2e: 135,
    unitLabel: '80 hectares',
    whatThisProves: 'Proves integrated sequestration through farm-level tree establishment.',
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
  { id: 'calculator', label: 'Credit Engine' },
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

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-800/80 ${className}`} />
);

const Metric: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
  onClick?: () => void;
}> = ({ label, value, icon, tone = 'text-emerald-300', onClick }) => (
  <Card className={onClick ? 'transition hover:border-emerald-500/40 hover:shadow-[0_0_24px_rgba(16,185,129,0.14)]' : ''}>
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default"
    >
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </div>
      <div className={`rounded-lg border border-current/30 bg-white/5 p-2 ${tone}`}>{icon}</div>
    </button>
  </Card>
);

const OverlayModal: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_0_40px_rgba(16,185,129,0.14)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const BuyerPackageView: React.FC<{
  projectName: string;
  inventoryAvailable: number;
  packageCompleteness: number;
  priceRangeUsd: string;
  onBack: () => void;
}> = ({ projectName, inventoryAvailable, packageCompleteness, priceRangeUsd, onBack }) => (
  <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Credit Packaging</p>
              <h1 className="mt-1 text-3xl font-black text-white">{projectName}</h1>
              <p className="mt-2 text-sm text-slate-400">Packaging credits, evidence, maps, and MRV outputs into a buyer-ready submission.</p>
            </div>
          </div>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
            Export Package
          </button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Credits Available', String(inventoryAvailable)],
          ['Package Completeness', `${packageCompleteness}%`],
          ['Expected Price Range', priceRangeUsd],
          ['Submission Status', 'Ready for buyer review'],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-black text-white">Package Contents</h2>
          <div className="mt-4 space-y-3">
            {['Verified project maps', 'Carbon timeline', 'Evidence archive', 'MRV result sheet', 'Buyer-facing summary memo'].map((item) => (
              <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{item}</div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-black text-white">Readiness Track</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-5 text-[11px]">
            {['Documentation', 'Model', 'Validation', 'Packaging', 'Submission'].map((step) => (
              <div key={step} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-3 text-center font-bold text-emerald-100">{step}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);

const MissionLiveView: React.FC<{
  missionName: string;
  projectName: string;
  missionType: MissionLaunchType;
  expectedTco2e: number;
  targetLabel: string;
  participants: string[];
  proofRules: string[];
  riskAlerts: string[];
  onBack: () => void;
}> = ({ missionName, projectName, missionType, expectedTco2e, targetLabel, participants, proofRules, riskAlerts, onBack }) => (
  <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-slate-300 transition hover:border-emerald-500 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Mission Live View</p>
              <h1 className="mt-1 text-3xl font-black text-white">{missionName}</h1>
              <p className="mt-2 text-sm text-slate-400">{missionType} mission is now active inside {projectName} and collecting carbon-relevant proof.</p>
              <p className="mt-2 text-sm text-emerald-100">This mission is expected to generate ~{expectedTco2e} tCO2e if completed successfully.</p>
            </div>
          </div>
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100">Status: ACTIVE</span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Expected Carbon Impact', `${expectedTco2e} tCO2e`],
          ['Target', targetLabel],
          ['Submissions', '3 incoming'],
          ['Verification', 'Live monitoring'],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-black text-white">Mission Progress</h2>
          <div className="mt-4 rounded-full bg-slate-800">
            <div className="h-3 rounded-full bg-emerald-500" style={{ width: '38%' }} />
          </div>
          <p className="mt-3 text-sm text-slate-300">38% complete - field teams have started logging proof and map activity.</p>
          <div className="mt-4 space-y-3">
            {['Checkpoint 1 submitted', 'Satellite watch enabled', 'Validator assigned', 'First proof packet queued for review'].map((item) => (
              <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{item}</div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black text-white">Map Activity</h2>
          <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_rgba(2,6,23,0.92))] text-center">
            <div>
              <MapPin className="mx-auto h-8 w-8 text-emerald-300" />
              <p className="mt-3 text-lg font-black text-white">Live activity map placeholder</p>
              <p className="mt-2 max-w-md text-sm text-slate-300">Submissions, route traces, and proof events appear here as the mission runs.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-300" />
            <h2 className="text-lg font-black text-white">Participants</h2>
          </div>
          <div className="mt-4 space-y-2">
            {participants.map((participant) => (
              <div key={participant} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{participant}</div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            <h2 className="text-lg font-black text-white">Proof Rules Live</h2>
          </div>
          <div className="mt-4 space-y-2">
            {proofRules.map((rule) => (
              <div key={rule} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{rule}</div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="text-lg font-black text-white">Risk Watch</h2>
          </div>
          <div className="mt-4 space-y-2">
            {riskAlerts.map((alert) => (
              <div key={alert} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{alert}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);

const pipelineSteps: Array<{ title: string; detail: string }> = [
  { title: 'Observed Activity', detail: 'Real-world action logged on the ground: trees planted, hectares patrolled, plots measured.' },
  { title: 'Eligible Impact', detail: 'DPAL determines whether the activity is actually credit-relevant.' },
  { title: 'Modeled tCO2e', detail: 'The MRV engine estimates carbon benefit from verified field activity.' },
  { title: 'Verification Review', detail: 'Evidence is checked by rules, validators, and satellite monitoring.' },
  { title: 'Credits Packaged', detail: 'Impact is structured into a buyer-ready package.' },
  { title: 'Buyer/Registry Submission', detail: 'The package moves to buyers or registries for sale or certification.' },
];

interface AfoluEngineViewProps {
  onReturn: () => void;
}

type ProjectSetupDraft = {
  name: string;
  type: string;
  country: string;
  region: string;
  municipality: string;
  stewardName: string;
  communityName: string;
  hectares: string;
  polygonLabel: string;
  registryTarget: string;
  consentStatus: string;
  landRightsStatus: string;
  story: string;
  riskLevel: RiskLevel;
  pricePerCreditUsd: string;
  priceRangeUsd: string;
};

const defaultProjectSetupDraft = (): ProjectSetupDraft => ({
  name: '',
  type: 'Reforestation',
  country: 'United States',
  region: '',
  municipality: '',
  stewardName: '',
  communityName: '',
  hectares: '',
  polygonLabel: '',
  registryTarget: 'Buyer-ready proof package',
  consentStatus: 'Pending upload',
  landRightsStatus: 'Pending review',
  story: '',
  riskLevel: 'Medium',
  pricePerCreditUsd: '18',
  priceRangeUsd: '$12-$20 / credit',
});

const buildProjectFromDraft = (draft: ProjectSetupDraft, projectIndex: number): AfoluProject => {
  const hectares = Math.max(1, Number.parseFloat(draft.hectares) || 0);
  const plantedEstimate = Math.round(hectares * 28);
  const survivalRate = 0.9;
  const treesAlive = Math.round(plantedEstimate * survivalRate);
  const co2CapturedTons = Math.round(hectares * 6.4);
  const creditsGenerated = co2CapturedTons;
  const inventoryAvailable = Math.round(creditsGenerated * 0.72);
  const pricePerCreditUsd = Math.max(1, Number.parseFloat(draft.pricePerCreditUsd) || 18);
  const revenueUsd = inventoryAvailable * pricePerCreditUsd;
  const packageCompleteness = draft.consentStatus.toLowerCase().includes('attached') ? 78 : 62;

  return {
    id: `AF-PROJ-${String(projectIndex).padStart(3, '0')}`,
    name: draft.name.trim(),
    type: draft.type.trim(),
    country: draft.country.trim(),
    region: draft.region.trim(),
    municipality: draft.municipality.trim(),
    stewardName: draft.stewardName.trim(),
    communityName: draft.communityName.trim(),
    hectares,
    status: 'draft',
    riskLevel: draft.riskLevel,
    verificationScore: 68,
    monitoringStage: 'Project setup complete - waiting for first mission and evidence batch',
    treesPlanted: plantedEstimate,
    treesAlive,
    co2CapturedTons,
    creditsGenerated,
    creditsSold: 0,
    revenueUsd,
    pricePerCreditUsd,
    polygonLabel: draft.polygonLabel.trim(),
    registryTarget: draft.registryTarget.trim(),
    consentStatus: draft.consentStatus.trim(),
    landRightsStatus: draft.landRightsStatus.trim(),
    satelliteConfirmed: false,
    aiVerificationConfidence: 64,
    buyerDemand: 'No buyers attached yet - package after first verified monitoring cycle',
    story: draft.story.trim(),
    monthlyCo2Tons: Math.max(6, Math.round(co2CapturedTons / 12)),
    projectedRevenueUsd: Math.round(revenueUsd * 1.35),
    mrvLastValidatedAt: 'Not yet validated',
    anomalyStatus: 'No review run yet',
    buyerPipelineCount: 0,
    inventoryAvailable,
    packageCompleteness,
    evidenceFiles: 0,
    verifiedProjectMaps: 1,
    availableLots: 1,
    priceRangeUsd: draft.priceRangeUsd.trim(),
  };
};

const AfoluEngineView: React.FC<AfoluEngineViewProps> = ({ onReturn }) => {
  const [activeTab, setActiveTab] = useState<AfoluTab>('home');
  const [projects, setProjects] = useState<AfoluProject[]>(() => {
    if (typeof window === 'undefined') return seededProjects;
    try {
      const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (!stored) return seededProjects;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length ? parsed as AfoluProject[] : seededProjects;
    } catch {
      return seededProjects;
    }
  });
  const [selectedProjectId, setSelectedProjectId] = useState(() => seededProjects[0].id);
  const [surfaceView, setSurfaceView] = useState<'dashboard' | 'projectDetail' | 'mrvResults' | 'buyerPackage' | 'missionLive'>('dashboard');
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'projectSetup' | 'missionBuilder' | 'uploadProof' | 'dealDetail'>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(buyers[0]?.id || null);
  const [selectedPipelineStep, setSelectedPipelineStep] = useState(pipelineSteps[0]);
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);
  const [missionBuilderStep, setMissionBuilderStep] = useState(0);
  const [selectedMissionType, setSelectedMissionType] = useState<MissionLaunchType>('Plant Trees');
  const [homeSectionsLoading, setHomeSectionsLoading] = useState(true);
  const [projectSetupDraft, setProjectSetupDraft] = useState<ProjectSetupDraft>(() => defaultProjectSetupDraft());
  const [projectSetupError, setProjectSetupError] = useState('');

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
    const projectedRevenueUsd = projects.reduce((sum, project) => sum + project.projectedRevenueUsd, 0);
    const inventoryAvailable = projects.reduce((sum, project) => sum + project.inventoryAvailable, 0);
    return {
      hectares,
      planted,
      survival,
      co2Captured,
      creditsGenerated,
      creditsSold,
      revenueUsd,
      projectedRevenueUsd,
      inventoryAvailable,
      avgVerificationConfidence,
      pendingEvidence: evidence.filter((item) => item.validatorStatus !== 'clean').length,
      verifiedMissions: missions.filter((mission) => mission.status === 'Verified' || mission.status === 'Under Review').length,
      alerts: projects.filter((project) => project.riskLevel === 'High' || project.riskLevel === 'Critical').length,
    };
  }, [projects]);

  const qrPayload = {
    asset_id: projectAssets[0]?.assetCode || 'AFT-PLT-00045',
    project_id: selectedProject.id,
    asset_type: projectAssets[0]?.assetType || 'plot',
    region: selectedProject.region,
    status: projectAssets[0]?.status || 'active',
  };

  const selectedProjectBuyers = buyers.filter((buyer) => buyer.projectId === selectedProject.id);
  const spotlightProject = projects[1] || projects[0];
  const buyerInterest = buyers.length;
  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId) || null;
  const missionTypeConfig = missionTypeOptions.find((option) => option.title === selectedMissionType) || missionTypeOptions[0];
  const missionParticipants = [
    'Community members - Drivers completing the field work',
    'Validators - Verifiers confirming proof quality',
    'Supervisors - Coordinators managing deployment and exceptions',
  ];
  const missionRewards = 'DPAL tokens or payment per task';
  const missionProofRules = [
    'Minimum 3 photos',
    'GPS required',
    '24h time window',
    '150 meter geo radius check',
  ];
  const missionRiskAlerts = selectedMissionType === 'Fire Recovery' || selectedProject.riskLevel === 'High'
    ? ['Fire watch active', 'Boundary disturbance watch active', 'Validator escalation if anomalies appear']
    : ['Deforestation watch active', 'Boundary drift watch active', 'Validator escalation if anomalies appear'];
  const missionAreaLabel = selectedMissionType === 'Plant Trees'
    ? `${selectedProject.municipality} planting block - 500 trees target`
    : `${selectedProject.municipality} operational zone - ${missionTypeConfig.unitLabel}`;
  const missionDeploySummary = `${selectedMissionType} mission for ${selectedProject.name}`;
  const mrvIntelligenceItems = [
    {
      label: 'Satellite Review',
      value: 'Passed',
      tone: 'text-emerald-300',
      onClick: () => runTransition('Opening MRV results', () => setSurfaceView('mrvResults')),
    },
    {
      label: 'Geo Match',
      value: '98%',
      tone: 'text-white',
      onClick: () => setActiveTab('projects'),
    },
    {
      label: 'Photo Evidence Completeness',
      value: '87%',
      tone: 'text-white',
      onClick: () => setActiveModal('uploadProof'),
    },
    {
      label: 'Field Log Consistency',
      value: 'Strong',
      tone: 'text-white',
      onClick: () => setActiveTab('evidence'),
    },
    {
      label: 'Risk Flags',
      value: '1',
      tone: 'text-white',
      onClick: () => setActiveTab('monitoring'),
    },
  ];

  const openMissionBuilderFor = (missionType: MissionLaunchType) => {
    setMissionBuilderStep(0);
    setSelectedMissionType(missionType);
    setActiveModal('missionBuilder');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (projects.some((project) => project.id === selectedProjectId)) return;
    setSelectedProjectId(projects[0]?.id || '');
  }, [projects, selectedProjectId]);

  const updateProjectSetupDraft = <K extends keyof ProjectSetupDraft>(key: K, value: ProjectSetupDraft[K]) => {
    setProjectSetupDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetProjectSetupModal = () => {
    setProjectSetupDraft(defaultProjectSetupDraft());
    setProjectSetupError('');
  };

  const openProjectSetup = () => {
    resetProjectSetupModal();
    setActiveModal('projectSetup');
  };

  const createProject = () => {
    const requiredFields: Array<keyof ProjectSetupDraft> = ['name', 'region', 'municipality', 'stewardName', 'communityName', 'hectares', 'polygonLabel', 'story'];
    const missing = requiredFields.find((field) => !String(projectSetupDraft[field]).trim());
    if (missing) {
      setProjectSetupError('Fill in the core project identity, AOI area, polygon label, and project story before creating the project.');
      return;
    }

    const hectaresValue = Number.parseFloat(projectSetupDraft.hectares);
    if (!Number.isFinite(hectaresValue) || hectaresValue <= 0) {
      setProjectSetupError('Hectares must be a real number greater than zero.');
      return;
    }

    const nextProject = buildProjectFromDraft(projectSetupDraft, projects.length + 401);
    setProjects((prev) => [nextProject, ...prev]);
    setSelectedProjectId(nextProject.id);
    setActiveModal(null);
    setActiveTab('projects');
    setSurfaceView('dashboard');
    setProjectSetupError('');
    setProjectSetupDraft(defaultProjectSetupDraft());
  };

  useEffect(() => {
    if (activeTab !== 'home') return;
    setHomeSectionsLoading(true);
    const timeout = window.setTimeout(() => setHomeSectionsLoading(false), 420);
    return () => window.clearTimeout(timeout);
  }, [activeTab, selectedProjectId]);

  const runTransition = (label: string, cb: () => void) => {
    setLoadingLabel(label);
    window.setTimeout(() => {
      cb();
      setLoadingLabel(null);
    }, 450);
  };

  const projectDetailData = useMemo(() => ({
    projectName: selectedProject.name,
    status: selectedProject.status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    hectares: selectedProject.hectares.toLocaleString(),
    treesRegistered: selectedProject.treesPlanted.toLocaleString(),
    estimatedTco2e: `${selectedProject.co2CapturedTons.toLocaleString()} t`,
    creditsReady: selectedProject.inventoryAvailable.toLocaleString(),
    survivalRate: `${selectedProject.treesPlanted > 0 ? Math.round((selectedProject.treesAlive / selectedProject.treesPlanted) * 100) : 100}%`,
    verificationConfidence: `${selectedProject.aiVerificationConfidence}%`,
    mapLabel: `${selectedProject.municipality}, ${selectedProject.region}, ${selectedProject.country}`,
    metadata: [
      { label: 'Project Type', value: selectedProject.type },
      { label: 'Community', value: selectedProject.communityName },
      { label: 'Steward', value: selectedProject.stewardName },
      { label: 'Registry Target', value: selectedProject.registryTarget },
      { label: 'Land Rights', value: selectedProject.landRightsStatus },
      { label: 'Last MRV Validation', value: selectedProject.mrvLastValidatedAt },
    ],
    carbonTimeline: [
      { id: 'tl-1', date: '2026-01-12', activity: 'Baseline parcel mapping completed', carbonImpact: '0 t baseline locked' },
      { id: 'tl-2', date: '2026-02-09', activity: 'Field missions submitted with geo-tagged proof', carbonImpact: `+${Math.round(selectedProject.monthlyCo2Tons * 0.8)} tCO2e eligible` },
      { id: 'tl-3', date: '2026-03-15', activity: 'Satellite recovery trend confirmed', carbonImpact: `+${Math.round(selectedProject.monthlyCo2Tons)} tCO2e modeled` },
      { id: 'tl-4', date: '2026-04-20', activity: 'Buyer package updated after validator review', carbonImpact: `${selectedProject.inventoryAvailable} credits ready` },
    ],
    evidence: [
      { id: 'ev-1', url: '/main-screen/land-mineral-monitoring.png', title: 'Boundary checkpoint photo', capturedAt: '2026-04-18 10:42' },
      { id: 'ev-2', url: '/main-screen/water-project-monitoring.png', title: 'Plot survival capture', capturedAt: '2026-04-18 13:05' },
      { id: 'ev-3', url: '/main-screen/field-missions.png', title: 'Patrol route verification', capturedAt: '2026-04-19 08:30' },
      { id: 'ev-4', url: '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png', title: 'Restoration cluster overview', capturedAt: '2026-04-19 16:40' },
    ],
    mrvSummary: {
      confidenceScore: `${selectedProject.aiVerificationConfidence}%`,
      satelliteValidation: selectedProject.satelliteConfirmed ? 'Passed' : 'Needs review',
      riskFlags: selectedProject.anomalyStatus,
      aiNote: 'DPAL cross-checked field evidence, geospatial consistency, and recent satellite trend data. Recovery appears stable with no unresolved contradiction between field logs and remote sensing.',
    },
    creditPackage: {
      creditsAvailable: selectedProject.inventoryAvailable.toLocaleString(),
      priceRange: selectedProject.priceRangeUsd,
      totalValue: usd(selectedProject.inventoryAvailable * selectedProject.pricePerCreditUsd),
      status: selectedProject.packageCompleteness >= 85 ? 'Buyer Ready' : 'Packaging In Progress',
    },
    buyerActivity: selectedProjectBuyers.map((buyer) => ({
      id: buyer.id,
      buyer: buyer.name,
      offer: `${buyer.requestedCredits} credits at ${usd(buyer.offerPriceUsd)}`,
      status: buyer.status,
    })),
  }), [selectedProject, selectedProjectBuyers]);

  const survivalRate = selectedProject.treesPlanted > 0
    ? Math.round((selectedProject.treesAlive / selectedProject.treesPlanted) * 100)
    : 100;
  const riskScore = selectedProject.riskLevel === 'Low'
    ? 'Low residual risk'
    : selectedProject.riskLevel === 'Medium'
      ? 'Medium residual risk'
      : 'Elevated risk';
  const reviewResult = selectedProject.packageCompleteness >= 85
    ? 'Supported for packaging'
    : 'Needs more review before packaging';
  const approvalRecommendation = selectedProject.packageCompleteness >= 90
    ? 'Approve subject to final formatting'
    : selectedProject.packageCompleteness >= 80
      ? 'Conditional approval'
      : 'Hold for additional evidence';
  const creditPackageState = selectedProject.packageCompleteness >= 90
    ? 'Packaging review pending'
    : selectedProject.packageCompleteness >= 80
      ? 'Formatting and evidence cleanup required'
      : 'Not ready for issuance packaging';

  const mrvResultsData = useMemo(() => ({
    projectName: selectedProject.name,
    runDate: selectedProject.mrvLastValidatedAt,
    reviewScope: 'Latest evidence batch, satellite review window, geospatial boundary validation, anomaly checks, and modeled carbon package.',
    evidenceBatch: `${projectEvidence.length} evidence records covering ${selectedProject.evidenceFiles} uploaded files and current mission logs`,
    satelliteWindow: selectedProject.type === 'Fire Recovery'
      ? 'Recent recovery monitoring window with disturbance and fire-context review'
      : 'Recent vegetation monitoring window with disturbance review',
    boundaryReview: `${selectedProject.polygonLabel} checked against project coordinates and submitted field points`,
    reviewResult,
    approvalRecommendation,
    creditPackageState,
    estimatedTco2e: `${selectedProject.co2CapturedTons.toLocaleString()} tCO2e`,
    supportedCredits: `${selectedProject.inventoryAvailable.toLocaleString()} market-ready credits`,
    confidenceScore: `${selectedProject.aiVerificationConfidence}%`,
    carbonModelStatus: selectedProject.packageCompleteness >= 85
      ? 'Modeled output is commercially supportable with final packaging review still required.'
      : 'Modeled output is provisional until the missing proof gaps are closed.',
    fieldEvidenceFacts: [
      { label: 'Evidence coverage', value: `${Math.min(96, selectedProject.packageCompleteness)}% of expected review package present` },
      { label: 'Photos and logs', value: `${projectEvidence.length * 4} reviewed photos or log attachments across current records` },
      { label: 'Plot or survival checks', value: selectedProject.type === 'Fire Recovery' ? `${survivalRate}% survival across recovery counts` : `${projectEvidence.length} active plot or mission-linked checks` },
      { label: 'Submission consistency', value: selectedProject.anomalyStatus === 'Clean' ? 'Strong submission consistency across timestamps and mission records' : 'Moderate consistency with anomalies noted for reviewer attention' },
    ],
    geoValidationFacts: [
      { label: 'GPS alignment', value: '98% coordinate alignment across reviewed submissions' },
      { label: 'Boundary match', value: `${selectedProject.polygonLabel} with high project-boundary fit` },
      { label: 'Outlier detection', value: selectedProject.anomalyStatus === 'Clean' ? 'No material location outliers detected' : selectedProject.anomalyStatus },
      { label: 'Coordinate confidence', value: 'Field evidence remained inside the reviewed operating area for the current batch' },
    ],
    satelliteFacts: [
      { label: 'Vegetation trend', value: selectedProject.type === 'Fire Recovery' ? 'Vegetation trend improved across the recovery area' : 'Vegetation condition remains stable to improving' },
      { label: 'Disturbance review', value: selectedProject.riskLevel === 'High' ? 'Localized disturbance pressure detected near the project edge' : 'No active deforestation signal identified in the reviewed window' },
      { label: 'Canopy or recovery trend', value: selectedProject.type === 'Fire Recovery' ? 'Canopy recovery remains on-track relative to the latest review window' : 'Canopy trend does not contradict field submissions' },
      { label: 'Fire context', value: selectedProject.type === 'Fire Recovery' ? 'Medium fire risk remains in the surrounding area' : 'No immediate fire-related permanence concern flagged' },
    ],
    riskFacts: [
      { label: 'Fraud flags', value: selectedProject.anomalyStatus === 'Clean' ? '0 active fraud or manipulation flags' : '1 caution flag requires reviewer awareness' },
      { label: 'Missing data', value: selectedProject.packageCompleteness > 80 ? 'Minor gaps only; package is mostly complete' : 'Additional evidence is still required before approval' },
      { label: 'Residual risk', value: riskScore },
      { label: 'Reviewer note', value: selectedProject.type === 'Fire Recovery' ? 'Surrounding fire exposure remains the main monitoring risk after approval' : 'Boundary pressure and long-term permanence remain the main watch items' },
    ],
    findings: [
      {
        title: selectedProject.type === 'Fire Recovery' ? 'Vegetation trend improved' : 'Field and landscape signals are directionally aligned',
        status: 'positive' as const,
        detail: selectedProject.type === 'Fire Recovery'
          ? 'Recovery plots, survival checks, and the reviewed vegetation window all point to continued restoration progress rather than setback.'
          : 'The current field package does not materially conflict with the reviewed vegetation and monitoring context.',
      },
      {
        title: selectedProject.riskLevel === 'High' ? 'Boundary pressure remains visible' : 'No active deforestation detected in the current review window',
        status: selectedProject.riskLevel === 'High' ? 'watch' as const : 'positive' as const,
        detail: selectedProject.riskLevel === 'High'
          ? 'The project can still be reviewed, but surrounding pressure means boundary watch and follow-up monitoring should remain active.'
          : 'No reviewed signal currently suggests active clearing inside the project area.',
      },
      {
        title: 'GPS alignment is strong',
        status: 'positive' as const,
        detail: 'Submitted coordinates are tightly clustered within the intended project area and do not show material outlier drift.',
      },
      {
        title: selectedProject.packageCompleteness >= 85 ? 'Evidence coverage is sufficient for packaging' : 'Evidence coverage is not yet sufficient for packaging',
        status: selectedProject.packageCompleteness >= 85 ? 'positive' as const : 'warning' as const,
        detail: selectedProject.packageCompleteness >= 85
          ? 'Current field records, maps, and validation notes are strong enough to support a packaging recommendation.'
          : 'The project needs one more round of evidence completion before DPAL should trust it for credit packaging.',
      },
      {
        title: selectedProject.type === 'Fire Recovery' ? 'Medium fire risk remains in surrounding area' : 'Residual monitoring risk remains manageable',
        status: selectedProject.type === 'Fire Recovery' ? 'watch' as const : 'watch' as const,
        detail: selectedProject.type === 'Fire Recovery'
          ? 'The core project evidence is credible, but surrounding fire exposure should stay visible in buyer and registry notes.'
          : 'The package is credible now, but routine monitoring should continue for permanence and edge disturbance risk.',
      },
    ],
    commercialReadout: [
      {
        label: 'Supported output',
        value: `${selectedProject.inventoryAvailable.toLocaleString()} market-ready credits`,
        detail: 'This is the amount the engine currently supports for packaging from the reviewed proof stack.',
      },
      {
        label: 'Commercial confidence',
        value: `${selectedProject.aiVerificationConfidence}% confidence`,
        detail: 'Confidence reflects field proof quality, geospatial consistency, satellite context, and unresolved risk items.',
      },
      {
        label: 'Registry packaging note',
        value: selectedProject.packageCompleteness >= 90
          ? 'Final formatting review still required before external submission.'
          : 'Formatting cleanup and a last document pass are still required.',
        detail: 'The commercial next step is packaging, not automatic registry acceptance.',
      },
    ],
    dataProvenanceLabel: 'Curated review record with no live satellite adapter attached',
    dataProvenanceNote: 'This screen currently summarizes project monitoring status, evidence records, and reviewer-configured MRV inputs. The AFOLU Proof Engine page is not yet ingesting a live satellite adapter payload inside this review flow, so remote-sensing statements here should be treated as review narrative until a real scene read or backend result is attached.',
    nextActionLabel: selectedProject.packageCompleteness >= 90
      ? 'Move the project into final credit-package formatting review'
      : 'Request one more evidence and formatting pass before packaging',
    nextActionNote: selectedProject.packageCompleteness >= 90
      ? `DPAL can move ${selectedProject.inventoryAvailable.toLocaleString()} supported credits into buyer or registry packaging, while keeping the residual ${selectedProject.type === 'Fire Recovery' ? 'fire' : 'monitoring'} risk visible in the commercial file.`
      : 'The package should stay in review until the remaining proof gaps are closed, then the engine can rerun the commercial support decision.',
  }), [approvalRecommendation, creditPackageState, projectEvidence.length, reviewResult, riskScore, selectedProject]);

  if (surfaceView === 'projectDetail') {
    return (
      <ProjectDetailView
        {...projectDetailData}
        onBack={() => setSurfaceView('dashboard')}
        onUploadProof={() => setActiveModal('uploadProof')}
        onRunMrv={() => runTransition('Running MRV review', () => setSurfaceView('mrvResults'))}
        onPrepareCredits={() => runTransition('Preparing buyer package', () => setSurfaceView('buyerPackage'))}
      />
    );
  }

  if (surfaceView === 'mrvResults') {
    return (
      <MRVResultsView
        {...mrvResultsData}
        onBack={() => setSurfaceView('dashboard')}
        onApproveCredits={() => runTransition('Approving credits', () => setActiveModal('dealDetail'))}
        onRequestMoreEvidence={() => setActiveModal('uploadProof')}
        onFlagForReview={() => setActiveModal('dealDetail')}
      />
    );
  }

  if (surfaceView === 'buyerPackage') {
    return (
      <BuyerPackageView
        projectName={selectedProject.name}
        inventoryAvailable={selectedProject.inventoryAvailable}
        packageCompleteness={selectedProject.packageCompleteness}
        priceRangeUsd={selectedProject.priceRangeUsd}
        onBack={() => setSurfaceView('dashboard')}
      />
    );
  }

  if (surfaceView === 'missionLive') {
    return (
      <MissionLiveView
        missionName={missionDeploySummary}
        projectName={selectedProject.name}
        missionType={selectedMissionType}
        expectedTco2e={missionTypeConfig.expectedTco2e}
        targetLabel={missionTypeConfig.unitLabel}
        participants={missionParticipants}
        proofRules={[...missionProofRules, missionTypeConfig.whatThisProves]}
        riskAlerts={missionRiskAlerts}
        onBack={() => setSurfaceView('dashboard')}
      />
    );
  }

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
              <h1 className="mt-1 text-2xl font-black text-white md:text-4xl">AFOLU Carbon & Proof Engine</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Turn forestry, reforestation, and protected-land activity into verified, buyer-ready carbon assets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openProjectSetup}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Create Project
            </button>
            <button
              onClick={() => {
                setMissionBuilderStep(0);
                setSelectedMissionType('Plant Trees');
                setActiveModal('missionBuilder');
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
            >
              Launch Mission
            </button>
            <button
              onClick={() => setActiveModal('uploadProof')}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
            >
              Upload Proof
            </button>
            <button
              onClick={() => runTransition('Running MRV review', () => setSurfaceView('mrvResults'))}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
            >
              Run MRV Review
            </button>
            <button
              onClick={() => runTransition('Preparing buyer package', () => setSurfaceView('buyerPackage'))}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
            >
              Prepare Buyer Package
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500"
            >
              Open Credit Engine
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
            {homeSectionsLoading ? (
              <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-800 bg-slate-900/80">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="mt-4 h-10 w-full max-w-2xl" />
                  <SkeletonBlock className="mt-3 h-4 w-full max-w-3xl" />
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <SkeletonBlock className="h-3 w-24" />
                        <SkeletonBlock className="mt-3 h-12 w-full" />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="border-slate-800 bg-slate-900/80">
                  <SkeletonBlock className="h-6 w-36" />
                  <div className="mt-4 space-y-3">
                    <SkeletonBlock className="h-20 w-full" />
                    {[0, 1, 2, 3, 4].map((item) => (
                      <SkeletonBlock key={item} className="h-12 w-full" />
                    ))}
                  </div>
                </Card>
              </section>
            ) : (
              <>
            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 via-slate-900/80 to-slate-950">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Investor Narrative</p>
                <h2 className="mt-2 text-3xl font-black text-white">AFOLU Carbon & Proof Engine</h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                  DPAL captures forestry, reforestation, and land-protection activity, converts it into measurable carbon impact through the MRV engine, and prepares it for buyers and registries.
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
                <h2 className="text-lg font-black text-white">MRV Intelligence</h2>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => runTransition('Opening MRV results', () => setSurfaceView('mrvResults'))}
                    className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-left transition hover:border-emerald-400"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Confidence Score</p>
                    <p className="mt-1 text-3xl font-black text-white">{totals.avgVerificationConfidence}%</p>
                  </button>
                  {mrvIntelligenceItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-sm text-slate-300 transition hover:border-emerald-500"
                    >
                      {item.label}: <span className={`font-bold ${item.tone}`}>{item.value}</span>
                    </button>
                  ))}
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                    Latest: Project area shows stable canopy recovery and consistent field evidence.
                  </div>
                </div>
              </Card>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active Projects" value={String(projects.length)} icon={<Globe className="h-5 w-5" />} onClick={() => setActiveTab('projects')} />
              <Metric label="Hectares Monitored" value={totals.hectares.toLocaleString()} icon={<Map className="h-5 w-5" />} tone="text-cyan-300" onClick={() => setActiveTab('projects')} />
              <Metric label="Estimated tCO2e" value={totals.co2Captured.toLocaleString()} icon={<Cloud className="h-5 w-5" />} tone="text-sky-300" onClick={() => runTransition('Opening project detail', () => setSurfaceView('projectDetail'))} />
              <Metric label="Credits Ready" value={totals.inventoryAvailable.toLocaleString()} icon={<Award className="h-5 w-5" />} tone="text-lime-300" onClick={() => runTransition('Opening buyer package', () => setSurfaceView('buyerPackage'))} />
              <Metric label="Survival Rate" value={`${totals.survival}%`} icon={<Activity className="h-5 w-5" />} tone="text-amber-300" onClick={() => setActiveTab('monitoring')} />
              <Metric label="Verification Confidence" value={`${totals.avgVerificationConfidence}%`} icon={<ShieldCheck className="h-5 w-5" />} tone="text-emerald-300" onClick={() => runTransition('Opening MRV results', () => setSurfaceView('mrvResults'))} />
              <Metric label="Buyer Interest" value={`${buyerInterest} buyers`} icon={<Users className="h-5 w-5" />} tone="text-fuchsia-300" onClick={() => setActiveTab('buyers')} />
              <Metric label="Projected Revenue" value={usd(totals.projectedRevenueUsd)} icon={<Database className="h-5 w-5" />} tone="text-amber-300" onClick={() => setActiveTab('buyers')} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">Carbon Pipeline</h2>
                    <p className="mt-1 text-sm text-slate-400">Where environmental work becomes a verified carbon asset.</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {pipelineSteps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => { setSelectedPipelineStep(step); setPipelineDrawerOpen(true); }}
                      className={`rounded-lg border bg-slate-950 p-3 text-left transition hover:border-emerald-500 ${selectedPipelineStep.title === step.title ? 'border-emerald-500' : 'border-slate-800'}`}
                    >
                      <p className="text-xs font-black text-emerald-300">Stage {index + 1}</p>
                      <p className="mt-2 text-sm font-bold text-white">{step.title}</p>
                      <p className="mt-2 text-xs text-slate-400">{step.detail}</p>
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <h2 className="text-lg font-black text-white">Credit-Creating Missions</h2>
                <p className="mt-1 text-sm text-slate-400">The activity layer that feeds carbon creation and confidence.</p>
                <div className="mt-4 space-y-3">
                  {[
                    ['Plant Trees', 'Generates new sequestration records through planting and survival tracking.'],
                    ['Patrol Protected Area', 'Supports avoided deforestation claims with geo-tagged field presence.'],
                    ['Verify Sample Plot', 'Improves confidence in biomass estimates through plot-level checks.'],
                  ].map(([template, detail]) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => openMissionBuilderFor(template as MissionLaunchType)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-emerald-500"
                    >
                      <div className="flex items-center gap-3">
                        <Target className="h-4 w-4 text-emerald-300" />
                        <span className="text-sm font-bold text-white">{template}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </button>
                  ))}
                </div>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h2 className="text-lg font-black text-white">Buyer Marketplace Preview</h2>
                <div className="mt-4 space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => runTransition('Opening project detail', () => { setSelectedProjectId(project.id); setSurfaceView('projectDetail'); })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-emerald-500"
                    >
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
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <h2 className="text-lg font-black text-white">Buyer Pipeline</h2>
                <div className="mt-4 space-y-3">
                  {buyers.map((buyer) => (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => { setSelectedBuyerId(buyer.id); setActiveModal('dealDetail'); }}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-emerald-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{buyer.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{buyer.buyerType} — {buyer.interest}</p>
                        </div>
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(buyer.status)}`}>{buyer.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Requested</span><br /><b>{buyer.requestedCredits}</b></div>
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Offer</span><br /><b>{usd(buyer.offerPriceUsd)}</b></div>
                        <div className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">Last Touch</span><br /><b>{buyer.lastTouch}</b></div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </section>
              </>
            )}

          </div>
        )}

        {activeTab === 'calculator' && (
          <DpalCarbonViuCalculator
            onLaunchMission={() => {
              setMissionBuilderStep(0);
              setSelectedMissionType('Plant Trees');
              setActiveModal('missionBuilder');
            }}
            onRunMrv={() => runTransition('Running MRV review', () => setSurfaceView('mrvResults'))}
            onPreparePackage={() => runTransition('Preparing buyer package', () => setSurfaceView('buyerPackage'))}
          />
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
                  ['Projected Revenue', usd(selectedProject.projectedRevenueUsd)],
                  ['Inventory Available', selectedProject.inventoryAvailable.toLocaleString()],
                  ['Monitoring Stage', selectedProject.monitoringStage],
                  ['Consent', selectedProject.consentStatus],
                  ['Land Rights', selectedProject.landRightsStatus],
                  ['Registry Target', selectedProject.registryTarget],
                  ['Risk Level', selectedProject.riskLevel],
                  ['Last MRV Validation', selectedProject.mrvLastValidatedAt],
                  ['Anomaly Status', selectedProject.anomalyStatus],
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
              const missionProjectCount = missions.filter((item) => item.projectId === mission.projectId).length || 1;
              const missionCredits = Math.round((project?.creditsGenerated || 0) / missionProjectCount);
              const missionCo2 = Math.round((project?.co2CapturedTons || 0) / missionProjectCount);
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
                    <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-500">CO2</span><br /><b>{missionCo2} t</b></div>
                    <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-500">Credits</span><br /><b>{missionCredits}</b></div>
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
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Buyer Pipeline</p>
                <div className="mt-3 space-y-2">
                  {selectedProjectBuyers.map((buyer) => (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => {
                        setSelectedBuyerId(buyer.id);
                        setActiveModal('dealDetail');
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-emerald-500"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{buyer.name}</p>
                        <p className="text-xs text-slate-400">{buyer.requestedCredits} credits at {usd(buyer.offerPriceUsd)}</p>
                      </div>
                      <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass(buyer.status)}`}>{buyer.status}</span>
                    </button>
                  ))}
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

      {loadingLabel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 text-center shadow-[0_0_32px_rgba(16,185,129,0.14)]">
            <Loader className="mx-auto h-6 w-6 animate-spin text-emerald-300" />
            <p className="mt-3 text-sm font-bold text-white">{loadingLabel}</p>
            <p className="mt-1 text-xs text-slate-400">Syncing data and preparing the next workspace...</p>
          </div>
        </div>
      )}

      {pipelineDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close pipeline drawer"
            onClick={() => setPipelineDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-slate-700 bg-slate-950/98 shadow-[-24px_0_60px_rgba(2,6,23,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">Carbon Pipeline Drawer</p>
                <h2 className="mt-2 text-2xl font-black text-white">{selectedPipelineStep.title}</h2>
                <p className="mt-2 text-sm text-slate-400">Inspect how this stage contributes to trust, carbon eligibility, and commercial packaging.</p>
              </div>
              <button
                type="button"
                onClick={() => setPipelineDrawerOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Stage role</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50">{selectedPipelineStep.detail}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Inputs</p>
                  <p className="mt-2 text-sm font-bold text-white">Missions, field proof, boundary context, validator actions</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Commercial effect</p>
                  <p className="mt-2 text-sm font-bold text-white">Moves activity closer to supported credits and buyer packaging.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Current portfolio signal</p>
                  <p className="mt-2 text-sm font-bold text-white">{projects.length} active projects feeding this stage</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Recommended next move</p>
                  <p className="mt-2 text-sm font-bold text-white">Keep stage outputs inspection-ready for MRV review and buyer packaging.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Related actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runTransition('Running MRV review', () => {
                      setPipelineDrawerOpen(false);
                      setSurfaceView('mrvResults');
                    })}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500"
                  >
                    Run MRV Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineDrawerOpen(false);
                      openMissionBuilderFor('Plant Trees');
                    }}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500"
                  >
                    Launch Mission
                  </button>
                  <button
                    type="button"
                    onClick={() => runTransition('Preparing buyer package', () => {
                      setPipelineDrawerOpen(false);
                      setSurfaceView('buyerPackage');
                    })}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500"
                  >
                    Prepare Buyer Package
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'projectSetup' && (
        <OverlayModal
          title="Project Setup Wizard"
          subtitle="Create a project record that immediately feeds Projects, MRV, packaging, and mission planning."
          onClose={() => {
            setActiveModal(null);
            resetProjectSetupModal();
          }}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">What this creates</p>
              <p className="mt-2 text-sm text-emerald-50">
                A real AFOLU project record with hectares, governance status, commercial defaults, and monitoring placeholders.
                As soon as we create it, it becomes selectable in the Projects tab and starts feeding dashboard totals.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Project name</span>
                <input
                  value={projectSetupDraft.name}
                  onChange={(event) => updateProjectSetupDraft('name', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Washoe County Rangeland Block A"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Project type</span>
                <select
                  value={projectSetupDraft.type}
                  onChange={(event) => updateProjectSetupDraft('type', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  {['Reforestation', 'Avoided Deforestation', 'Agroforestry', 'Fire Recovery', 'Protected Area Patrol', 'Wetland Restoration'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Country</span>
                <input
                  value={projectSetupDraft.country}
                  onChange={(event) => updateProjectSetupDraft('country', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="United States"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Region / state</span>
                <input
                  value={projectSetupDraft.region}
                  onChange={(event) => updateProjectSetupDraft('region', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Washoe County, Nevada"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Municipality / district</span>
                <input
                  value={projectSetupDraft.municipality}
                  onChange={(event) => updateProjectSetupDraft('municipality', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Gerlach"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Steward / organization</span>
                <input
                  value={projectSetupDraft.stewardName}
                  onChange={(event) => updateProjectSetupDraft('stewardName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Washoe stewardship cooperative"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Community / partner</span>
                <input
                  value={projectSetupDraft.communityName}
                  onChange={(event) => updateProjectSetupDraft('communityName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Regional community partner network"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Boundary hectares</span>
                <input
                  value={projectSetupDraft.hectares}
                  onChange={(event) => updateProjectSetupDraft('hectares', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="64.75"
                  inputMode="decimal"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Polygon / AOI label</span>
                <input
                  value={projectSetupDraft.polygonLabel}
                  onChange={(event) => updateProjectSetupDraft('polygonLabel', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Parcel 040-060-030 A - North block"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Registry target</span>
                <input
                  value={projectSetupDraft.registryTarget}
                  onChange={(event) => updateProjectSetupDraft('registryTarget', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Buyer-ready proof package"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Consent status</span>
                <input
                  value={projectSetupDraft.consentStatus}
                  onChange={(event) => updateProjectSetupDraft('consentStatus', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Attached"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Land rights status</span>
                <input
                  value={projectSetupDraft.landRightsStatus}
                  onChange={(event) => updateProjectSetupDraft('landRightsStatus', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Parcel control docs attached"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Risk level</span>
                <select
                  value={projectSetupDraft.riskLevel}
                  onChange={(event) => updateProjectSetupDraft('riskLevel', event.target.value as RiskLevel)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  {(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Price per credit (USD)</span>
                <input
                  value={projectSetupDraft.pricePerCreditUsd}
                  onChange={(event) => updateProjectSetupDraft('pricePerCreditUsd', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="18"
                  inputMode="decimal"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Expected price range</span>
                <input
                  value={projectSetupDraft.priceRangeUsd}
                  onChange={(event) => updateProjectSetupDraft('priceRangeUsd', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="$12-$20 / credit"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Project narrative</span>
                <textarea
                  value={projectSetupDraft.story}
                  onChange={(event) => updateProjectSetupDraft('story', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Describe what the project protects, restores, or verifies, and why it should become a carbon asset."
                />
              </label>
            </div>

            {projectSetupError ? (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                {projectSetupError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-500">
                We create the project immediately, save it locally in this AFOLU workspace, and route you to the project list.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetProjectSetupModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-500"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={createProject}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </OverlayModal>
      )}

      {activeModal === 'missionBuilder' && (
        <OverlayModal
          title="Carbon Mission Launch"
          subtitle="Deploy a real-world carbon activity that can generate credits when completed and verified."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">Deployment Brief</p>
              <p className="mt-2 text-lg font-black text-white">{missionDeploySummary}</p>
              <p className="mt-2 text-sm text-emerald-50">This mission is expected to generate ~{missionTypeConfig.expectedTco2e} tCO2e if completed successfully.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-[11px]">
              {['Select Mission Type', 'Mission Definition', 'Participants & Roles', 'Verification Requirements', 'Monitoring & Tracking', 'Deploy Mission'].map((step, index) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setMissionBuilderStep(index)}
                  className={`rounded-lg border px-2 py-2 font-bold transition ${missionBuilderStep === index ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-800 bg-slate-950 text-slate-400'}`}
                >
                  {step}
                </button>
              ))}
            </div>

            {missionBuilderStep === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-300">Choose the impact action first. This sets the carbon logic for the mission.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {missionTypeOptions.map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => setSelectedMissionType(option.title)}
                      className={`rounded-xl border p-4 text-left transition ${selectedMissionType === option.title ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}`}
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{option.title}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-300">{option.impactType}</p>
                        </div>
                        <span className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-200">{option.expectedTco2e} tCO2e</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{option.description}</p>
                      <p className="mt-3 text-xs text-slate-400">What this proves: {option.whatThisProves}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {missionBuilderStep === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Mission Name</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionDeploySummary}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Linked Project</p>
                  <p className="mt-1 text-sm font-bold text-white">{selectedProject.name}</p>
                  <p className="mt-2 text-xs text-slate-400">Dropdown-ready project selection anchored to the active carbon project.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Area</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionAreaLabel}</p>
                  <p className="mt-2 text-xs text-slate-400">Map-based area selection will bind the mission to the operating zone and boundary layer.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Target</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionTypeConfig.unitLabel}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Expected Impact</p>
                  <p className="mt-1 text-xl font-black text-white">Estimated: {missionTypeConfig.expectedTco2e} tCO2e</p>
                  <p className="mt-2 text-sm text-emerald-50">Carbon appears early here so the operator understands what this mission is expected to create before it is deployed.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Mission Definition</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionTypeConfig.description}</p>
                </div>
              </div>
            )}

            {missionBuilderStep === 2 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {missionParticipants.map((value, index) => (
                  <div key={value} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{index === 0 ? 'Community members' : index === 1 ? 'Validators' : 'Supervisors'}</p>
                    <p className="mt-1 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Roles</p>
                  <p className="mt-1 text-sm font-bold text-white">Driver · Verifier · Coordinator</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Rewards</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionRewards}</p>
                </div>
              </div>
            )}

            {missionBuilderStep === 3 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Required Photos', '3'],
                  ['GPS Validation', 'YES'],
                  ['Time Window', '24h'],
                  ['Geo Radius', '150 meters'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">What This Proves</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionTypeConfig.whatThisProves}</p>
                </div>
              </div>
            )}

            {missionBuilderStep === 4 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Map Preview</p>
                  <p className="mt-1 text-sm font-bold text-white">Boundary, route, and checkpoint overlay for {selectedProject.name}</p>
                  <p className="mt-2 text-xs text-slate-400">Mission geometry, proof points, and route traces will render here once the deployment is mapped.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Satellite Tracking</p>
                  <p className="mt-1 text-sm font-bold text-white">Enabled</p>
                  <p className="mt-2 text-xs text-slate-400">Attach ongoing remote-sensing review to disturbance, vegetation, or recovery checks.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk Alerts</p>
                  <p className="mt-1 text-sm font-bold text-white">{missionRiskAlerts.join(' · ')}</p>
                </div>
              </div>
            )}

            {missionBuilderStep === 5 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Mission Summary</p>
                  <p className="mt-2 text-lg font-black text-white">{missionDeploySummary}</p>
                  <p className="mt-2 text-sm text-emerald-50">This mission is expected to generate ~{missionTypeConfig.expectedTco2e} tCO2e if completed successfully.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Expected Carbon Impact</p>
                    <p className="mt-1 text-sm font-bold text-white">{missionTypeConfig.expectedTco2e} tCO2e</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Target</p>
                    <p className="mt-1 text-sm font-bold text-white">{missionTypeConfig.unitLabel}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Participants</p>
                    <p className="mt-1 text-sm font-bold text-white">Drivers, verifiers, coordinator</p>
                    <p className="mt-2 text-xs text-slate-400">{missionParticipants.join(' · ')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Proof Rules</p>
                    <p className="mt-1 text-sm font-bold text-white">{missionProofRules.join(', ')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Deployment Outcome</p>
                    <p className="mt-1 text-sm font-bold text-white">Deploying this mission will publish a live carbon operation with incoming submissions, map activity, and verification tracking.</p>
                  </div>
                </div>
                <button
                  onClick={() => runTransition('Deploying mission', () => {
                    setActiveModal(null);
                    setSurfaceView('missionLive');
                  })}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500"
                >
                  🚀 Deploy Mission
                </button>
              </div>
            )}

            {missionBuilderStep < 5 && (
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMissionBuilderStep((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setMissionBuilderStep((prev) => Math.min(5, prev + 1))}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </OverlayModal>
      )}

      {activeModal === 'uploadProof' && (
        <OverlayModal
          title="Upload Proof"
          subtitle="Photos, videos, GPS, and witness materials feed the MRV engine."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {['Select files', 'Use current GPS', 'Attach witness log', 'Review upload batch'].map((item) => (
              <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-white">{item}</div>
            ))}
          </div>
        </OverlayModal>
      )}

      {activeModal === 'dealDetail' && selectedBuyer && (
        <OverlayModal
          title="Deal Detail"
          subtitle={`${selectedBuyer.name} - ${selectedBuyer.interest}`}
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Requested Credits</p>
              <p className="mt-1 text-lg font-black text-white">{selectedBuyer.requestedCredits}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Offer Price</p>
              <p className="mt-1 text-lg font-black text-white">{usd(selectedBuyer.offerPriceUsd)}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-1 text-lg font-black text-white">{selectedBuyer.status}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Last Touch</p>
              <p className="mt-1 text-lg font-black text-white">{selectedBuyer.lastTouch}</p>
            </div>
          </div>
        </OverlayModal>
      )}
    </div>
  );
};

export default AfoluEngineView;
