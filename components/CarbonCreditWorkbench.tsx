import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Award, Cloud, Cpu, Database, Droplets, Globe, Map,
  MapPin, ShieldCheck, Target, Upload, Users, Waves,
} from './icons';

type WorkbenchTab = 'builder' | 'portfolio' | 'logic';

export type CategoryId =
  | 'afolu'
  | 'water'
  | 'energy'
  | 'agri'
  | 'industry'
  | 'waste'
  | 'mobility'
  | 'fire'
  | 'urban'
  | 'cooking'
  | 'livestock'
  | 'marine'
  | 'cooling'
  | 'digital'
  | 'biobased'
  | 'disaster'
  | 'community';

type Methodology = 'removal' | 'avoidance' | 'co-benefit';

interface ProjectTemplate {
  name: string;
  methodology: Methodology;
  unitLabel: string;
  defaultQuantity: number;
  factor: number;
  permanence: number;
  leakage: number;
  uncertainty: number;
  verifier: number;
  price: number;
}

interface CategoryDefinition {
  id: CategoryId;
  name: string;
  icon: React.FC<{ className?: string }>;
  accentClass: string;
  surfaceClass: string;
  projects: ProjectTemplate[];
}

interface CarbonCreditWorkbenchProps {
  onLaunchMission?: () => void;
  onRunMrv?: () => void;
  onPreparePackage?: () => void;
  initialCategoryId?: CategoryId;
}

