import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Award, Camera, CheckCircle, Clock, Database,
  FileText, Globe, Map, MapPin, Plus, QrCode, ShieldCheck, Target, Upload, Users,
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
  polygonLabel: string;
  registryTarget: string;
  consentStatus: string;
  landRightsStatus: string;
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
    polygonLabel: '5-point boundary, 500 ha',
    registryTarget: 'Registry support export',
    consentStatus: 'Attached',
    landRightsStatus: 'Community stewardship docs attached',
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
    polygonLabel: '12 parcels, 84 ha',
    registryTarget: 'Buyer-ready proof package',
    consentStatus: 'Attached',
    landRightsStatus: 'Parcel owner attestations attached',
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
    polygonLabel: 'Recovery zones A-D',
    registryTarget: 'Sponsor report',
    consentStatus: 'Attached',
    landRightsStatus: 'County and private agreements attached',
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
    return {
      hectares,
      planted,
      survival,
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
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active Projects" value={String(projects.length)} icon={<Globe className="h-5 w-5" />} />
              <Metric label="Hectares Monitored" value={totals.hectares.toLocaleString()} icon={<Map className="h-5 w-5" />} tone="text-sky-300" />
              <Metric label="Trees Registered" value={totals.planted.toLocaleString()} icon={<Target className="h-5 w-5" />} tone="text-lime-300" />
              <Metric label="Survival Rate" value={`${totals.survival}%`} icon={<Activity className="h-5 w-5" />} tone="text-amber-300" />
              <Metric label="Open Missions" value={String(missions.filter((mission) => !['Verified', 'Closed'].includes(mission.status)).length)} icon={<Clock className="h-5 w-5" />} tone="text-cyan-300" />
              <Metric label="Pending Evidence" value={String(totals.pendingEvidence)} icon={<Upload className="h-5 w-5" />} tone="text-amber-300" />
              <Metric label="Verified Missions" value={String(totals.verifiedMissions)} icon={<CheckCircle className="h-5 w-5" />} tone="text-emerald-300" />
              <Metric label="High-Risk Alerts" value={String(totals.alerts)} icon={<AlertTriangle className="h-5 w-5" />} tone="text-rose-300" />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">Registry-Ready Flow</h2>
                    <p className="mt-1 text-sm text-slate-400">The module separates observed facts from modeled estimates so buyers and validators can trust the record.</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {['Project Setup', 'Activity Logging', 'Monitoring', 'Verification Package', 'Buyer Submission'].map((stage, index) => (
                    <div key={stage} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs font-black text-emerald-300">Stage {index + 1}</p>
                      <p className="mt-2 text-sm font-bold text-white">{stage}</p>
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
                  ['Monitoring Stage', selectedProject.monitoringStage],
                  ['Consent', selectedProject.consentStatus],
                  ['Land Rights', selectedProject.landRightsStatus],
                  ['Registry Target', selectedProject.registryTarget],
                  ['Risk Level', selectedProject.riskLevel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
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
                <Metric label="Missions" value={String(projectMissions.length)} icon={<Target className="h-4 w-4" />} />
                <Metric label="Proof Score" value={`${selectedProject.verificationScore}`} icon={<ShieldCheck className="h-4 w-4" />} />
                <Metric label="Assets" value={String(projectAssets.length)} icon={<Database className="h-4 w-4" />} />
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-black text-white">Sponsorship Options</h2>
              <div className="mt-4 space-y-3">
                {['Sponsor 1 hectare', 'Sponsor monitoring cycle', 'Sponsor nursery batch', 'Sponsor patrol team'].map((option) => (
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
                  'Estimated sequestration: Insufficient Data',
                  'Estimated avoided emissions: Insufficient Data',
                  'Projected biodiversity uplift: Insufficient Data',
                  'Projected watershed benefit: Insufficient Data',
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
