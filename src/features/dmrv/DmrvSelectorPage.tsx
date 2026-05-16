import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Box,
  CheckSquare,
  Cloud,
  Cpu,
  Database,
  FileText,
  Globe,
  MapPin,
  Package,
  Play,
  Satellite,
  Settings,
  Sparkles,
  TreePine,
  Users,
  Waves,
} from '../../../components/icons';

type DmrvId =
  | 'forest'
  | 'agriculture'
  | 'wetland'
  | 'coastal'
  | 'urban'
  | 'grassland'
  | 'other';

type InputChip = { label: string; icon: React.ReactNode };

type DmrvType = {
  id: DmrvId;
  legendLabel: string;
  title: string;
  description: string;
  hex: string;
  ring: string;
  panelBg: string;
  panelBorder: string;
  text: string;
  icon: React.ReactNode;
  inputs: InputChip[];
  bullets: string[];
};

const DMRV_TYPES: DmrvType[] = [
  {
    id: 'forest',
    legendLabel: 'Forest / Land Use',
    title: 'Forest DMRV',
    description:
      'Monitors forest carbon stocks, deforestation, degradation, regrowth, and enhancement.',
    hex: '#4A7C44',
    ring: 'bg-[#4A7C44]',
    panelBg: 'bg-[#4A7C44]/10',
    panelBorder: 'border-[#4A7C44]/35',
    text: 'text-[#4A7C44]',
    icon: <TreePine className="h-7 w-7" />,
    inputs: [
      { label: 'Satellite Imagery', icon: <Satellite className="h-5 w-5" /> },
      { label: 'Field Plots', icon: <MapPin className="h-5 w-5" /> },
      { label: 'Activity Data', icon: <FileText className="h-5 w-5" /> },
      { label: 'LiDAR', icon: <BarChart2 className="h-5 w-5" /> },
      { label: 'Biomass Data', icon: <TreePine className="h-5 w-5" /> },
    ],
    bullets: [
      'Land cover change',
      'Deforestation alerts',
      'Biomass / carbon stock',
      'Regrowth & enhancement',
    ],
  },
  {
    id: 'agriculture',
    legendLabel: 'Agriculture',
    title: 'Agriculture DMRV',
    description: 'Tracks soil carbon, N₂O/CH₄ emissions, and management practice impacts.',
    hex: '#8B8B4B',
    ring: 'bg-[#8B8B4B]',
    panelBg: 'bg-[#8B8B4B]/10',
    panelBorder: 'border-[#8B8B4B]/35',
    text: 'text-[#8B8B4B]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 3v18M8 8c2-3 4-3 4 0M16 8c-2-3-4-3-4 0M6 14h12" />
      </svg>
    ),
    inputs: [
      { label: 'Soil Samples', icon: <Box className="h-5 w-5" /> },
      { label: 'IoT / Sensors', icon: <Cpu className="h-5 w-5" /> },
      { label: 'Management Data', icon: <FileText className="h-5 w-5" /> },
      { label: 'Weather Data', icon: <Cloud className="h-5 w-5" /> },
      { label: 'Activity Data', icon: <BarChart2 className="h-5 w-5" /> },
    ],
    bullets: ['Soil organic carbon', 'N₂O / CH₄ emissions', 'Practice verification', 'Yield & intensity context'],
  },
  {
    id: 'wetland',
    legendLabel: 'Wetland / Blue Carbon',
    title: 'Wetland / Blue Carbon DMRV',
    description:
      'Assesses carbon in mangroves, saltmarshes, seagrasses, and inland wetlands.',
    hex: '#4A86CF',
    ring: 'bg-[#4A86CF]',
    panelBg: 'bg-[#4A86CF]/10',
    panelBorder: 'border-[#4A86CF]/35',
    text: 'text-[#4A86CF]',
    icon: <Waves className="h-7 w-7" />,
    inputs: [
      { label: 'Satellite Imagery', icon: <Satellite className="h-5 w-5" /> },
      { label: 'Bathymetry', icon: <BarChart2 className="h-5 w-5" /> },
      { label: 'Water Quality', icon: <DropletsIcon /> },
      { label: 'Tide Data', icon: <Waves className="h-5 w-5" /> },
      { label: 'Field Plots', icon: <MapPin className="h-5 w-5" /> },
    ],
    bullets: ['Hydrology indicators', 'Blue carbon pools', 'Disturbance tracking', 'Coastal–inland linkage'],
  },
  {
    id: 'coastal',
    legendLabel: 'Coastal / Mangrove',
    title: 'Coastal / Mangrove DMRV',
    description: 'Monitors coastal protection, sediment dynamics, and carbon sequestration.',
    hex: '#319795',
    ring: 'bg-[#319795]',
    panelBg: 'bg-[#319795]/10',
    panelBorder: 'border-[#319795]/35',
    text: 'text-[#319795]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 20c3-6 6-8 8-14 2 6 5 8 8 14M4 20h16" />
        <path d="M8 12c1-2 2-3 4-3s3 1 4 3" />
      </svg>
    ),
    inputs: [
      { label: 'Drone Imagery', icon: <Satellite className="h-5 w-5" /> },
      { label: 'Sediment Data', icon: <Box className="h-5 w-5" /> },
      { label: 'Wave / Tide Data', icon: <Waves className="h-5 w-5" /> },
      { label: 'Field Plots', icon: <MapPin className="h-5 w-5" /> },
      { label: 'Activity Data', icon: <FileText className="h-5 w-5" /> },
    ],
    bullets: ['Mangrove extent', 'Sediment accretion', 'Protection services', 'Carbon sequestration rate'],
  },
  {
    id: 'urban',
    legendLabel: 'Urban / Built Environment',
    title: 'Urban / Built Environment DMRV',
    description:
      'Evaluates urban green cover, building emissions, and heat island mitigation impacts.',
    hex: '#705196',
    ring: 'bg-[#705196]',
    panelBg: 'bg-[#705196]/10',
    panelBorder: 'border-[#705196]/35',
    text: 'text-[#705196]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="8" width="5" height="12" rx="0.5" />
        <rect x="10" y="4" width="5" height="16" rx="0.5" />
        <rect x="16" y="10" width="4" height="10" rx="0.5" />
      </svg>
    ),
    inputs: [
      { label: 'Satellite Imagery', icon: <Satellite className="h-5 w-5" /> },
      { label: 'Building Data', icon: <Box className="h-5 w-5" /> },
      { label: 'Energy Data', icon: <BarChart2 className="h-5 w-5" /> },
      { label: 'Mobility Data', icon: <Globe className="h-5 w-5" /> },
      { label: 'Air Quality Data', icon: <Cloud className="h-5 w-5" /> },
    ],
    bullets: ['Green cover / canopy', 'Building emissions', 'Heat island metrics', 'Mitigation actions'],
  },
  {
    id: 'grassland',
    legendLabel: 'Grassland / Savanna',
    title: 'Grassland / Savanna DMRV',
    description: 'Monitors soil carbon, biomass, grazing impacts, and fire management outcomes.',
    hex: '#D69E2E',
    ring: 'bg-[#D69E2E]',
    panelBg: 'bg-[#D69E2E]/12',
    panelBorder: 'border-[#D69E2E]/40',
    text: 'text-[#B7791F]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 4v16M8 10l4-4 4 4M6 18h12" />
        <circle cx="12" cy="6" r="2" />
      </svg>
    ),
    inputs: [
      { label: 'Satellite Imagery', icon: <Satellite className="h-5 w-5" /> },
      { label: 'Fire Data', icon: <Sparkles className="h-5 w-5" /> },
      { label: 'Grazing Data', icon: <Users className="h-5 w-5" /> },
      { label: 'Soil Samples', icon: <Box className="h-5 w-5" /> },
      { label: 'Weather Data', icon: <Cloud className="h-5 w-5" /> },
    ],
    bullets: ['Fire regime', 'Grazing intensity', 'Soil carbon trend', 'Biomass dynamics'],
  },
  {
    id: 'other',
    legendLabel: 'Other / Custom',
    title: 'Other / Custom DMRV',
    description: 'Configurable framework for other ecosystems or project-specific requirements.',
    hex: '#718096',
    ring: 'bg-[#718096]',
    panelBg: 'bg-[#718096]/10',
    panelBorder: 'border-[#718096]/35',
    text: 'text-[#718096]',
    icon: <Settings className="h-7 w-7" />,
    inputs: [
      { label: 'Custom Data', icon: <Database className="h-5 w-5" /> },
      { label: 'Documents', icon: <FileText className="h-5 w-5" /> },
      { label: 'API Feeds', icon: <Globe className="h-5 w-5" /> },
      { label: 'Field Evidence', icon: <MapPin className="h-5 w-5" /> },
      { label: 'Activity Data', icon: <BarChart2 className="h-5 w-5" /> },
    ],
    bullets: ['Flexible framework', 'Project-specific inputs', 'Scalable configuration', 'Validator-defined scope'],
  },
];

function DropletsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z" />
    </svg>
  );
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type Props = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

function DialKnob(): React.ReactElement {
  return (
    <div className="relative h-[72px] w-[72px] rounded-full bg-gradient-to-b from-[#64748b] to-[#334155] shadow-[0_6px_14px_rgba(15,23,42,0.35),inset_0_2px_4px_rgba(255,255,255,0.25)] ring-2 ring-[#94a3b8]">
      <div className="absolute left-1/2 top-2 h-7 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-sm" />
    </div>
  );
}

function SelectorDial({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}): React.ReactElement {
  const segments = DMRV_TYPES.length;
  const rotation = -90 + (360 / segments) * activeIndex;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        {DMRV_TYPES.map((t, i) => {
          const start = (i / segments) * 360 - 90;
          const end = ((i + 1) / segments) * 360 - 90;
          const r = 88;
          const cx0 = 100;
          const cy0 = 100;
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const x1 = cx0 + r * Math.cos(toRad(start));
          const y1 = cy0 + r * Math.sin(toRad(start));
          const x2 = cx0 + r * Math.cos(toRad(end));
          const y2 = cy0 + r * Math.sin(toRad(end));
          const large = end - start > 180 ? 1 : 0;
          return (
            <path
              key={t.id}
              d={`M ${cx0} ${cy0} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={t.hex}
              opacity={i === activeIndex ? 1 : 0.88}
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        })}
        <circle cx="100" cy="100" r="46" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-300"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <DialKnob />
      </div>
      <div className="absolute inset-0">
        {DMRV_TYPES.map((t, i) => {
          const angle = ((i + 0.5) / segments) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 38 * Math.cos(rad);
          const y = 50 + 38 * Math.sin(rad);
          return (
            <button
              key={t.id}
              type="button"
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`Select ${t.legendLabel}`}
              onClick={() => onSelect(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TypeRow({
  item,
  active,
  onSelect,
}: {
  item: DmrvType;
  active: boolean;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm transition',
        active
          ? `${item.panelBg} ${item.panelBorder}`
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
      )}
      style={active ? { boxShadow: `0 0 0 2px ${item.hex}44` } : undefined}
    >
      <div
        className={cx(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow',
          item.ring,
        )}
      >
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx('text-sm font-black uppercase tracking-wide', active ? item.text : 'text-slate-900')}>
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{item.description}</p>
      </div>
    </button>
  );
}

function InputsPanel({
  item,
  active,
  activeInput,
  onInputSelect,
}: {
  item: DmrvType;
  active: boolean;
  activeInput: string;
  onInputSelect: (label: string) => void;
}): React.ReactElement {
  return (
    <div
      className={cx(
        'rounded-xl border bg-white px-3 py-2.5 shadow-sm transition',
        active ? `${item.panelBorder} ring-1` : 'border-slate-200',
        active && item.panelBg,
      )}
      style={active ? { boxShadow: `0 0 0 1px ${item.hex}33` } : undefined}
    >
      <div className="flex flex-wrap items-start gap-2 border-b border-slate-100 pb-2">
        {item.inputs.map((inp) => {
          const selected = activeInput === inp.label;
          return (
            <button
              key={inp.label}
              type="button"
              onClick={() => onInputSelect(inp.label)}
              className={cx(
                'flex min-w-[72px] max-w-[88px] flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition',
                selected
                  ? `${item.panelBorder} ${item.panelBg}`
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
              )}
              style={selected ? { borderColor: item.hex, color: item.hex } : undefined}
            >
              <span className={cx(selected ? item.text : 'text-slate-500')}>{inp.icon}</span>
              <span className="text-[9px] font-semibold leading-tight text-slate-700">{inp.label}</span>
            </button>
          );
        })}
      </div>
      <ul className="mt-2 space-y-0.5 pl-4 text-[11px] text-slate-700">
        {item.bullets.map((b) => (
          <li key={b} className="list-disc marker:text-slate-400">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowConnector({ color, active }: { color: string; active: boolean }): React.ReactElement {
  return (
    <div className="relative hidden min-h-[92px] items-center justify-center xl:flex">
      <div className="h-1 w-full rounded-full" style={{ backgroundColor: color, opacity: active ? 1 : 0.45 }} />
      <div
        className="absolute right-0 h-3.5 w-3.5 rotate-45 border-r-[3px] border-t-[3px]"
        style={{ borderColor: color, opacity: active ? 1 : 0.45 }}
      />
    </div>
  );
}

const DmrvSelectorPage: React.FC<Props> = ({ onReturn, onNavigate }) => {
  const [activeId, setActiveId] = useState<DmrvId>('forest');
  const [activeInput, setActiveInput] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [footerMode, setFooterMode] = useState<'idle' | 'workflow' | 'evidence' | 'configure'>('idle');

  const activeIndex = useMemo(
    () => DMRV_TYPES.findIndex((t) => t.id === activeId),
    [activeId],
  );
  const activeType = DMRV_TYPES[activeIndex] ?? DMRV_TYPES[0];

  const selectType = useCallback((id: DmrvId) => {
    setActiveId(id);
    setActiveInput('');
    setActionMessage(null);
    setFooterMode('idle');
  }, []);

  const selectByIndex = useCallback(
    (index: number) => {
      const t = DMRV_TYPES[index];
      if (t) selectType(t.id);
    },
    [selectType],
  );

  const runAction = useCallback(
    (action: 'Workflow' | 'Evidence Packet' | 'Input Configuration') => {
      if (action === 'Workflow') {
        setFooterMode('workflow');
        setActionMessage(
          `Workflow ready for ${activeType.title}. Configure evaluation steps for ${activeType.legendLabel.toLowerCase()} DMRV.`,
        );
        onNavigate?.('commandCenter');
        return;
      }
      if (action === 'Evidence Packet') {
        setFooterMode('evidence');
        setActionMessage(`Evidence packet draft scoped to ${activeType.title}.`);
        onNavigate?.('previewEvidencePacket');
        return;
      }
      setFooterMode('configure');
      setActionMessage(
        `Configure inputs for ${activeType.title}${activeInput ? ` — focus: ${activeInput}` : ''}.`,
      );
      document.getElementById('dmrv-inputs-column')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [activeType, activeInput, onNavigate],
  );

  return (
    <main className="min-h-screen bg-[#eef1f4] text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        {onReturn && (
          <button
            type="button"
            onClick={onReturn}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <header className="mb-6 text-center">
          <h1 className="text-xl font-black uppercase tracking-[0.12em] text-[#1e293b] md:text-2xl">
            Adaptable DMRV: Selector-Based Evaluation
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 md:text-base">
            One system. Multiple DMRV types. Tailored to the environment.
          </p>
        </header>

        {actionMessage && (
          <div
            className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm"
            role="status"
          >
            {actionMessage}
            {footerMode === 'configure' && (
              <span className="ml-2 text-slate-500">Select input chips on the right to refine scope.</span>
            )}
          </div>
        )}

        <section className="relative">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,1fr)_minmax(320px,1.15fr)_minmax(360px,1.35fr)] xl:gap-4">
            <aside className="xl:sticky xl:top-4 xl:self-start">
              <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md">
                <h2 className="text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950">
                  DMRV Selector
                </h2>
                <p className="mt-2 text-center text-[11px] leading-snug text-slate-600">
                  Choose the environment type to determine the appropriate DMRV approach.
                </p>
                <div className="my-4">
                  <SelectorDial activeIndex={activeIndex} onSelect={selectByIndex} />
                </div>
                <ul className="space-y-1.5">
                  {DMRV_TYPES.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectType(t.id)}
                        className={cx(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-bold uppercase tracking-wide transition',
                          t.id === activeId ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.hex }}
                        />
                        {t.legendLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 rounded-xl border border-slate-300 bg-[#f1f5f9] px-3 py-2 text-center text-[10px] font-medium leading-snug text-slate-600">
                Selection determines the DMRV type and required inputs for evaluation.
              </p>
            </aside>

            <section>
              <h3 className="mb-3 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 xl:text-left">
                DMRV Types (By Selection)
              </h3>
              <div className="space-y-2.5">
                {DMRV_TYPES.map((item) => (
                  <TypeRow
                    key={item.id}
                    item={item}
                    active={item.id === activeId}
                    onSelect={() => selectType(item.id)}
                  />
                ))}
              </div>
            </section>

            <section id="dmrv-inputs-column">
              <h3 className="mb-3 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 xl:text-left">
                Inputs for Evaluation (Examples)
              </h3>
              <div className="space-y-2.5">
                {DMRV_TYPES.map((item) => (
                  <div
                    key={item.id}
                    className={cx(
                      'grid grid-cols-1 gap-2 xl:grid-cols-[28px_1fr]',
                      item.id === activeId && 'relative',
                    )}
                  >
                    <RowConnector color={item.hex} active={item.id === activeId} />
                    <InputsPanel
                      item={item}
                      active={item.id === activeId}
                      activeInput={item.id === activeId ? activeInput : ''}
                      onInputSelect={(label) => {
                        selectType(item.id);
                        setActiveInput(label);
                        setActionMessage(
                          `${label} selected as an evaluation input for ${item.title}.`,
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <footer className="mt-6 grid grid-cols-1 items-center gap-4 rounded-2xl border border-slate-300 bg-[#e8f0f7] px-5 py-4 shadow-sm lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-3 text-slate-900">
            <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
            <p className="text-sm font-bold leading-snug tracking-wide md:text-base">
              <span className="uppercase">Adaptive. Transparent. Scientific.</span>
              <span className="mt-1 block font-medium text-slate-700 md:mt-0 md:inline md:ml-2">
                One DMRV system, configured for any environment.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction('Workflow')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Play className="h-4 w-4" />
              Open Workflow
            </button>
            <button
              type="button"
              onClick={() => runAction('Evidence Packet')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <Package className="h-4 w-4" />
              Evidence Packet
            </button>
            <button
              type="button"
              onClick={() => runAction('Input Configuration')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <CheckSquare className="h-4 w-4" />
              Configure Inputs
            </button>
          </div>
        </footer>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          DMRV selector configures evaluation scope and input categories — not certified credits or automatic
          verification. Human review and evidence gates apply in downstream DPAL workflows.
        </p>
      </div>
    </main>
  );
};

export default DmrvSelectorPage;
