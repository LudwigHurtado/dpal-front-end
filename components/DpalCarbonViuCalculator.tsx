import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle, Cpu, Database, FileText, Globe, MapPin,
  ShieldCheck, Target,
} from './icons';

type BiomassMode = 'linear_ndvi' | 'exponential_ndvi' | 'hybrid' | 'manual_agb';
type BaselineMode = 'manual' | 'historical_flat' | 'percent_growth';
type DeductionMode = 'percent' | 'absolute';
type ProjectType = 'reforestation' | 'avoided_deforestation' | 'agroforestry' | 'restoration';
type EcosystemType = 'amazon_forest' | 'dry_forest' | 'agroforestry_zone' | 'grassland' | 'wetland';

interface DpalCarbonViuCalculatorProps {
  onLaunchMission?: () => void;
  onRunMrv?: () => void;
  onPreparePackage?: () => void;
}

const defaultCoefficients: Record<EcosystemType, { a: number; b: number; c: number; d: number; e: number }> = {
  amazon_forest: { a: 8, b: 90, c: 1.8, d: 0.35, e: 1 },
  dry_forest: { a: 5, b: 70, c: 1.3, d: 0.25, e: 0.8 },
  agroforestry_zone: { a: 4, b: 62, c: 1.2, d: 0.22, e: 0.7 },
  grassland: { a: 1.2, b: 16, c: 0.35, d: 0.08, e: 0.3 },
  wetland: { a: 3.5, b: 44, c: 0.8, d: 0.18, e: 0.6 },
};

const riskBufferBands = [
  { label: 'Low', min: 0, max: 30, bufferPct: 5 },
  { label: 'Moderate', min: 31, max: 60, bufferPct: 12 },
  { label: 'High', min: 61, max: 80, bufferPct: 20 },
  { label: 'Very High', min: 81, max: 100, bufferPct: 30 },
];

const projectTypeLabels: Record<ProjectType, string> = {
  reforestation: 'Reforestation',
  avoided_deforestation: 'Avoided Deforestation',
  agroforestry: 'Agroforestry',
  restoration: 'Land Restoration',
};