const categories: CategoryDefinition[] = [
  {
    id: 'afolu',
    name: 'AFOLU',
    icon: Globe,
    accentClass: 'text-emerald-300',
    surfaceClass: 'border-emerald-500/30 bg-emerald-500/10',
    projects: [
      { name: 'Reforestation', methodology: 'removal', unitLabel: 'trees', defaultQuantity: 1000, factor: 0.015, permanence: 0.9, leakage: 0.95, uncertainty: 0.9, verifier: 0.95, price: 14 },
      { name: 'Avoided Deforestation', methodology: 'avoidance', unitLabel: 'hectares protected', defaultQuantity: 100, factor: 5.5, permanence: 0.92, leakage: 0.88, uncertainty: 0.9, verifier: 0.95, price: 16 },
      { name: 'Agroforestry', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 50, factor: 2.8, permanence: 0.88, leakage: 0.95, uncertainty: 0.9, verifier: 0.95, price: 13 },
      { name: 'Indigenous Land Protection', methodology: 'avoidance', unitLabel: 'hectares monitored', defaultQuantity: 200, factor: 3.9, permanence: 0.94, leakage: 0.9, uncertainty: 0.9, verifier: 0.96, price: 18 },
    ],
  },
  {
    id: 'water',
    name: 'Water & Blue Carbon',
    icon: Droplets,
    accentClass: 'text-cyan-300',
    surfaceClass: 'border-cyan-500/30 bg-cyan-500/10',
    projects: [
      { name: 'Wetland Restoration', methodology: 'removal', unitLabel: 'hectares restored', defaultQuantity: 25, factor: 6.2, permanence: 0.9, leakage: 0.95, uncertainty: 0.88, verifier: 0.94, price: 20 },
      { name: 'River Cleanup', methodology: 'co-benefit', unitLabel: 'km cleaned', defaultQuantity: 10, factor: 1.1, permanence: 0.75, leakage: 0.98, uncertainty: 0.75, verifier: 0.9, price: 8 },
      { name: 'Mangrove Restoration', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 20, factor: 10.5, permanence: 0.92, leakage: 0.95, uncertainty: 0.9, verifier: 0.95, price: 24 },
      { name: 'Water Purification Systems', methodology: 'avoidance', unitLabel: 'systems installed', defaultQuantity: 100, factor: 0.4, permanence: 0.8, leakage: 1, uncertainty: 0.82, verifier: 0.9, price: 9 },
    ],
  },
  {
    id: 'energy',
    name: 'Renewable Energy',
    icon: ShieldCheck,
    accentClass: 'text-amber-300',
    surfaceClass: 'border-amber-500/30 bg-amber-500/10',
    projects: [
      { name: 'Solar Installations', methodology: 'avoidance', unitLabel: 'MWh generated', defaultQuantity: 1000, factor: 0.42, permanence: 1, leakage: 1, uncertainty: 0.97, verifier: 0.98, price: 11 },
      { name: 'Wind Systems', methodology: 'avoidance', unitLabel: 'MWh generated', defaultQuantity: 1500, factor: 0.45, permanence: 1, leakage: 1, uncertainty: 0.97, verifier: 0.98, price: 11 },
      { name: 'Micro-Hydro', methodology: 'avoidance', unitLabel: 'MWh generated', defaultQuantity: 900, factor: 0.46, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.97, price: 12 },
      { name: 'Off-grid Electrification', methodology: 'avoidance', unitLabel: 'households', defaultQuantity: 300, factor: 0.8, permanence: 0.9, leakage: 1, uncertainty: 0.9, verifier: 0.95, price: 12 },
    ],
  },
  {
    id: 'agri',
    name: 'Regenerative Agriculture',
    icon: Activity,
    accentClass: 'text-lime-300',
    surfaceClass: 'border-lime-500/30 bg-lime-500/10',
    projects: [
      { name: 'No-Till Farming', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 100, factor: 1.2, permanence: 0.84, leakage: 0.96, uncertainty: 0.82, verifier: 0.9, price: 10 },
      { name: 'Organic Soil Restoration', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 80, factor: 1.7, permanence: 0.86, leakage: 0.96, uncertainty: 0.84, verifier: 0.9, price: 11 },
      { name: 'Biochar Use', methodology: 'removal', unitLabel: 'tons applied', defaultQuantity: 50, factor: 2.5, permanence: 0.93, leakage: 0.97, uncertainty: 0.9, verifier: 0.95, price: 18 },
      { name: 'Crop Rotation', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 100, factor: 0.9, permanence: 0.82, leakage: 0.98, uncertainty: 0.8, verifier: 0.88, price: 9 },
    ],
  },
  {
    id: 'industry',
    name: 'Industrial Reduction',
    icon: Database,
    accentClass: 'text-slate-200',
    surfaceClass: 'border-slate-500/30 bg-slate-500/10',
    projects: [
      { name: 'Carbon Capture Systems', methodology: 'removal', unitLabel: 'tCO2 captured', defaultQuantity: 500, factor: 1, permanence: 0.95, leakage: 0.98, uncertainty: 0.92, verifier: 0.97, price: 35 },
      { name: 'Energy Efficiency Upgrades', methodology: 'avoidance', unitLabel: 'MWh saved', defaultQuantity: 600, factor: 0.4, permanence: 1, leakage: 1, uncertainty: 0.96, verifier: 0.97, price: 10 },
      { name: 'Cleaner Production', methodology: 'avoidance', unitLabel: 'tons output adjusted', defaultQuantity: 400, factor: 0.6, permanence: 0.95, leakage: 1, uncertainty: 0.9, verifier: 0.95, price: 13 },
    ],
  },
  {
    id: 'waste',
    name: 'Waste & Methane',
    icon: Upload,
    accentClass: 'text-emerald-300',
    surfaceClass: 'border-emerald-500/30 bg-emerald-500/10',
    projects: [
      { name: 'Landfill Methane Capture', methodology: 'avoidance', unitLabel: 'tCO2e captured', defaultQuantity: 1000, factor: 1, permanence: 0.97, leakage: 0.98, uncertainty: 0.95, verifier: 0.98, price: 17 },
      { name: 'Composting Programs', methodology: 'avoidance', unitLabel: 'tons organic waste', defaultQuantity: 500, factor: 0.28, permanence: 0.85, leakage: 0.98, uncertainty: 0.85, verifier: 0.9, price: 9 },
      { name: 'Waste-to-Energy', methodology: 'avoidance', unitLabel: 'MWh equivalent', defaultQuantity: 700, factor: 0.5, permanence: 1, leakage: 1, uncertainty: 0.92, verifier: 0.96, price: 12 },
    ],
  },
  {
    id: 'mobility',
    name: 'Transport & Mobility',
    icon: MapPin,
    accentClass: 'text-blue-300',
    surfaceClass: 'border-blue-500/30 bg-blue-500/10',
    projects: [
      { name: 'EV Fleets', methodology: 'avoidance', unitLabel: 'vehicle-km', defaultQuantity: 100000, factor: 0.00012, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.96, price: 9 },
      { name: 'Ride-Sharing Optimization', methodology: 'avoidance', unitLabel: 'shared rides', defaultQuantity: 10000, factor: 0.008, permanence: 1, leakage: 1, uncertainty: 0.88, verifier: 0.9, price: 8 },
      { name: 'Bike Systems', methodology: 'avoidance', unitLabel: 'rides', defaultQuantity: 15000, factor: 0.003, permanence: 1, leakage: 1, uncertainty: 0.85, verifier: 0.88, price: 7 },
      { name: 'Delivery Route Efficiency', methodology: 'avoidance', unitLabel: 'deliveries optimized', defaultQuantity: 12000, factor: 0.004, permanence: 1, leakage: 1, uncertainty: 0.9, verifier: 0.9, price: 8 },
    ],
  },
  {
    id: 'fire',
    name: 'Fire Prevention',
    icon: AlertTriangle,
    accentClass: 'text-orange-300',
    surfaceClass: 'border-orange-500/30 bg-orange-500/10',
    projects: [
      { name: 'Fire Patrol Missions', methodology: 'avoidance', unitLabel: 'hectares protected', defaultQuantity: 300, factor: 2.2, permanence: 0.88, leakage: 0.9, uncertainty: 0.82, verifier: 0.9, price: 14 },
      { name: 'Early Detection Systems', methodology: 'avoidance', unitLabel: 'zones monitored', defaultQuantity: 100, factor: 1.4, permanence: 0.9, leakage: 0.95, uncertainty: 0.84, verifier: 0.92, price: 13 },
      { name: 'Post-Fire Restoration', methodology: 'removal', unitLabel: 'hectares restored', defaultQuantity: 50, factor: 4.5, permanence: 0.86, leakage: 0.96, uncertainty: 0.82, verifier: 0.9, price: 13 },
    ],
  },
  {
    id: 'urban',
    name: 'Urban Carbon',
    icon: Map,
    accentClass: 'text-violet-300',
    surfaceClass: 'border-violet-500/30 bg-violet-500/10',
    projects: [
      { name: 'Urban Tree Corridors', methodology: 'removal', unitLabel: 'trees', defaultQuantity: 500, factor: 0.012, permanence: 0.85, leakage: 1, uncertainty: 0.85, verifier: 0.9, price: 12 },
      { name: 'Cool Roofs', methodology: 'avoidance', unitLabel: 'buildings', defaultQuantity: 200, factor: 0.18, permanence: 0.95, leakage: 1, uncertainty: 0.88, verifier: 0.92, price: 10 },
      { name: 'LED Street Lighting', methodology: 'avoidance', unitLabel: 'lights upgraded', defaultQuantity: 1000, factor: 0.05, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.96, price: 9 },
    ],
  },
  {
    id: 'cooking',
    name: 'Clean Cooking',
    icon: Target,
    accentClass: 'text-rose-300',
    surfaceClass: 'border-rose-500/30 bg-rose-500/10',
    projects: [
      { name: 'Efficient Cookstoves', methodology: 'avoidance', unitLabel: 'households', defaultQuantity: 300, factor: 1.5, permanence: 0.88, leakage: 0.98, uncertainty: 0.84, verifier: 0.9, price: 11 },
      { name: 'Biogas Digesters', methodology: 'avoidance', unitLabel: 'digesters', defaultQuantity: 100, factor: 2.4, permanence: 0.9, leakage: 0.98, uncertainty: 0.88, verifier: 0.92, price: 13 },
      { name: 'Solar Cooking', methodology: 'avoidance', unitLabel: 'systems', defaultQuantity: 150, factor: 0.7, permanence: 0.85, leakage: 1, uncertainty: 0.82, verifier: 0.88, price: 9 },
    ],
  },
  {
    id: 'livestock',
    name: 'Livestock Methane',
    icon: Users,
    accentClass: 'text-amber-300',
    surfaceClass: 'border-amber-500/30 bg-amber-500/10',
    projects: [
      { name: 'Feed Additives', methodology: 'avoidance', unitLabel: 'cattle', defaultQuantity: 1000, factor: 0.3, permanence: 0.9, leakage: 1, uncertainty: 0.88, verifier: 0.92, price: 14 },
      { name: 'Manure Management', methodology: 'avoidance', unitLabel: 'farms', defaultQuantity: 100, factor: 4.2, permanence: 0.92, leakage: 0.98, uncertainty: 0.9, verifier: 0.94, price: 15 },
      { name: 'Rotational Grazing', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 250, factor: 1.1, permanence: 0.84, leakage: 0.97, uncertainty: 0.82, verifier: 0.9, price: 11 },
    ],
  },
  {
    id: 'marine',
    name: 'Marine Carbon',
    icon: Waves,
    accentClass: 'text-sky-300',
    surfaceClass: 'border-sky-500/30 bg-sky-500/10',
    projects: [
      { name: 'Seaweed Farming', methodology: 'removal', unitLabel: 'hectares', defaultQuantity: 20, factor: 12, permanence: 0.8, leakage: 0.96, uncertainty: 0.8, verifier: 0.9, price: 22 },
      { name: 'Coastal Ecosystem Protection', methodology: 'avoidance', unitLabel: 'hectares', defaultQuantity: 50, factor: 7.5, permanence: 0.9, leakage: 0.92, uncertainty: 0.86, verifier: 0.93, price: 21 },
      { name: 'Coral Restoration', methodology: 'co-benefit', unitLabel: 'reef plots', defaultQuantity: 40, factor: 0.8, permanence: 0.7, leakage: 1, uncertainty: 0.7, verifier: 0.85, price: 8 },
    ],
  },
  {
    id: 'cooling',
    name: 'Cooling & Refrigerants',
    icon: Cloud,
    accentClass: 'text-indigo-300',
    surfaceClass: 'border-indigo-500/30 bg-indigo-500/10',
    projects: [
      { name: 'AC Replacement', methodology: 'avoidance', unitLabel: 'units replaced', defaultQuantity: 500, factor: 0.65, permanence: 0.95, leakage: 1, uncertainty: 0.92, verifier: 0.95, price: 13 },
      { name: 'Refrigerant Recovery', methodology: 'avoidance', unitLabel: 'kg recovered', defaultQuantity: 2000, factor: 0.0025, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.98, price: 18 },
      { name: 'Cold Storage Efficiency', methodology: 'avoidance', unitLabel: 'MWh saved', defaultQuantity: 400, factor: 0.42, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.96, price: 11 },
    ],
  },
  {
    id: 'digital',
    name: 'Digital Efficiency',
    icon: Cpu,
    accentClass: 'text-fuchsia-300',
    surfaceClass: 'border-fuchsia-500/30 bg-fuchsia-500/10',
    projects: [
      { name: 'Cloud Optimization', methodology: 'avoidance', unitLabel: 'MWh saved', defaultQuantity: 250, factor: 0.4, permanence: 1, leakage: 1, uncertainty: 0.95, verifier: 0.97, price: 9 },
      { name: 'Data Center Efficiency', methodology: 'avoidance', unitLabel: 'MWh saved', defaultQuantity: 600, factor: 0.4, permanence: 1, leakage: 1, uncertainty: 0.96, verifier: 0.98, price: 10 },
      { name: 'AI Compute Optimization', methodology: 'avoidance', unitLabel: 'GPU-hours avoided', defaultQuantity: 10000, factor: 0.00018, permanence: 1, leakage: 1, uncertainty: 0.88, verifier: 0.93, price: 8 },
    ],
  },
  {
    id: 'biobased',
    name: 'Bio-Based Materials',
    icon: Award,
    accentClass: 'text-teal-300',
    surfaceClass: 'border-teal-500/30 bg-teal-500/10',
    projects: [
      { name: 'Bioplastic Replacement', methodology: 'avoidance', unitLabel: 'tons material', defaultQuantity: 100, factor: 1.8, permanence: 0.95, leakage: 1, uncertainty: 0.9, verifier: 0.94, price: 12 },
      { name: 'Hemp Materials', methodology: 'removal', unitLabel: 'tons product', defaultQuantity: 80, factor: 2.1, permanence: 0.9, leakage: 0.98, uncertainty: 0.88, verifier: 0.93, price: 14 },
      { name: 'Sustainable Packaging', methodology: 'avoidance', unitLabel: 'tons packaging', defaultQuantity: 120, factor: 0.9, permanence: 0.95, leakage: 1, uncertainty: 0.9, verifier: 0.92, price: 10 },
    ],
  },
  {
    id: 'disaster',
    name: 'Disaster Prevention',
    icon: AlertTriangle,
    accentClass: 'text-red-300',
    surfaceClass: 'border-red-500/30 bg-red-500/10',
    projects: [
      { name: 'Flood Prevention', methodology: 'avoidance', unitLabel: 'zones protected', defaultQuantity: 50, factor: 3.5, permanence: 0.85, leakage: 0.95, uncertainty: 0.8, verifier: 0.9, price: 14 },
      { name: 'Drought Mitigation', methodology: 'avoidance', unitLabel: 'hectares safeguarded', defaultQuantity: 100, factor: 1.3, permanence: 0.84, leakage: 0.95, uncertainty: 0.78, verifier: 0.88, price: 11 },
      { name: 'Landslide Prevention', methodology: 'avoidance', unitLabel: 'slopes stabilized', defaultQuantity: 40, factor: 2.1, permanence: 0.87, leakage: 0.96, uncertainty: 0.8, verifier: 0.9, price: 12 },
    ],
  },
  {
    id: 'community',
    name: 'Community Behavior',
    icon: Users,
    accentClass: 'text-pink-300',
    surfaceClass: 'border-pink-500/30 bg-pink-500/10',
    projects: [
      { name: 'Household Energy Reduction', methodology: 'avoidance', unitLabel: 'households', defaultQuantity: 500, factor: 0.35, permanence: 0.8, leakage: 1, uncertainty: 0.75, verifier: 0.85, price: 7 },
      { name: 'Water Conservation', methodology: 'avoidance', unitLabel: 'participants', defaultQuantity: 1000, factor: 0.08, permanence: 0.8, leakage: 1, uncertainty: 0.72, verifier: 0.82, price: 6 },
      { name: 'Recycling Participation', methodology: 'avoidance', unitLabel: 'participants', defaultQuantity: 1200, factor: 0.05, permanence: 0.8, leakage: 1, uncertainty: 0.7, verifier: 0.8, price: 6 },
    ],
  },
];

