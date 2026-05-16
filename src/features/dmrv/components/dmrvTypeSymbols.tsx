import React from 'react';

export type DmrvTypeSymbolKey =
  | 'urban'
  | 'solar'
  | 'ev'
  | 'building'
  | 'smart-city'
  | 'transport'
  | 'green-infra'
  | 'public-works'
  | 'forest'
  | 'agriculture'
  | 'grassland'
  | 'soil'
  | 'peatland'
  | 'afolu'
  | 'redd'
  | 'integrity'
  | 'wetland'
  | 'coastal'
  | 'watershed'
  | 'marine'
  | 'water-quality'
  | 'treatment'
  | 'flood'
  | 'drought'
  | 'industrial'
  | 'air-quality'
  | 'methane'
  | 'compliance'
  | 'waste'
  | 'circular'
  | 'toxic'
  | 'habitat'
  | 'species'
  | 'restoration'
  | 'protected'
  | 'nature'
  | 'wildfire'
  | 'heat'
  | 'disaster'
  | 'resilience'
  | 'warning'
  | 'supply-chain'
  | 'timber'
  | 'mining'
  | 'commodity'
  | 'esg'
  | 'greenwash'
  | 'offset'
  | 'citizen'
  | 'justice'
  | 'health'
  | 'housing'
  | 'qr'
  | 'ai'
  | 'blockchain'
  | 'drone'
  | 'fusion'
  | 'default';

type SymProps = { size?: number; className?: string };

function Sym({ size = 48, className, children }: SymProps & { children: React.ReactNode }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden role="presentation">
      {children}
    </svg>
  );
}

function UrbanSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#dcfce7" />
      <rect x="8" y="18" width="10" height="22" fill="#64748b" />
      <rect x="20" y="12" width="8" height="28" fill="#475569" />
      <rect x="30" y="16" width="10" height="24" fill="#64748b" />
      <rect x="10" y="20" width="3" height="3" fill="#fef08a" />
      <rect x="22" y="16" width="3" height="3" fill="#fef08a" />
      <rect x="33" y="20" width="3" height="3" fill="#fef08a" />
      <ellipse cx="24" cy="40" rx="18" ry="2" fill="#86efac" opacity="0.5" />
    </Sym>
  );
}

function SolarSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#fef9c3" />
      <circle cx="34" cy="14" r="6" fill="#fbbf24" />
      <path d="M34 6v4M34 20v2M40 14h3M28 14h-3" stroke="#f59e0b" strokeWidth="1.2" />
      <rect x="8" y="26" width="28" height="14" rx="1" fill="#1e3a5f" />
      {[12, 18, 24, 30].map((x) => (
        <line key={x} x1={x} y1="26" x2={x} y2="40" stroke="#334155" strokeWidth="0.8" />
      ))}
    </Sym>
  );
}

function EvSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#ccfbf1" />
      <path
        d="M10 28h26l-3-8H13l-3 8z"
        fill="#0d9488"
        stroke="#115e59"
        strokeWidth="1"
      />
      <circle cx="16" cy="30" r="3" fill="#1e293b" />
      <circle cx="32" cy="30" r="3" fill="#1e293b" />
      <path d="M28 18h6v4h-6z" fill="#fbbf24" />
      <path d="M30 16v-4h2v4" stroke="#fbbf24" strokeWidth="1.5" />
    </Sym>
  );
}

function BuildingSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#ffedd5" />
      <rect x="14" y="10" width="20" height="30" rx="1" fill="#94a3b8" />
      <rect x="18" y="14" width="4" height="4" fill="#bae6fd" />
      <rect x="26" y="14" width="4" height="4" fill="#bae6fd" />
      <rect x="18" y="22" width="4" height="4" fill="#bae6fd" />
      <rect x="26" y="22" width="4" height="4" fill="#bae6fd" />
      <path d="M22 34h4v6h-4z" fill="#64748b" />
      <circle cx="36" cy="16" r="5" fill="#f97316" opacity="0.85" />
    </Sym>
  );
}

function SmartCitySymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#e0f2fe" />
      <circle cx="24" cy="24" r="4" fill="#0284c7" />
      <circle cx="12" cy="16" r="3" fill="#38bdf8" />
      <circle cx="36" cy="16" r="3" fill="#38bdf8" />
      <circle cx="12" cy="32" r="3" fill="#38bdf8" />
      <circle cx="36" cy="32" r="3" fill="#38bdf8" />
      <path d="M15 18 L21 22 M33 18 L27 22 M15 30 L21 26 M33 30 L27 26" stroke="#0ea5e9" strokeWidth="1.2" />
    </Sym>
  );
}

function TransportSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#dbeafe" />
      <path d="M6 30h36" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 30 L6 34 L42 34 L42 30" stroke="#94a3b8" strokeWidth="1" fill="none" />
      <rect x="14" y="20" width="20" height="10" rx="2" fill="#2563eb" />
      <circle cx="18" cy="32" r="2.5" fill="#1e293b" />
      <circle cx="30" cy="32" r="2.5" fill="#1e293b" />
    </Sym>
  );
}

function GreenInfraSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#ecfccb" />
      <path d="M24 36 C18 28 14 20 24 10 C34 20 30 28 24 36Z" fill="#22c55e" />
      <path d="M8 36 Q16 32 24 34 T40 36" fill="none" stroke="#06b6d4" strokeWidth="2" />
      <ellipse cx="24" cy="38" rx="14" ry="2" fill="#84cc16" opacity="0.4" />
    </Sym>
  );
}

function PublicWorksSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#f3e8ff" />
      <path d="M18 14 L24 8 L30 14 L28 14 L28 22 L20 22 L20 14 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
      <rect x="16" y="22" width="16" height="4" fill="#a855f7" />
      <path d="M14 34 L20 26 L26 32 L34 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
    </Sym>
  );
}

function ForestSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#14532d" />
      <path d="M14 34 L20 18 L24 26 L28 16 L34 34 Z" fill="#22c55e" />
      <path d="M10 34h28" stroke="#86efac" strokeWidth="1.5" />
    </Sym>
  );
}

function AgricultureSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#fef3c7" />
      <path d="M24 10 C20 18 18 24 24 36 C30 24 28 18 24 10Z" fill="#ca8a04" />
      <path d="M24 36 L24 40" stroke="#92400e" strokeWidth="2" />
      <ellipse cx="24" cy="40" rx="12" ry="2" fill="#a16207" opacity="0.4" />
    </Sym>
  );
}

function WaterSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#0c4a6e" />
      <path
        d="M24 12 C24 12 14 24 14 30 C14 35 18 38 24 38 C30 38 34 35 34 30 C34 24 24 12 24 12Z"
        fill="#38bdf8"
      />
    </Sym>
  );
}

function MethaneSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#faf5ff" />
      <ellipse cx="24" cy="28" rx="14" ry="10" fill="#c4b5fd" opacity="0.6" />
      <text x="24" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5b21b6">
        CH₄
      </text>
    </Sym>
  );
}

function IndustrialSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#f1f5f9" />
      <rect x="10" y="22" width="28" height="14" fill="#64748b" />
      <rect x="14" y="12" width="6" height="10" fill="#94a3b8" />
      <rect x="24" y="8" width="6" height="14" fill="#94a3b8" />
      <path d="M16 12 Q20 6 24 10 T32 8" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.7" />
    </Sym>
  );
}

function FireSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#1c1917" />
      <path d="M24 38 C20 32 18 26 22 18 C24 22 26 14 28 20 C32 26 30 32 24 38Z" fill="#f97316" />
      <path d="M24 36 C22 32 21 28 23 24 C24 27 25 22 26 26 C28 30 27 33 24 36Z" fill="#fde047" />
    </Sym>
  );
}

function HabitatSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#ecfdf5" />
      <ellipse cx="24" cy="30" rx="16" ry="8" fill="#86efac" />
      <path d="M18 28 C20 20 22 16 24 12 C26 16 28 20 30 28" fill="#15803d" />
      <circle cx="32" cy="18" r="4" fill="#f472b6" opacity="0.9" />
    </Sym>
  );
}

function SupplyChainSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#fff7ed" />
      <rect x="8" y="16" width="12" height="12" rx="1" fill="#d97706" />
      <rect x="18" y="22" width="12" height="12" rx="1" fill="#ea580c" />
      <rect x="28" y="16" width="12" height="12" rx="1" fill="#f97316" />
      <path d="M14 22 L22 26 L34 22" stroke="#9a3412" strokeWidth="1.5" fill="none" />
    </Sym>
  );
}

function CommunitySymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#fdf4ff" />
      <circle cx="16" cy="20" r="5" fill="#f9a8d4" />
      <circle cx="32" cy="20" r="5" fill="#93c5fd" />
      <circle cx="24" cy="12" r="5" fill="#86efac" />
      <path d="M10 34 Q24 28 38 34" fill="none" stroke="#a855f7" strokeWidth="2" />
    </Sym>
  );
}

function AiSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#0f172a" />
      <rect x="12" y="14" width="24" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
      <circle cx="19" cy="22" r="2" fill="#22d3ee" />
      <circle cx="29" cy="22" r="2" fill="#22d3ee" />
      <path d="M18 28 Q24 32 30 28" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
    </Sym>
  );
}

function DefaultSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="24" fill="#e8f0f7" />
      <path
        d="M24 10 L32 14 V22 C32 30 24 36 24 36 C24 36 16 30 16 22 V14 Z"
        fill="#1e3a5f"
        stroke="#152a47"
        strokeWidth="0.8"
      />
      <path d="M20 24 L23 27 L29 19" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Sym>
  );
}

const SYMBOL_MAP: Record<DmrvTypeSymbolKey, React.FC<SymProps>> = {
  urban: UrbanSymbol,
  solar: SolarSymbol,
  ev: EvSymbol,
  building: BuildingSymbol,
  'smart-city': SmartCitySymbol,
  transport: TransportSymbol,
  'green-infra': GreenInfraSymbol,
  'public-works': PublicWorksSymbol,
  forest: ForestSymbol,
  agriculture: AgricultureSymbol,
  grassland: AgricultureSymbol,
  soil: AgricultureSymbol,
  peatland: WaterSymbol,
  afolu: ForestSymbol,
  redd: ForestSymbol,
  integrity: DefaultSymbol,
  wetland: WaterSymbol,
  coastal: WaterSymbol,
  watershed: WaterSymbol,
  marine: WaterSymbol,
  'water-quality': WaterSymbol,
  treatment: IndustrialSymbol,
  flood: WaterSymbol,
  drought: WaterSymbol,
  industrial: IndustrialSymbol,
  'air-quality': MethaneSymbol,
  methane: MethaneSymbol,
  compliance: DefaultSymbol,
  waste: IndustrialSymbol,
  circular: SupplyChainSymbol,
  toxic: IndustrialSymbol,
  habitat: HabitatSymbol,
  species: HabitatSymbol,
  restoration: HabitatSymbol,
  protected: HabitatSymbol,
  nature: HabitatSymbol,
  wildfire: FireSymbol,
  heat: FireSymbol,
  disaster: FireSymbol,
  resilience: DefaultSymbol,
  warning: FireSymbol,
  'supply-chain': SupplyChainSymbol,
  timber: ForestSymbol,
  mining: IndustrialSymbol,
  commodity: AgricultureSymbol,
  esg: SupplyChainSymbol,
  greenwash: SupplyChainSymbol,
  offset: DefaultSymbol,
  citizen: CommunitySymbol,
  justice: CommunitySymbol,
  health: CommunitySymbol,
  housing: BuildingSymbol,
  qr: DefaultSymbol,
  ai: AiSymbol,
  blockchain: DefaultSymbol,
  drone: AiSymbol,
  fusion: AiSymbol,
  default: DefaultSymbol,
};