const ecosystemLabels: Record<EcosystemType, string> = {
  amazon_forest: 'Amazon Forest',
  dry_forest: 'Dry Forest',
  agroforestry_zone: 'Agroforestry Zone',
  grassland: 'Grassland',
  wetland: 'Wetland',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value: string | number, fallback = 0) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function disclosureTemplate(isCertified: boolean) {
  return isCertified
    ? 'These units are represented as externally certified credits only where supported by approved third-party validation, verification, registry issuance, and applicable claims rules.'
    : 'These units are DPAL Verified Impact Units (VIUs) backed by satellite analysis, field evidence, and blockchain traceability. They are not represented as certified carbon offsets unless externally validated, verified, and issued through an approved standard.';
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  help?: string;
}> = ({ label, value, onChange, type = 'number', help }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
    />
    {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
  </label>
);

const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const SwitchRow: React.FC<{ label: string; note: string; checked: boolean; onChange: (checked: boolean) => void }> = ({
  label,
  note,
  checked,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-left"
  >
    <span>
      <span className="block text-sm font-bold text-white">{label}</span>
      <span className="mt-1 block text-xs text-slate-500">{note}</span>
    </span>
    <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
      <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
    </span>
  </button>
);

const Panel: React.FC<{ title: string; description?: string; children: React.ReactNode; className?: string }> = ({
  title,
  description,
  children,
  className = '',
}) => (
  <section className={`rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-lg ${className}`}>
    <div className="mb-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
    </div>
    {children}
  </section>
);

const SummaryRow: React.FC<{ label: string; value: string; help?: string }> = ({ label, value, help }) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
    <div>
      <p className="text-sm font-bold text-slate-200">{label}</p>
      {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
    </div>
    <div className="text-right text-sm font-black text-white">{value}</div>
  </div>
);

const ResultTile: React.FC<{ label: string; value: string; note: string; icon: React.ReactNode; tone?: string }> = ({
  label,
  value,
  note,
  icon,
  tone = 'text-emerald-300',
}) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
    <div className={`flex items-center gap-2 text-sm font-bold ${tone}`}>{icon}{label}</div>
    <div className="mt-2 text-3xl font-black text-white">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{note}</div>
  </div>
);

const DpalCarbonViuCalculator: React.FC<DpalCarbonViuCalculatorProps> = ({
  onLaunchMission,
  onRunMrv,
  onPreparePackage,
}) => {
  const [projectName, setProjectName] = useState('Bolivia Amazon Pilot 001');
  const [projectType, setProjectType] = useState<ProjectType>('reforestation');
  const [ecosystem, setEcosystem] = useState<EcosystemType>('amazon_forest');
  const [hectares, setHectares] = useState('100');
  const [monitoringMonths, setMonitoringMonths] = useState('12');
  const [biomassMode, setBiomassMode] = useState<BiomassMode>('hybrid');
  const [baselineMode, setBaselineMode] = useState<BaselineMode>('percent_growth');
  const [deductionMode, setDeductionMode] = useState<DeductionMode>('percent');
  const [ndviStart, setNdviStart] = useState('0.42');
  const [ndviEnd, setNdviEnd] = useState('0.56');
  const [canopyHeightStart, setCanopyHeightStart] = useState('8');
  const [canopyHeightEnd, setCanopyHeightEnd] = useState('11');
  const [canopyCoverStart, setCanopyCoverStart] = useState('38');
  const [canopyCoverEnd, setCanopyCoverEnd] = useState('52');
  const [fieldCorrectionStart, setFieldCorrectionStart] = useState('0');
  const [fieldCorrectionEnd, setFieldCorrectionEnd] = useState('1.2');
  const [manualAgbStart, setManualAgbStart] = useState('40');
  const [manualAgbEnd, setManualAgbEnd] = useState('55');
  const [carbonFraction, setCarbonFraction] = useState('0.47');
  const [manualBaselineStart, setManualBaselineStart] = useState('38');
  const [manualBaselineEnd, setManualBaselineEnd] = useState('41');
  const [baselineAnnualPct, setBaselineAnnualPct] = useState('3.5');
  const [historicalBaselineDelta, setHistoricalBaselineDelta] = useState('1.5');
  const [leakagePct, setLeakagePct] = useState('5');
  const [uncertaintyPct, setUncertaintyPct] = useState('10');
  const [otherAdjustmentPct, setOtherAdjustmentPct] = useState('0');
  const [leakageAbs, setLeakageAbs] = useState('0');
  const [uncertaintyAbs, setUncertaintyAbs] = useState('0');
  const [bufferAbs, setBufferAbs] = useState('0');
  const [otherAdjustmentAbs, setOtherAdjustmentAbs] = useState('0');
  const [bufferPctManual, setBufferPctManual] = useState('12');
  const [autoRiskBuffer, setAutoRiskBuffer] = useState(true);
  const [fireRisk, setFireRisk] = useState('30');
  const [landUsePressure, setLandUsePressure] = useState('40');
  const [governanceRisk, setGovernanceRisk] = useState('20');
  const [reversalRiskNotes, setReversalRiskNotes] = useState('Seasonal fire exposure moderate; community agreements strong.');
  const [evidenceCount, setEvidenceCount] = useState('42');
  const [groundVerifierCount, setGroundVerifierCount] = useState('3');
  const [photoConfidence, setPhotoConfidence] = useState('88');
  const [droneCoveragePct, setDroneCoveragePct] = useState('20');
  const [duplicateRiskFlag, setDuplicateRiskFlag] = useState(false);
  const [externalCertification, setExternalCertification] = useState(false);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [customC, setCustomC] = useState('');
  const [customD, setCustomD] = useState('');
  const [customE, setCustomE] = useState('');

  const coeffBase = defaultCoefficients[ecosystem];
  const coeff = {
    a: customA === '' ? coeffBase.a : safeNumber(customA, coeffBase.a),
    b: customB === '' ? coeffBase.b : safeNumber(customB, coeffBase.b),
    c: customC === '' ? coeffBase.c : safeNumber(customC, coeffBase.c),
    d: customD === '' ? coeffBase.d : safeNumber(customD, coeffBase.d),
    e: customE === '' ? coeffBase.e : safeNumber(customE, coeffBase.e),
  };

  const hectaresNum = Math.max(0, safeNumber(hectares, 0));
  const monthsNum = Math.max(1, safeNumber(monitoringMonths, 12));
  const carbonFractionNum = clamp(safeNumber(carbonFraction, 0.47), 0, 1);
  const ndviStartNum = clamp(safeNumber(ndviStart, 0), -1, 1);
  const ndviEndNum = clamp(safeNumber(ndviEnd, 0), -1, 1);

  const calcBiomass = (ndvi: number, height: number, cover: number, correction: number, manualAgb: number) => {
    if (biomassMode === 'linear_ndvi') return coeff.a + coeff.b * ndvi;
    if (biomassMode === 'exponential_ndvi') return coeff.a * Math.exp(ndvi * coeff.e);
    if (biomassMode === 'manual_agb') return manualAgb;
    return coeff.a + coeff.b * ndvi + coeff.c * height + coeff.d * cover + coeff.e * correction;
  };

  const projectAgbStart = Math.max(0, calcBiomass(ndviStartNum, safeNumber(canopyHeightStart), safeNumber(canopyCoverStart), safeNumber(fieldCorrectionStart), safeNumber(manualAgbStart)));
  const projectAgbEnd = Math.max(0, calcBiomass(ndviEndNum, safeNumber(canopyHeightEnd), safeNumber(canopyCoverEnd), safeNumber(fieldCorrectionEnd), safeNumber(manualAgbEnd)));
  const projectAgbDeltaPerHa = Math.max(0, projectAgbEnd - projectAgbStart);

  const baselineAgb = useMemo(() => {
    if (baselineMode === 'manual') {
      return { start: safeNumber(manualBaselineStart, projectAgbStart), end: safeNumber(manualBaselineEnd, projectAgbEnd) };
    }
    if (baselineMode === 'historical_flat') {
      return { start: projectAgbStart, end: projectAgbStart + safeNumber(historicalBaselineDelta, 0) };
    }
    const years = monthsNum / 12;
    return { start: projectAgbStart, end: projectAgbStart * (1 + (safeNumber(baselineAnnualPct, 0) / 100) * years) };
  }, [baselineMode, baselineAnnualPct, historicalBaselineDelta, manualBaselineEnd, manualBaselineStart, monthsNum, projectAgbEnd, projectAgbStart]);

  const projectCo2eDeltaPerHa = projectAgbDeltaPerHa * carbonFractionNum * (44 / 12);
  const baselineCo2eDeltaPerHa = Math.max(0, baselineAgb.end - baselineAgb.start) * carbonFractionNum * (44 / 12);
  const grossProjectCo2e = projectCo2eDeltaPerHa * hectaresNum;
  const grossBaselineCo2e = baselineCo2eDeltaPerHa * hectaresNum;
  const preDeductionNetCo2e = Math.max(0, grossProjectCo2e - grossBaselineCo2e);

  const riskScore = useMemo(() => {
    const fire = clamp(safeNumber(fireRisk, 0), 0, 100);
    const land = clamp(safeNumber(landUsePressure, 0), 0, 100);
    const gov = clamp(safeNumber(governanceRisk, 0), 0, 100);
    return round(clamp(fire * 0.4 + land * 0.35 + gov * 0.25, 0, 100), 1);
  }, [fireRisk, landUsePressure, governanceRisk]);

  const autoBufferBand = riskBufferBands.find((band) => riskScore >= band.min && riskScore <= band.max) ?? riskBufferBands[1];
  const appliedBufferPct = autoRiskBuffer ? autoBufferBand.bufferPct : safeNumber(bufferPctManual, 12);

  const deductionBreakdown = useMemo(() => {
    if (deductionMode === 'absolute') {
      return {
        leakage: Math.max(0, safeNumber(leakageAbs, 0)),
        uncertainty: Math.max(0, safeNumber(uncertaintyAbs, 0)),
        buffer: autoRiskBuffer ? preDeductionNetCo2e * (appliedBufferPct / 100) : Math.max(0, safeNumber(bufferAbs, 0)),
        other: Math.max(0, safeNumber(otherAdjustmentAbs, 0)),
      };
    }
    return {
      leakage: preDeductionNetCo2e * (Math.max(0, safeNumber(leakagePct, 0)) / 100),
      uncertainty: preDeductionNetCo2e * (Math.max(0, safeNumber(uncertaintyPct, 0)) / 100),
      buffer: preDeductionNetCo2e * (Math.max(0, appliedBufferPct) / 100),
      other: preDeductionNetCo2e * (Math.max(0, safeNumber(otherAdjustmentPct, 0)) / 100),
    };
  }, [appliedBufferPct, autoRiskBuffer, bufferAbs, deductionMode, leakageAbs, leakagePct, otherAdjustmentAbs, otherAdjustmentPct, preDeductionNetCo2e, uncertaintyAbs, uncertaintyPct]);

  const totalDeductions = deductionBreakdown.leakage + deductionBreakdown.uncertainty + deductionBreakdown.buffer + deductionBreakdown.other;
  const netCreditableCo2e = Math.max(0, preDeductionNetCo2e - totalDeductions);
  const viuEligible = Math.floor(netCreditableCo2e);
  const withheldBufferUnits = Math.ceil(deductionBreakdown.buffer);

  const evidenceScore = useMemo(() => {
    const ev = clamp(safeNumber(evidenceCount, 0), 0, 100) * 0.35;
    const gv = clamp(safeNumber(groundVerifierCount, 0) * 10, 0, 100) * 0.2;
    const pc = clamp(safeNumber(photoConfidence, 0), 0, 100) * 0.3;
    const dc = clamp(safeNumber(droneCoveragePct, 0), 0, 100) * 0.15;
    return round(clamp(ev + gv + pc + dc, 0, 100), 1);
  }, [droneCoveragePct, evidenceCount, groundVerifierCount, photoConfidence]);

  const integrityScore = useMemo(() => {
    const duplicatePenalty = duplicateRiskFlag ? 25 : 0;
    return round(clamp(evidenceScore - duplicatePenalty - riskScore * 0.15 + 20, 0, 100), 1);
  }, [duplicateRiskFlag, evidenceScore, riskScore]);

  const readinessStatus = useMemo(() => {
    if (duplicateRiskFlag) return { label: 'Hold', className: 'border-rose-500/40 bg-rose-500/15 text-rose-200', note: 'Resolve duplicate or conflicting claim flags before issuance.' };
    if (integrityScore >= 80 && netCreditableCo2e > 0) return { label: 'Issuance Ready', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200', note: 'Strong evidence stack and acceptable integrity for internal VIU issuance.' };
    if (integrityScore >= 60 && netCreditableCo2e > 0) return { label: 'Verification Ready', className: 'border-amber-500/40 bg-amber-500/15 text-amber-200', note: 'Needs validator review or stronger evidence before internal issuance.' };
    return { label: 'Needs Work', className: 'border-slate-600 bg-slate-800 text-slate-200', note: 'Strengthen baseline, evidence quality, or deductions before proceeding.' };
  }, [duplicateRiskFlag, integrityScore, netCreditableCo2e]);

  const serialPreview = useMemo(() => {
    const projectSlug = (projectName || 'UNTITLED').replace(/[^a-z0-9]+/gi, '-').toUpperCase().slice(0, 12);
    const end = Math.max(1, viuEligible);
    return `DPAL-VIU-${new Date().getFullYear()}-${projectSlug}-00001..${String(end).padStart(5, '0')}`;
  }, [projectName, viuEligible]);

  const calculationNarrative = [
    `Project gross CO2e gain = ${round(grossProjectCo2e)} tCO2e`,
    `Baseline CO2e gain = ${round(grossBaselineCo2e)} tCO2e`,
    `Pre-deduction net = ${round(preDeductionNetCo2e)} tCO2e`,
    `Leakage deduction = ${round(deductionBreakdown.leakage)} tCO2e`,
    `Uncertainty deduction = ${round(deductionBreakdown.uncertainty)} tCO2e`,
    `Buffer deduction = ${round(deductionBreakdown.buffer)} tCO2e`,
    `Other adjustment = ${round(deductionBreakdown.other)} tCO2e`,
    `Net creditable CO2e = ${round(netCreditableCo2e)} tCO2e`,
    `Indicative VIUs eligible = ${viuEligible}`,
  ].join('\n');

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 p-5">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">DPAL Carbon / VIU Calculator</span>
              <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300">MRV + Governance + Registry Logic</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">Build defensible impact numbers.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Convert project evidence into biomass, carbon, CO2e, deductions, buffer withholding, and indicative DPAL Verified Impact Units.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onLaunchMission} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500">Launch Evidence Mission</button>
              <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">Run MRV Review</button>
              <button onClick={onPreparePackage} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">Prepare Buyer Package</button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-sm font-black text-white">Program Snapshot</p>
            <div className="mt-3 space-y-2">
              <SummaryRow label="Project" value={projectName || 'Untitled'} />
              <SummaryRow label="Type" value={projectTypeLabels[projectType]} />
              <SummaryRow label="Ecosystem" value={ecosystemLabels[ecosystem]} />
              <SummaryRow label="Area" value={`${formatNumber(hectaresNum)} ha`} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <ResultTile label="Gross Project CO2e" value={formatNumber(round(grossProjectCo2e), 1)} note={`tCO2e over ${monthsNum} months`} icon={<Globe className="h-4 w-4" />} />
        <ResultTile label="Net Creditable CO2e" value={formatNumber(round(netCreditableCo2e), 1)} note="After deductions and buffer logic" icon={<ShieldCheck className="h-4 w-4" />} tone="text-cyan-300" />
        <ResultTile label="Indicative VIUs" value={formatNumber(viuEligible)} note="1 VIU = 1 tCO2e pending rules" icon={<Database className="h-4 w-4" />} tone="text-amber-300" />
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle className="h-4 w-4" />Readiness</div>
          <div className={`mt-3 inline-flex rounded-lg border px-3 py-1 text-sm font-black ${readinessStatus.className}`}>{readinessStatus.label}</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{readinessStatus.note}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Panel title="Project Intake" description="Core project configuration and methodology settings">
            <div className="grid gap-4 md:grid-cols-2">
              <Field type="text" label="Project name" value={projectName} onChange={setProjectName} />
              <SelectField label="Project type" value={projectType} onChange={setProjectType} options={Object.entries(projectTypeLabels).map(([value, label]) => ({ value: value as ProjectType, label }))} />
              <SelectField label="Ecosystem type" value={ecosystem} onChange={setEcosystem} options={Object.entries(ecosystemLabels).map(([value, label]) => ({ value: value as EcosystemType, label }))} />
              <SelectField label="Biomass model" value={biomassMode} onChange={setBiomassMode} options={[
                { value: 'hybrid', label: 'Hybrid: NDVI + height + cover + field' },
                { value: 'linear_ndvi', label: 'Linear NDVI' },
                { value: 'exponential_ndvi', label: 'Exponential NDVI' },
                { value: 'manual_agb', label: 'Manual AGB override' },
              ]} />
              <Field label="Area (hectares)" value={hectares} onChange={setHectares} />
              <Field label="Monitoring window (months)" value={monitoringMonths} onChange={setMonitoringMonths} />
              <SelectField label="Baseline mode" value={baselineMode} onChange={setBaselineMode} options={[
                { value: 'percent_growth', label: 'Percent growth' },
                { value: 'historical_flat', label: 'Historical flat delta' },
                { value: 'manual', label: 'Manual baseline AGB' },
              ]} />
              <Field label="Carbon fraction" value={carbonFraction} onChange={setCarbonFraction} help="Common default is 0.47." />
            </div>
          </Panel>

          <Panel title="Monitoring Inputs" description="Satellite, canopy, field correction, and evidence variables">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="NDVI start" value={ndviStart} onChange={setNdviStart} />
              <Field label="NDVI end" value={ndviEnd} onChange={setNdviEnd} />
              <Field label="Canopy height start" value={canopyHeightStart} onChange={setCanopyHeightStart} />
              <Field label="Canopy height end" value={canopyHeightEnd} onChange={setCanopyHeightEnd} />
              <Field label="Canopy cover start (%)" value={canopyCoverStart} onChange={setCanopyCoverStart} />
              <Field label="Canopy cover end (%)" value={canopyCoverEnd} onChange={setCanopyCoverEnd} />
              <Field label="Field correction start" value={fieldCorrectionStart} onChange={setFieldCorrectionStart} />
              <Field label="Field correction end" value={fieldCorrectionEnd} onChange={setFieldCorrectionEnd} />
              {biomassMode === 'manual_agb' ? (
                <>
                  <Field label="Manual AGB start" value={manualAgbStart} onChange={setManualAgbStart} />
                  <Field label="Manual AGB end" value={manualAgbEnd} onChange={setManualAgbEnd} />
                </>
              ) : null}
              <Field label="Evidence files" value={evidenceCount} onChange={setEvidenceCount} />
              <Field label="Ground verifiers" value={groundVerifierCount} onChange={setGroundVerifierCount} />
              <Field label="Photo confidence (%)" value={photoConfidence} onChange={setPhotoConfidence} />
              <Field label="Drone coverage (%)" value={droneCoveragePct} onChange={setDroneCoveragePct} />
            </div>
          </Panel>

          <Panel title="Baseline And Risk" description="Counterfactual scenario plus reversal-risk buffer controls">
            <div className="grid gap-4 md:grid-cols-2">
              {baselineMode === 'manual' ? (
                <>
                  <Field label="Manual baseline AGB start" value={manualBaselineStart} onChange={setManualBaselineStart} />
                  <Field label="Manual baseline AGB end" value={manualBaselineEnd} onChange={setManualBaselineEnd} />
                </>
              ) : baselineMode === 'historical_flat' ? (
                <Field label="Historical baseline delta / ha" value={historicalBaselineDelta} onChange={setHistoricalBaselineDelta} />
              ) : (
                <Field label="Annual baseline growth rate (%)" value={baselineAnnualPct} onChange={setBaselineAnnualPct} />
              )}
              <Field label="Fire risk (0-100)" value={fireRisk} onChange={setFireRisk} />
              <Field label="Land-use pressure (0-100)" value={landUsePressure} onChange={setLandUsePressure} />
              <Field label="Governance risk (0-100)" value={governanceRisk} onChange={setGovernanceRisk} />
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Risk notes</span>
                <textarea
                  value={reversalRiskNotes}
                  onChange={(event) => setReversalRiskNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Deductions And Buffers" description="Leakage, uncertainty, reversal buffer, other adjustments, and claim holds">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Deduction mode" value={deductionMode} onChange={setDeductionMode} options={[
                { value: 'percent', label: 'Percent of pre-deduction net' },
                { value: 'absolute', label: 'Absolute tCO2e amounts' },
              ]} />
              <SwitchRow label="Auto risk buffer" note="Uses weighted risk score to assign a buffer band." checked={autoRiskBuffer} onChange={setAutoRiskBuffer} />
              {deductionMode === 'percent' ? (
                <>
                  <Field label="Leakage (%)" value={leakagePct} onChange={setLeakagePct} />
                  <Field label="Uncertainty (%)" value={uncertaintyPct} onChange={setUncertaintyPct} />
                  <Field label="Other adjustment (%)" value={otherAdjustmentPct} onChange={setOtherAdjustmentPct} />
                  {!autoRiskBuffer ? <Field label="Manual buffer (%)" value={bufferPctManual} onChange={setBufferPctManual} /> : null}
                </>
              ) : (
                <>
                  <Field label="Leakage (tCO2e)" value={leakageAbs} onChange={setLeakageAbs} />
                  <Field label="Uncertainty (tCO2e)" value={uncertaintyAbs} onChange={setUncertaintyAbs} />
                  <Field label="Other adjustment (tCO2e)" value={otherAdjustmentAbs} onChange={setOtherAdjustmentAbs} />
                  {!autoRiskBuffer ? <Field label="Manual buffer (tCO2e)" value={bufferAbs} onChange={setBufferAbs} /> : null}
                </>
              )}
              <SwitchRow label="Duplicate / conflicting claim flag" note="Blocks issuance until no-double-counting checks are clear." checked={duplicateRiskFlag} onChange={setDuplicateRiskFlag} />
              <SwitchRow label="External-certified claim mode" note="Use only after external validation, verification, and registry issuance." checked={externalCertification} onChange={setExternalCertification} />
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Formula Profile" description="Current methodology path selected inside the calculator">
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
{`${biomassMode === 'hybrid' ? 'AGB = a + b*NDVI + c*CanopyHeight + d*CanopyCover + e*FieldCorrection' : ''}
${biomassMode === 'linear_ndvi' ? 'AGB = a + b*NDVI' : ''}
${biomassMode === 'exponential_ndvi' ? 'AGB = a*e^(NDVI*e)' : ''}
${biomassMode === 'manual_agb' ? 'AGB = manual field estimate' : ''}
Carbon = AGB * carbon fraction
CO2e = Carbon * 44/12
Net = Project Gain - Baseline Gain - Leakage - Uncertainty - Buffer - Other`}
            </pre>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[
                ['a', customA, setCustomA, coeffBase.a],
                ['b', customB, setCustomB, coeffBase.b],
                ['c', customC, setCustomC, coeffBase.c],
                ['d', customD, setCustomD, coeffBase.d],
                ['e', customE, setCustomE, coeffBase.e],
              ].map(([key, value, setter, fallback]) => (
                <input
                  key={String(key)}
                  aria-label={`Coefficient ${key}`}
                  placeholder={`${key} (${fallback})`}
                  value={value as string}
                  onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                  className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
                />
              ))}
            </div>
          </Panel>

          <Panel title="Measured Outputs">
            <div className="space-y-2">
              <SummaryRow label="Project AGB start" value={`${round(projectAgbStart)} Mg/ha`} />
              <SummaryRow label="Project AGB end" value={`${round(projectAgbEnd)} Mg/ha`} />
              <SummaryRow label="Project AGB delta / ha" value={`${round(projectAgbDeltaPerHa)} Mg/ha`} />
              <SummaryRow label="Project CO2e delta / ha" value={`${round(projectCo2eDeltaPerHa)} tCO2e/ha`} />
              <SummaryRow label="Baseline CO2e total" value={`${round(grossBaselineCo2e)} tCO2e`} />
              <SummaryRow label="Risk score" value={`${riskScore} / 100`} help={`Auto band: ${autoBufferBand.label} (${appliedBufferPct}%)`} />
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Reversal risk</span>
                  <span>{riskScore}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${riskScore}%` }} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Deduction Results">
            <div className="space-y-2">
              <SummaryRow label="Pre-deduction net" value={`${round(preDeductionNetCo2e)} tCO2e`} />
              <SummaryRow label="Leakage" value={`${round(deductionBreakdown.leakage)} tCO2e`} />
              <SummaryRow label="Uncertainty" value={`${round(deductionBreakdown.uncertainty)} tCO2e`} />
              <SummaryRow label="Buffer" value={`${round(deductionBreakdown.buffer)} tCO2e`} />
              <SummaryRow label="Other adjustment" value={`${round(deductionBreakdown.other)} tCO2e`} />
              <SummaryRow label="Total deductions" value={`${round(totalDeductions)} tCO2e`} />
            </div>
          </Panel>

          <Panel title="Issuance Preview">
            <div className="space-y-2">
              <SummaryRow label="Eligible VIUs" value={String(viuEligible)} />
              <SummaryRow label="Buffer withheld units" value={String(withheldBufferUnits)} />
              <SummaryRow label="Indicative serial range" value={serialPreview} />
              <SummaryRow label="Registry status" value={readinessStatus.label} />
              <SummaryRow label="Evidence score" value={`${evidenceScore} / 100`} />
              <SummaryRow label="Integrity score" value={`${integrityScore} / 100`} />
            </div>
          </Panel>

          <Panel title="Registry Package">
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-200"><FileText className="h-4 w-4" />Disclosure preview</div>
                <p className="text-sm leading-6 text-slate-400">{disclosureTemplate(externalCertification)}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-200"><Cpu className="h-4 w-4" />Calculation log</div>
                <textarea value={calculationNarrative} readOnly rows={9} className="w-full resize-none border-0 bg-transparent text-xs leading-6 text-slate-400 outline-none" />
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-200"><AlertTriangle className="h-4 w-4" />Positioning</div>
                <p className="text-sm leading-6 text-amber-100/80">
                  Internal DPAL VIUs are verification-preparation assets, not certified carbon offsets unless the external validation and issuance path is complete.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Next Build Hooks">
            <div className="grid gap-2">
              <SummaryRow label="Evidence Vault" value="Upload, hash, geo-tag" />
              <SummaryRow label="Verifier Dashboard" value="Approve, reject, clarify" />
              <SummaryRow label="Public Registry" value="Status, retirement, reversals" />
              <SummaryRow label="Disclosure Engine" value="Buyer-safe claims language" />
              <SummaryRow label="Export Package" value="External standard bundle" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button onClick={onLaunchMission} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><Target className="mr-2 inline h-4 w-4" />Mission</button>
              <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><ShieldCheck className="mr-2 inline h-4 w-4" />MRV</button>
              <button onClick={onPreparePackage} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><MapPin className="mr-2 inline h-4 w-4" />Package</button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
};

export default DpalCarbonViuCalculator;
