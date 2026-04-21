import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Camera, CheckCircle, Clock, Database,
  FileText, Globe, Map, MapPin, Plus, QrCode, ShieldCheck, Target, Upload, Users, Cloud, Loader, X,
} from './icons';
import ProjectDetailView from './ProjectDetailView';
import MRVResultsView from './MRVResultsView';

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

const AfoluEngineView: React.FC<AfoluEngineViewProps> = ({ onReturn }) => {
  const [activeTab, setActiveTab] = useState<AfoluTab>('home');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const [surfaceView, setSurfaceView] = useState<'dashboard' | 'projectDetail' | 'mrvResults' | 'buyerPackage'>('dashboard');
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'projectSetup' | 'missionBuilder' | 'uploadProof' | 'dealDetail'>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(buyers[0]?.id || null);
  const [selectedPipelineStep, setSelectedPipelineStep] = useState(pipelineSteps[0]);

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
  }, []);

  const qrPayload = {
    asset_id: projectAssets[0]?.assetCode || 'AFT-PLT-00045',
    project_id: selectedProject.id,
    asset_type: projectAssets[0]?.assetType || 'plot',
    region: selectedProject.region,
    status: projectAssets[0]?.status || 'active',
  };

  const selectedProjectBuyers = buyers.filter((buyer) => buyer.projectId === selectedProject.id);
  const spotlightProject = projects[1];
  const buyerInterest = buyers.length;
  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId) || null;

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

  const mrvResultsData = useMemo(() => ({
    projectName: selectedProject.name,
    runDate: selectedProject.mrvLastValidatedAt,
    estimatedTco2e: `${selectedProject.co2CapturedTons.toLocaleString()} t`,
    creditsGenerated: selectedProject.creditsGenerated.toLocaleString(),
    confidenceScore: `${selectedProject.aiVerificationConfidence}%`,
    riskScore: selectedProject.riskLevel,
    vegetationChange: selectedProject.satelliteConfirmed ? 'Yes' : 'No',
    deforestationDetection: selectedProject.riskLevel === 'High' ? 'Localized pressure detected' : 'No active deforestation detected',
    gpsMatchPercentage: '98%',
    boundaryAccuracy: 'High',
    outlierDetection: selectedProject.anomalyStatus,
    photoCount: String(projectEvidence.length * 4),
    coveragePercent: `${Math.min(96, selectedProject.packageCompleteness)}%`,
    consistencyRating: selectedProject.anomalyStatus === 'Clean' ? 'Strong' : 'Moderate',
    fireRisk: selectedProject.type === 'Fire Recovery' ? 'Medium' : 'Low',
    fraudFlags: selectedProject.anomalyStatus === 'Clean' ? '0 active flags' : '1 caution flag',
    missingData: selectedProject.packageCompleteness > 80 ? 'Minor gaps only' : 'Additional evidence needed',
    aiSummary: `MRV review indicates that ${selectedProject.name} has a strong chain of proof across field logs, boundary checks, and satellite trend review. The current package supports ${selectedProject.inventoryAvailable} market-ready credits with ${selectedProject.aiVerificationConfidence}% confidence, subject to final buyer or registry formatting requirements.`,
    verifiedCarbonOutput: `${selectedProject.co2CapturedTons.toLocaleString()} tCO2e`,
    finalCreditsGenerated: selectedProject.inventoryAvailable.toLocaleString(),
    finalConfidence: `${selectedProject.aiVerificationConfidence}%`,
  }), [selectedProject, projectEvidence.length]);

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
              onClick={() => setActiveModal('projectSetup')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Create Project
            </button>
            <button
              onClick={() => setActiveModal('missionBuilder')}
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
                <h2 className="mt-2 text-3xl font-black text-white">This dashboard is the command center for the forestry carbon pipeline.</h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                  DPAL captures real environmental activity, converts that activity into measurable carbon impact through the MRV engine, and prepares it for buyers, registries, and revenue.
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
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Confidence Score</p>
                    <p className="mt-1 text-3xl font-black text-white">{totals.avgVerificationConfidence}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Satellite Review: <span className="font-bold text-emerald-300">Passed</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Geo Match: <span className="font-bold text-white">98%</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Photo Evidence Completeness: <span className="font-bold text-white">87%</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Field Log Consistency: <span className="font-bold text-white">Strong</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                    Risk Flags: <span className="font-bold text-white">1</span>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                    Latest engine note: Project area shows stable canopy recovery and consistent field evidence across submitted plots.
                  </div>
                </div>
              </Card>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active Projects" value={String(projects.length)} icon={<Globe className="h-5 w-5" />} onClick={() => setActiveTab('projects')} />
              <Metric label="Hectares Monitored" value={totals.hectares.toLocaleString()} icon={<Map className="h-5 w-5" />} tone="text-cyan-300" onClick={() => setActiveTab('projects')} />
              <Metric label="Estimated tCO2e" value={totals.co2Captured.toLocaleString()} icon={<Cloud className="h-5 w-5" />} tone="text-sky-300" onClick={() => runTransition('Opening project carbon detail', () => setSurfaceView('projectDetail'))} />
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
                    <p className="mt-1 text-sm text-slate-400">This is where environmental work becomes a verified carbon asset.</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {pipelineSteps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setSelectedPipelineStep(step)}
                      className={`rounded-lg border bg-slate-950 p-3 text-left transition hover:border-emerald-500 ${selectedPipelineStep.title === step.title ? 'border-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.15)]' : 'border-slate-800'}`}
                    >
                      <p className="text-xs font-black text-emerald-300">Stage {index + 1}</p>
                      <p className="mt-2 text-sm font-bold text-white">{step.title}</p>
                      <p className="mt-2 text-xs text-slate-400">{step.detail}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Drill-down</p>
                  <p className="mt-2 text-lg font-black text-white">{selectedPipelineStep.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedPipelineStep.detail}</p>
                  <p className="mt-3 text-xs text-emerald-200">Open pipeline stages to inspect how raw activity moves toward packaged credits and buyer submission.</p>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Credit-Creating Missions</h2>
                <p className="mt-1 text-sm text-slate-400">These are not generic tasks. They are the activity layer that feeds carbon creation and confidence.</p>
                <div className="mt-4 space-y-3">
                  {[
                    ['Plant Trees', 'Generates new sequestration records through planting and survival tracking.'],
                    ['Patrol Protected Area', 'Supports avoided deforestation claims with geo-tagged field presence and incident reporting.'],
                    ['Verify Sample Plot', 'Improves confidence in biomass estimates through plot-level checks.'],
                  ].map(([template, detail]) => (
                    <div key={template} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-emerald-300" />
                      <span className="text-sm font-bold text-white">{template}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h2 className="text-lg font-black text-white">Project Spotlight: Bolivia Forest Recovery Pilot</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Region</span><p className="mt-1 text-sm font-bold text-white">Santa Cruz / Amazon fringe</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Area</span><p className="mt-1 text-sm font-bold text-white">120 hectares</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Trees Registered</span><p className="mt-1 text-sm font-bold text-white">2,400</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Estimated tCO2e</span><p className="mt-1 text-sm font-bold text-white">810</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Verification Confidence</span><p className="mt-1 text-sm font-bold text-white">93%</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Buyer Status</span><p className="mt-1 text-sm font-bold text-white">Pre-marketing</p></div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Buyer Readiness</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Package Completeness</span><p className="mt-1 text-sm font-bold text-white">{selectedProject.packageCompleteness}%</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Registry Format Readiness</span><p className="mt-1 text-sm font-bold text-white">In progress</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Supporting Evidence Files</span><p className="mt-1 text-sm font-bold text-white">{selectedProject.evidenceFiles}</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Verified Project Maps</span><p className="mt-1 text-sm font-bold text-white">{selectedProject.verifiedProjectMaps}</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Available Lots</span><p className="mt-1 text-sm font-bold text-white">{selectedProject.availableLots}</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[11px] uppercase tracking-wide text-slate-500">Expected Price Range</span><p className="mt-1 text-sm font-bold text-white">{selectedProject.priceRangeUsd}</p></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-5 text-[11px]">
                  {['Documentation', 'Impact model', 'Validation', 'Packaging', 'Submission'].map((step) => (
                    <div key={step} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-center font-bold text-emerald-100">{step}</div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h2 className="text-lg font-black text-white">Revenue Model</h2>
                <div className="mt-4 space-y-3">
                  {[
                    'MRV platform fees',
                    'Credit issuance and packaging fees',
                    'Marketplace transaction fees',
                    'Enterprise monitoring subscriptions',
                    'Validator tools and reporting services',
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-black text-emerald-300">{index + 1}</div>
                      <p className="text-sm text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-300">DPAL monetizes environmental verification, carbon packaging, and marketplace participation.</p>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Buyer Marketplace Preview</h2>
                <div className="mt-4 space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => runTransition('Opening project detail', () => {
                        setSelectedProjectId(project.id);
                        setSurfaceView('projectDetail');
                      })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-emerald-500 hover:shadow-[0_0_18px_rgba(16,185,129,0.12)]"
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
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h2 className="text-lg font-black text-white">MRV Intelligence</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Verification Confidence</p>
                    <p className="mt-1 text-3xl font-black text-white">{totals.avgVerificationConfidence}%</p>
                  </div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Satellite Validation</p>
                    <p className="mt-1 text-3xl font-black text-white">YES</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk Scoring</p>
                    <p className="mt-1 text-sm font-bold text-white">Active across canopy, survival, and boundary disturbance</p>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Fraud / Anomaly Flags</p>
                    <p className="mt-1 text-sm font-bold text-white">{projects.filter((project) => project.anomalyStatus !== 'Clean').length} projects require attention</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-black text-white">Buyer Pipeline</h2>
                <div className="mt-4 space-y-3">
                  {buyers.map((buyer) => (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => {
                        setSelectedBuyerId(buyer.id);
                        setActiveModal('dealDetail');
                      }}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-emerald-500 hover:shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{buyer.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{buyer.buyerType} - {buyer.interest}</p>
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

      {activeModal === 'projectSetup' && (
        <OverlayModal
          title="Project Setup Wizard"
          subtitle="Define land, governance, boundaries, and registry target."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {['Project name', 'Project type', 'Region / municipality', 'Steward / organization', 'Polygon map', 'Consent and rights docs'].map((field) => (
              <div key={field} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white">{field}</div>
            ))}
          </div>
        </OverlayModal>
      )}

      {activeModal === 'missionBuilder' && (
        <OverlayModal
          title="Mission Builder"
          subtitle="Create carbon-relevant missions with proof rules and assignment logic."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-3">
            {['Mission basics', 'Assignment', 'Proof rules', 'Monitoring link', 'Publish or schedule'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-black text-emerald-300">{index + 1}</div>
                <span className="text-sm font-bold text-white">{step}</span>
              </div>
            ))}
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