const TYPE_ID_MAP: Record<string, DmrvTypeSymbolKey> = {
  'urban-built': 'urban',
  'renewable-energy': 'solar',
  'ev-mobility': 'ev',
  'building-efficiency': 'building',
  'smart-city': 'smart-city',
  'transport-emissions': 'transport',
  'green-infrastructure': 'green-infra',
  'public-works': 'public-works',
  'forest-land-use': 'forest',
  agriculture: 'agriculture',
  'grassland-savanna': 'grassland',
  'soil-restoration': 'soil',
  'peatland-boreal': 'peatland',
  'afolu-land-carbon': 'afolu',
  'redd-plus': 'redd',
  'carbon-project-integrity': 'integrity',
  'wetland-blue-carbon': 'wetland',
  'coastal-mangrove': 'coastal',
  'freshwater-watershed': 'watershed',
  'marine-ocean': 'marine',
  'water-quality': 'water-quality',
  'water-treatment': 'treatment',
  'flood-hydrology': 'flood',
  'drought-water-stress': 'drought',
  'industrial-facility': 'industrial',
  'air-quality': 'air-quality',
  'methane-fugitive': 'methane',
  'regulatory-carb': 'compliance',
  'hazardous-waste': 'waste',
  'greenwashing-detection': 'greenwash',
};

export function resolveTypeSymbolKey(typeId: string, title: string): DmrvTypeSymbolKey {
  if (TYPE_ID_MAP[typeId]) return TYPE_ID_MAP[typeId];
  const lower = `${typeId} ${title}`.toLowerCase();
  const rules: [DmrvTypeSymbolKey, RegExp][] = [
    ['urban', /urban|built environment|city map/],
    ['solar', /renewable|solar|wind|generation/],
    ['ev', /ev |electric|mobility|charger/],
    ['building', /building|retrofit|thermal/],
    ['smart-city', /smart city|sensor feed/],
    ['transport', /transport|fleet|traffic|congestion/],
    ['green-infra', /green infra|bioswale|canopy|stormwater/],
    ['public-works', /public work|maintenance|repair/],
    ['forest', /forest|deforestation|redd|afolu|timber/],
    ['agriculture', /agricultur|crop|soil carbon|grassland|grazing/],
    ['wetland', /wetland|mangrove|blue carbon|seagrass/],
    ['marine', /marine|ocean|hyperspectral|pace/],
    ['flood', /flood|hydrolog/],
    ['drought', /drought|water stress/],
    ['methane', /methane|ch₄|fugitive/],
    ['industrial', /industrial|facility|stack|cems/],
    ['wildfire', /wildfire|fire|burn/],
    ['habitat', /biodiversity|habitat|species|reef|pollinator/],
    ['supply-chain', /supply chain|traceability|commodity|esg|greenwash/],
    ['citizen', /community|citizen|justice|accountability/],
    ['ai', /custom|anomaly|fusion|drone/],
  ];
  for (const [key, re] of rules) {
    if (re.test(lower)) return key;
  }
  return 'default';
}

export type DmrvTypeSymbolProps = {
  typeId: string;
  title: string;
  size?: number;
  ringColor?: string;
  className?: string;
};

export function DmrvTypeSymbol({
  typeId,
  title,
  size = 44,
  ringColor,
  className,
}: DmrvTypeSymbolProps): React.ReactElement {
  const key = resolveTypeSymbolKey(typeId, title);
  const Symbol = SYMBOL_MAP[key] ?? DefaultSymbol;
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md ${className ?? ''}`}
      style={ringColor ? { boxShadow: `0 2px 10px ${ringColor}44` } : undefined}
      title={title}
    >
      <Symbol size={size} />
    </span>
  );
}