function scoreBand(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: 'Institutional Grade', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' };
  if (score >= 70) return { label: 'Strong', tone: 'border-sky-500/30 bg-sky-500/10 text-sky-100' };
  if (score >= 55) return { label: 'Pilot Ready', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-100' };
  return { label: 'Needs More Proof', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-100' };
}

function methodologyClass(methodology: Methodology): string {
  if (methodology === 'removal') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (methodology === 'avoidance') return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100';
}

function uiPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const WorkbenchCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_0_24px_rgba(15,23,42,0.25)] ${className}`}>
    {children}
  </section>
);

const MetricTile: React.FC<{ label: string; value: string; detail?: string; className?: string }> = ({ label, value, detail, className = '' }) => (
  <div className={`rounded-2xl border border-slate-800 bg-slate-950 p-4 ${className}`}>
    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black text-white">{value}</p>
    {detail && <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>}
  </div>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  setValue: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, setValue, min = 0.5, max = 1, step = 0.01 }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{uiPct(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => setValue(Number(event.target.value))}
      className="w-full accent-emerald-400"
    />
  </div>
);

const CarbonCreditWorkbench: React.FC<CarbonCreditWorkbenchProps> = ({
  onLaunchMission,
  onRunMrv,
  onPreparePackage,
  initialCategoryId,
}) => {
  const [tab, setTab] = useState<WorkbenchTab>('builder');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>(initialCategoryId ?? 'afolu');
  const activeCategory = categories.find((category) => category.id === categoryId) || categories[0];
  const [projectName, setProjectName] = useState(activeCategory.projects[0].name);
  const activeProject = activeCategory.projects.find((project) => project.name === projectName) || activeCategory.projects[0];
  const [quantity, setQuantity] = useState(activeProject.defaultQuantity);
  const [price, setPrice] = useState(activeProject.price);
  const [additionality, setAdditionality] = useState(0.9);
  const [buffer, setBuffer] = useState(0.15);
  const [community, setCommunity] = useState(0.92);
  const [monitoring, setMonitoring] = useState(0.9);
  const [coBenefits, setCoBenefits] = useState(0.08);

  useEffect(() => {
    const nextCategory = categories.find((category) => category.id === categoryId) || categories[0];
    const stillExists = nextCategory.projects.some((project) => project.name === projectName);
    if (!stillExists) {
      setProjectName(nextCategory.projects[0].name);
      setQuantity(nextCategory.projects[0].defaultQuantity);
      setPrice(nextCategory.projects[0].price);
    }
  }, [categoryId, projectName]);

  useEffect(() => {
    setQuantity(activeProject.defaultQuantity);
    setPrice(activeProject.price);
  }, [activeProject]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories.filter((category) => (
      category.name.toLowerCase().includes(query)
      || category.projects.some((project) => project.name.toLowerCase().includes(query))
    ));
  }, [search]);

  const calculations = useMemo(() => {
    const baseCredits = quantity * activeProject.factor;
    const qualityMultiplier = activeProject.permanence
      * activeProject.leakage
      * activeProject.uncertainty
      * activeProject.verifier
      * additionality
      * community
      * monitoring;
    const issuedBeforeBuffer = baseCredits * qualityMultiplier;
    const bufferReserve = issuedBeforeBuffer * buffer;
    const issuableCredits = Math.max(issuedBeforeBuffer - bufferReserve, 0);
    const coBenefitPremiumCredits = issuableCredits * coBenefits;
    const totalEconomicCredits = issuableCredits + coBenefitPremiumCredits;
    const projectedRevenue = totalEconomicCredits * price;
    const integrityScore = Math.round(((
      activeProject.permanence
      + activeProject.leakage
      + activeProject.uncertainty
      + activeProject.verifier
      + additionality
      + community
      + monitoring
    ) / 7) * 100);
    const perUnitIssuableCredits = quantity > 0 ? issuableCredits / quantity : 0;
    const perUnitRevenue = quantity > 0 ? projectedRevenue / quantity : 0;
    const actionCreditValue = perUnitIssuableCredits * price;

    return {
      baseCredits,
      qualityMultiplier,
      issuedBeforeBuffer,
      bufferReserve,
      issuableCredits,
      coBenefitPremiumCredits,
      totalEconomicCredits,
      projectedRevenue,
      integrityScore,
      perUnitIssuableCredits,
      perUnitRevenue,
      actionCreditValue,
    };
  }, [activeProject, additionality, buffer, community, monitoring, coBenefits, price, quantity]);

  const band = scoreBand(calculations.integrityScore);
  const CategoryIcon = activeCategory.icon;

  const portfolioSummary = useMemo(() => categories.map((category) => {
    const potentialCredits = category.projects.reduce((sum, project) => {
      const rough = project.defaultQuantity
        * project.factor
        * project.permanence
        * project.leakage
        * project.uncertainty
        * project.verifier
        * 0.9
        * 0.92
        * 0.9;
      return sum + rough * (1 - 0.15);
    }, 0);

    return {
      category: category.name,
      projects: category.projects.length,
      potentialCredits,
    };
  }), []);

  const projectActionRows = useMemo(() => activeCategory.projects.map((project) => {
    const raw = project.defaultQuantity * project.factor;
    const multiplier = project.permanence * project.leakage * project.uncertainty * project.verifier * 0.9 * 0.92 * 0.9;
    const issuable = raw * multiplier * (1 - 0.15);
    return {
      name: project.name,
      methodology: project.methodology,
      unitLabel: project.unitLabel,
      perUnitCredits: issuable / Math.max(project.defaultQuantity, 1),
      defaultIssuable: issuable,
      price: project.price,
      revenue: issuable * project.price,
    };
  }), [activeCategory.projects]);

  return (
    <div className="space-y-6">
      <WorkbenchCard className="border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl border p-3 ${activeCategory.surfaceClass}`}>
                <CategoryIcon className={`h-6 w-6 ${activeCategory.accentClass}`} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Carbon Credit Workbench</p>
                <h2 className="mt-1 text-3xl font-black text-white">Design the carbon asset and calculate what each action can earn.</h2>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              This engine lets DPAL price and qualify AFOLU and adjacent climate actions using one conservative framework:
              convert measured activity into base carbon output, then discount it for risk, proof quality, and long-term monitoring before any credits are treated as issuable.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onLaunchMission} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
                Launch Mission
              </button>
              <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500">
                Run MRV Review
              </button>
              <button onClick={onPreparePackage} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-100 transition hover:border-emerald-500">
                Prepare Buyer Package
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <MetricTile label="Issuable Credits" value={calculations.issuableCredits.toFixed(2)} detail="Post-buffer credits supported by the current quality stack." />
            <MetricTile label="Projected Revenue" value={`$${calculations.projectedRevenue.toFixed(0)}`} detail="Economic value after co-benefit premium and market price." />
            <MetricTile label="Per Action Credit Yield" value={calculations.perUnitIssuableCredits.toFixed(4)} detail={`Issuable credits per ${activeProject.unitLabel.slice(0, -1) || activeProject.unitLabel}.`} />
            <MetricTile label="Per Action Revenue" value={`$${calculations.perUnitRevenue.toFixed(2)}`} detail="Illustrative revenue earned per measured unit of action." />
          </div>
        </div>
      </WorkbenchCard>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <WorkbenchCard>
          <div className="flex flex-wrap gap-2">
            {([
              ['builder', 'Project Builder'],
              ['portfolio', 'Portfolio Categories'],
              ['logic', 'Credit Logic'],
            ] as Array<[WorkbenchTab, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  tab === value
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </WorkbenchCard>

        <WorkbenchCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Integrity Overview</p>
              <p className="mt-1 text-3xl font-black text-white">{calculations.integrityScore}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${band.tone}`}>{band.label}</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-slate-800">
            <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${calculations.integrityScore}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Quality Multiplier" value={calculations.qualityMultiplier.toFixed(3)} />
            <MetricTile label="Buffer Reserve" value={uiPct(buffer)} />
          </div>
        </WorkbenchCard>
      </div>

      {tab === 'builder' && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <WorkbenchCard>
            <h3 className="text-lg font-black text-white">Categories</h3>
            <div className="mt-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search category or project"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>
            <div className="mt-4 max-h-[540px] space-y-2 overflow-auto pr-1">
              {filteredCategories.map((category) => {
                const Icon = category.icon;
                const active = category.id === categoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_18px_rgba(16,185,129,0.12)]'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className={`rounded-xl border p-2 ${active ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100' : category.surfaceClass}`}>
                      <Icon className={`h-4 w-4 ${active ? 'text-emerald-100' : category.accentClass}`} />
                    </div>
                    <div>
                      <p className="font-bold">{category.name}</p>
                      <p className={`text-xs ${active ? 'text-emerald-100/80' : 'text-slate-500'}`}>{category.projects.length} project types</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </WorkbenchCard>

          <div className="space-y-6">
            <WorkbenchCard>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-black text-white">Project Setup</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="text-sm font-bold text-slate-300">Category</label>
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value as CategoryId)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-300">Project Type</label>
                  <select
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    {activeCategory.projects.map((project) => (
                      <option key={project.name} value={project.name}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-300">Measured Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-300">Market Price / Credit ($)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(Number(event.target.value) || 0)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </WorkbenchCard>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <WorkbenchCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-white">{activeProject.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">Calibrate how much each action earns after quality discounts, reserve buffer, and co-benefit premium.</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${methodologyClass(activeProject.methodology)}`}>
                    {activeProject.methodology}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricTile label="Input Unit" value={activeProject.unitLabel} />
                  <MetricTile label="Base Factor" value={`${activeProject.factor} tCO2e / unit`} />
                  <MetricTile label="Default Price" value={`$${activeProject.price}`} />
                  <MetricTile label="Verifier" value={uiPct(activeProject.verifier)} />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SliderField label="Additionality" value={additionality} setValue={setAdditionality} />
                  <SliderField label="Community Trust" value={community} setValue={setCommunity} />
                  <SliderField label="Monitoring Strength" value={monitoring} setValue={setMonitoring} />
                  <SliderField label="Buffer Reserve" value={buffer} setValue={setBuffer} min={0.01} max={0.4} />
                  <SliderField label="Co-Benefit Premium" value={coBenefits} setValue={setCoBenefits} min={0} max={0.3} />
                </div>

                <div className="mt-5 rounded-3xl bg-slate-950 p-5">
                  <h4 className="text-lg font-black text-white">Calculation Output</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Base Credits" value={calculations.baseCredits.toFixed(2)} className="bg-white/5" />
                    <MetricTile label="Pre-Buffer Credits" value={calculations.issuedBeforeBuffer.toFixed(2)} className="bg-white/5" />
                    <MetricTile label="Issuable Credits" value={calculations.issuableCredits.toFixed(2)} className="bg-white/5" />
                    <MetricTile label="Projected Revenue" value={`$${calculations.projectedRevenue.toFixed(0)}`} className="bg-white/5" />
                  </div>
                </div>
              </WorkbenchCard>

              <WorkbenchCard>
                <h3 className="text-lg font-black text-white">How Much Each Action Earns</h3>
                <div className="mt-4 space-y-3">
                  <MetricTile label={`Credits per ${activeProject.unitLabel.slice(0, -1) || activeProject.unitLabel}`} value={calculations.perUnitIssuableCredits.toFixed(4)} detail="Net issuable credit output for each unit of measured action." />
                  <MetricTile label="Revenue per Action" value={`$${calculations.perUnitRevenue.toFixed(2)}`} detail="Illustrative market value earned per measured unit." />
                  <MetricTile label="Credit Value per Action" value={`$${calculations.actionCreditValue.toFixed(2)}`} detail="Per-action economic value before additional pricing overlays." />
                  <MetricTile label="Co-Benefit Premium" value={calculations.coBenefitPremiumCredits.toFixed(2)} detail="Extra credits added for ecosystem or social upside." />
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-300">
                  {[
                    '1. Report submitted or mission launched',
                    '2. Geo, photo, sensor, or meter evidence collected',
                    '3. Baseline established',
                    '4. Emission reduction or removal factor applied',
                    '5. Risk discounts applied',
                    '6. Third-party or validator review',
                    '7. Credits issued after buffer reserve',
                    '8. Monitoring continues for permanence and reversals',
                  ].map((step) => (
                    <div key={step} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      {step}
                    </div>
                  ))}
                </div>
              </WorkbenchCard>
            </div>
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <WorkbenchCard>
          <h3 className="text-xl font-black text-white">Expanded DPAL Carbon Portfolio</h3>
          <p className="mt-2 text-sm text-slate-400">Use this view to compare category breadth, illustrative credit potential, and which areas fit DPAL’s mission, marketplace, and MRV stack.</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Project Types</th>
                  <th className="px-4 py-3 font-semibold">Illustrative Potential Credits</th>
                  <th className="px-4 py-3 font-semibold">Best Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {portfolioSummary.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 font-bold text-white">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.projects}</td>
                    <td className="px-4 py-3 text-emerald-200">{row.potentialCredits.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.category === 'AFOLU'
                        ? 'Flagship for Bolivia and the current forest-integrity pipeline'
                        : row.category === 'Water & Blue Carbon'
                          ? 'Premium ESG and restoration buyers'
                          : row.category === 'Transport & Mobility'
                            ? 'Good Wheels and mobility-linked climate products'
                            : row.category === 'Community Behavior'
                              ? 'Gamified citizen action and mass participation'
                              : 'Scalable project pipeline'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <WorkbenchCard className="p-4">
              <h4 className="text-lg font-black text-white">{activeCategory.name} action earnings</h4>
              <div className="mt-4 space-y-3">
                {projectActionRows.map((row) => (
                  <div key={row.name} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{row.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.unitLabel}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${methodologyClass(row.methodology)}`}>
                        {row.methodology}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <MetricTile label="Credits / Unit" value={row.perUnitCredits.toFixed(4)} />
                      <MetricTile label="Default Issuable" value={row.defaultIssuable.toFixed(2)} />
                      <MetricTile label="Revenue" value={`$${row.revenue.toFixed(0)}`} />
                    </div>
                  </div>
                ))}
              </div>
            </WorkbenchCard>

            <WorkbenchCard className="p-4">
              <h4 className="text-lg font-black text-white">Category summary</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricTile label="Selected Category" value={activeCategory.name} />
                <MetricTile label="Project Types" value={String(activeCategory.projects.length)} />
                <MetricTile label="Illustrative Category Potential" value={portfolioSummary.find((row) => row.category === activeCategory.name)?.potentialCredits.toFixed(2) || '0.00'} />
                <MetricTile label="DPAL Use Case" value={activeCategory.id === 'afolu' ? 'Forest integrity and buyer-ready carbon assets' : 'Expanded climate asset pipeline'} />
              </div>
            </WorkbenchCard>
          </div>
        </WorkbenchCard>
      )}

      {tab === 'logic' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkbenchCard>
            <h3 className="text-xl font-black text-white">Core Credit Formula</h3>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-7 text-emerald-100">
              Base Credits = Activity Quantity × Emission Factor
              <br />
              Quality Multiplier = Permanence × Leakage × Uncertainty × Verifier × Additionality × Community Trust × Monitoring Strength
              <br />
              Pre-Buffer Credits = Base Credits × Quality Multiplier
              <br />
              Buffer Reserve = Pre-Buffer Credits × Buffer %
              <br />
              Issuable Credits = Pre-Buffer Credits − Buffer Reserve
              <br />
              Economic Credit Value = Issuable Credits × (1 + Co-Benefit Premium)
              <br />
              Revenue = Economic Credit Value × Market Price
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This gives DPAL a conservative credit engine. The platform does not issue the full theoretical carbon amount. It discounts that amount using permanence risk,
              leakage, uncertainty, verification quality, community trust, and monitoring strength before anything is treated as buyer-ready.
            </p>
          </WorkbenchCard>

          <WorkbenchCard>
            <h3 className="text-xl font-black text-white">How To Use In Production</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p><strong className="text-white">Activity Quantity:</strong> the measured unit from the field, sensor, meter, ride, hectare, household, or ton.</p>
              <p><strong className="text-white">Emission Factor:</strong> the category-specific conversion into tCO2e.</p>
              <p><strong className="text-white">Additionality:</strong> score proving the project would not have happened anyway.</p>
              <p><strong className="text-white">Permanence:</strong> how likely the carbon benefit remains over time.</p>
              <p><strong className="text-white">Leakage:</strong> discount for emissions shifting elsewhere.</p>
              <p><strong className="text-white">Uncertainty:</strong> discount for weak measurements or sparse data.</p>
              <p><strong className="text-white">Verifier:</strong> confidence score from validator or approved methodology.</p>
              <p><strong className="text-white">Community Trust:</strong> DPAL-native social verification from mission proof, witnesses, and local stake.</p>
              <p><strong className="text-white">Monitoring Strength:</strong> how well the project is checked over time using MRV.</p>
              <p><strong className="text-white">Buffer Reserve:</strong> credits held back to cover reversals like fire, fraud, or project failure.</p>
            </div>
          </WorkbenchCard>
        </div>
      )}
    </div>
  );
};

export default CarbonCreditWorkbench;
