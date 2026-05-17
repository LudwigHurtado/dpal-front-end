import React, { createContext, useContext, useId } from 'react';

export type DmrvInputSymbolKey =
  | 'satellite'
  | 'lidar'
  | 'field-plot'
  | 'biomass'
  | 'activity'
  | 'soil-sample'
  | 'iot-sensor'
  | 'management'
  | 'weather'
  | 'field-survey'
  | 'fire'
  | 'grazing'
  | 'drone'
  | 'erosion'
  | 'moisture'
  | 'methane'
  | 'water-table'
  | 'parcel'
  | 'baseline'
  | 'patrol'
  | 'leakage'
  | 'community'
  | 'documents'
  | 'validator'
  | 'registry'
  | 'sensor-station'
  | 'tide'
  | 'sediment'
  | 'gauge'
  | 'land-cover'
  | 'rainfall'
  | 'hyperspectral'
  | 'ocean'
  | 'lab'
  | 'permit'
  | 'flood'
  | 'energy'
  | 'stack'
  | 'infrared'
  | 'manifest'
  | 'acoustic'
  | 'camera-trap'
  | 'reef'
  | 'pollinator'
  | 'restoration'
  | 'thermal'
  | 'traffic'
  | 'plastic'
  | 'health'
  | 'blockchain'
  | 'qr'
  | 'default';

const GradIdContext = createContext('dmrv-sym');

type SymProps = { size?: number; className?: string };

function Sym({ size = 40, className, children }: SymProps & { children: React.ReactNode }): React.ReactElement {
  const gradId = useContext(GradIdContext);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id={`${gradId}-sky`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id={`${gradId}-earth`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <radialGradient id={`${gradId}-glow`} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {children}
    </svg>
  );
}

function SatelliteSymbol({ size, className }: SymProps): React.ReactElement {
  const gradId = useContext(GradIdContext);
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill={`url(#${gradId}-sky)`} />
      <circle cx="24" cy="30" r="11" fill={`url(#${gradId}-earth)`} />
      <ellipse cx="20" cy="26" rx="4" ry="2.5" fill="#86efac" opacity="0.85" />
      <path
        d="M8 14h32l-4 8H12l-4-8z"
        fill="#64748b"
        stroke="#334155"
        strokeWidth="0.8"
      />
      <rect x="14" y="10" width="20" height="5" rx="1" fill="#94a3b8" />
      <circle cx="34" cy="12" r="2.5" fill="#fbbf24" />
      <path d="M34 9v-3M34 17v2M39 12h3M29 12h-3" stroke="#fbbf24" strokeWidth="1.2" />
    </Sym>
  );
}

function LidarSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#ecfdf5" />
      <path d="M6 38 L24 8 L42 38 Z" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
      <path d="M12 34 L24 14 L36 34" fill="none" stroke="#059669" strokeWidth="2" />
      <circle cx="24" cy="22" r="3" fill="#ef4444" />
      <path d="M24 22 L8 36 M24 22 L40 36 M24 22 L24 40" stroke="#ef4444" strokeWidth="1" opacity="0.7" />
      {[14, 20, 28, 34].map((x) => (
        <circle key={x} cx={x} cy={32 + (x % 3)} r="1.2" fill="#047857" opacity="0.8" />
      ))}
    </Sym>
  );
}

function FieldPlotSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f0fdf4" />
      <path d="M4 34 Q14 28 24 32 T44 30 L44 40 L4 40 Z" fill="#86efac" />
      <path d="M4 34 Q14 28 24 32 T44 30" fill="none" stroke="#16a34a" strokeWidth="1.5" />
      <path d="M16 20v14M32 18v16" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="16" cy="18" r="2" fill="#dc2626" />
      <circle cx="32" cy="16" r="2" fill="#dc2626" />
      <rect x="14" y="28" width="20" height="8" fill="none" stroke="#ca8a04" strokeWidth="1" strokeDasharray="2 1" />
    </Sym>
  );
}

function BiomassSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#ecfccb" />
      <ellipse cx="24" cy="36" rx="16" ry="4" fill="#84cc16" opacity="0.4" />
      <path d="M24 38 C18 30 14 22 24 10 C34 22 30 30 24 38Z" fill="#22c55e" />
      <path d="M24 32 C20 26 18 20 24 14 C30 20 28 26 24 32Z" fill="#15803d" />
      <circle cx="24" cy="22" r="6" fill="none" stroke="#365314" strokeWidth="1.2" opacity="0.6" />
    </Sym>
  );
}

function ActivitySymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f8fafc" />
      <rect x="8" y="10" width="32" height="22" rx="3" fill="#1e293b" />
      <path d="M12 26 L16 18 L20 24 L24 14 L28 22 L32 16 L36 26" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="14" r="3" fill="#22c55e" />
    </Sym>
  );
}

function SoilSampleSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#fef3c7" />
      <rect x="18" y="8" width="12" height="28" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
      <rect x="19" y="18" width="10" height="6" fill="#92400e" />
      <rect x="19" y="26" width="10" height="6" fill="#a16207" />
      <rect x="19" y="34" width="10" height="4" fill="#713f12" />
      <ellipse cx="24" cy="40" rx="10" ry="2" fill="#000" opacity="0.15" />
    </Sym>
  );
}

function IotSensorSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f0f9ff" />
      <rect x="20" y="28" width="8" height="12" fill="#64748b" />
      <rect x="16" y="12" width="16" height="16" rx="2" fill="#0ea5e9" stroke="#0369a1" strokeWidth="1" />
      <circle cx="24" cy="18" r="3" fill="#e0f2fe" />
      <path d="M24 8v4M24 24v2" stroke="#64748b" strokeWidth="1.5" />
      <path d="M8 20h6M34 20h6" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    </Sym>
  );
}

function ManagementSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#fff7ed" />
      <rect x="10" y="8" width="28" height="32" rx="2" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
      <path d="M14 16h20M14 22h16M14 28h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="28" y="12" width="8" height="8" rx="1" fill="#f97316" />
      <path d="M30 14l2 2 4-4" stroke="#fff" strokeWidth="1.2" fill="none" />
    </Sym>
  );
}

function WeatherSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#e0f2fe" />
      <circle cx="18" cy="20" r="7" fill="#fde047" />
      <path
        d="M14 28c0-4 3-7 8-7 5 0 9 3 9 8 0 5-4 9-9 9h-6c-5 0-8-4-8-8z"
        fill="#94a3b8"
        stroke="#64748b"
        strokeWidth="0.8"
      />
      <path d="M30 14l2 3 4-5" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
    </Sym>
  );
}

function FireSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#1c1917" />
      <path d="M24 38 C20 32 18 26 22 18 C24 22 26 14 28 20 C32 26 30 32 24 38Z" fill="#f97316" />
      <path d="M24 36 C22 32 21 28 23 24 C24 27 25 22 26 26 C28 30 27 33 24 36Z" fill="#fde047" />
      <ellipse cx="24" cy="40" rx="14" ry="2" fill="#f97316" opacity="0.4" />
    </Sym>
  );
}

function GrazingSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#ecfccb" />
      <ellipse cx="24" cy="38" rx="18" ry="5" fill="#84cc16" />
      <ellipse cx="16" cy="28" rx="7" ry="5" fill="#a8a29e" />
      <ellipse cx="30" cy="27" rx="8" ry="5" fill="#d6d3d1" />
      <circle cx="12" cy="24" r="2" fill="#1c1917" />
      <circle cx="34" cy="23" r="2" fill="#1c1917" />
    </Sym>
  );
}

function DroneSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f1f5f9" />
      <ellipse cx="24" cy="26" rx="14" ry="3" fill="#000" opacity="0.12" />
      <rect x="20" y="20" width="8" height="4" rx="1" fill="#334155" />
      <circle cx="10" cy="14" r="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <circle cx="38" cy="14" r="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <circle cx="10" cy="30" r="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <circle cx="38" cy="30" r="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <rect x="22" y="16" width="4" height="6" fill="#64748b" />
    </Sym>
  );
}

function ErosionSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#fef3c7" />
      <path d="M4 36 L44 36 L40 20 L28 24 L20 14 L12 28 L4 36Z" fill="#d97706" />
      <path d="M4 36 L44 36" stroke="#92400e" strokeWidth="1.5" />
      <path d="M20 14 L28 24" stroke="#1c1917" strokeWidth="1" strokeDasharray="2 1" opacity="0.4" />
    </Sym>
  );
}

function MoistureSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#ecfeff" />
      <path
        d="M24 10 C24 10 14 22 14 28 C14 33 18 36 24 36 C30 36 34 33 34 28 C34 22 24 10 24 10Z"
        fill="#06b6d4"
        stroke="#0891b2"
        strokeWidth="1"
      />
      <ellipse cx="24" cy="30" rx="6" ry="3" fill="#67e8f9" opacity="0.6" />
    </Sym>
  );
}

function MethaneSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#faf5ff" />
      <ellipse cx="24" cy="30" rx="12" ry="8" fill="#c4b5fd" opacity="0.5" />
      <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b21b6">
        CH₄
      </text>
      <path d="M14 18 Q24 8 34 18" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.6" />
    </Sym>
  );
}

function GaugeSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#eff6ff" />
      <rect x="20" y="10" width="8" height="26" fill="#94a3b8" />
      <rect x="14" y="34" width="20" height="4" rx="1" fill="#64748b" />
      <path d="M24 32 L24 18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="32" r="3" fill="#1e293b" />
    </Sym>
  );
}

function DocumentsSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f8fafc" />
      <rect x="12" y="8" width="22" height="28" rx="2" fill="#fff" stroke="#94a3b8" strokeWidth="1" />
      <rect x="16" y="12" width="22" height="28" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
      <path d="M20 18h14M20 24h10M20 30h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </Sym>
  );
}

function CommunitySymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#fdf4ff" />
      <circle cx="16" cy="22" r="5" fill="#f9a8d4" />
      <circle cx="32" cy="22" r="5" fill="#93c5fd" />
      <circle cx="24" cy="14" r="5" fill="#86efac" />
      <path d="M12 32 Q24 26 36 32" fill="none" stroke="#a855f7" strokeWidth="1.5" />
    </Sym>
  );
}

function ValidatorSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#ecfdf5" />
      <path
        d="M24 8 L30 12 L30 22 C30 30 24 36 24 36 C24 36 18 30 18 22 L18 12 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1"
      />
      <path d="M20 24 L23 27 L29 19" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </Sym>
  );
}

function OceanSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#0c4a6e" />
      <path d="M0 28 Q12 24 24 28 T48 26 L48 48 L0 48 Z" fill="#0284c7" />
      <path d="M0 32 Q12 28 24 32 T48 30" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />
      <circle cx="36" cy="18" r="5" fill="#fde047" opacity="0.9" />
      <path d="M8 20 Q16 16 24 20" fill="#164e63" opacity="0.5" />
    </Sym>
  );
}

function HyperspectralSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#0f172a" />
      {[8, 16, 24, 32, 40].map((x, i) => (
        <rect key={x} x={x - 2} y={12} width="4" height="24" fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][i]} opacity="0.85" />
      ))}
      <path d="M6 38h36" stroke="#fff" strokeWidth="1" opacity="0.4" />
    </Sym>
  );
}

function LabSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f0fdf4" />
      <path d="M18 10h12v6H18z" fill="#e2e8f0" stroke="#64748b" />
      <path d="M20 16v18" stroke="#64748b" strokeWidth="2" />
      <ellipse cx="20" cy="36" rx="4" ry="2" fill="#22c55e" opacity="0.6" />
      <circle cx="32" cy="28" r="6" fill="#a7f3d0" stroke="#059669" strokeWidth="1" />
    </Sym>
  );
}

function BlockchainInputSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#e8f0f7" />
      <rect x="8" y="14" width="12" height="12" rx="2" fill="#1e3a5f" opacity="0.95" />
      <rect x="28" y="14" width="12" height="12" rx="2" fill="#4a86cf" opacity="0.85" />
      <rect x="18" y="26" width="12" height="12" rx="2" fill="#2a9d8f" opacity="0.9" />
      <path
        d="M20 20h8M32 20h-4v4M16 26h2v4"
        stroke="#64748b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="10" r="2" fill="#22d3ee" />
      <path d="M24 12v2" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
    </Sym>
  );
}

function QrSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f8fafc" />
      <rect x="10" y="10" width="12" height="12" rx="1" fill="#1e293b" />
      <rect x="26" y="10" width="12" height="12" rx="1" fill="#1e293b" />
      <rect x="10" y="26" width="12" height="12" rx="1" fill="#1e293b" />
      <rect x="14" y="14" width="4" height="4" fill="#fff" />
      <rect x="30" y="14" width="4" height="4" fill="#fff" />
      <rect x="14" y="30" width="4" height="4" fill="#fff" />
      <path d="M28 28h8v8h-8z" fill="none" stroke="#1e293b" strokeWidth="1.5" />
    </Sym>
  );
}

function DefaultSymbol({ size, className }: SymProps): React.ReactElement {
  return (
    <Sym size={size} className={className}>
      <rect width="48" height="48" rx="8" fill="#f1f5f9" />
      <rect x="12" y="10" width="24" height="28" rx="3" fill="#fff" stroke="#cbd5e1" strokeWidth="1.2" />
      <path d="M16 18h16M16 24h12M16 30h14" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    </Sym>
  );
}

const SYMBOL_MAP: Record<DmrvInputSymbolKey, React.FC<SymProps>> = {
  satellite: SatelliteSymbol,
  lidar: LidarSymbol,
  'field-plot': FieldPlotSymbol,
  biomass: BiomassSymbol,
  activity: ActivitySymbol,
  'soil-sample': SoilSampleSymbol,
  'iot-sensor': IotSensorSymbol,
  management: ManagementSymbol,
  weather: WeatherSymbol,
  'field-survey': FieldPlotSymbol,
  fire: FireSymbol,
  grazing: GrazingSymbol,
  drone: DroneSymbol,
  erosion: ErosionSymbol,
  moisture: MoistureSymbol,
  methane: MethaneSymbol,
  'water-table': MoistureSymbol,
  parcel: FieldPlotSymbol,
  baseline: DocumentsSymbol,
  patrol: CommunitySymbol,
  leakage: ErosionSymbol,
  community: CommunitySymbol,
  documents: DocumentsSymbol,
  validator: ValidatorSymbol,
  registry: DocumentsSymbol,
  'sensor-station': IotSensorSymbol,
  tide: OceanSymbol,
  sediment: ErosionSymbol,
  gauge: GaugeSymbol,
  'land-cover': FieldPlotSymbol,
  rainfall: WeatherSymbol,
  hyperspectral: HyperspectralSymbol,
  ocean: OceanSymbol,
  lab: LabSymbol,
  permit: DocumentsSymbol,
  flood: GaugeSymbol,
  energy: ActivitySymbol,
  stack: FireSymbol,
  infrared: HyperspectralSymbol,
  manifest: DocumentsSymbol,
  acoustic: IotSensorSymbol,
  'camera-trap': DroneSymbol,
  reef: OceanSymbol,
  pollinator: BiomassSymbol,
  restoration: BiomassSymbol,
  thermal: FireSymbol,
  traffic: ActivitySymbol,
  plastic: HyperspectralSymbol,
  health: LabSymbol,
  blockchain: BlockchainInputSymbol,
  qr: QrSymbol,
  default: DefaultSymbol,
};

/** Resolve infographic input label → symbol key (longest match first). */
export function resolveInputSymbolKey(label: string): DmrvInputSymbolKey {
  const lower = label.toLowerCase();
  const rules: [DmrvInputSymbolKey, RegExp][] = [
    ['hyperspectral', /hyperspectral|pace|emit|ocean color/],
    ['lidar', /lidar|laser/],
    ['methane', /methane|ch₄|ch4|n₂o|n2o/],
    ['satellite', /satellite|landsat|sentinel|orbital|burn scar|before\/after imagery/],
    ['drone', /drone|uav|aerial photo/],
    ['iot-sensor', /iot|sensor station|sensor feed|smap|grace/],
    ['gauge', /gauge|usgs|nws|hydro|stream|reservoir/],
    ['fire', /fire|firms|burn|wildfire|flame/],
    ['grazing', /grazing|cattle|rangeland|livestock/],
    ['flood', /flood|inundation/],
    ['weather', /weather|rainfall|wind|air temp|forecast/],
    ['ocean', /ocean|marine|reef|mangrove|coastal|tide|seagrass|wetland/],
    ['soil-sample', /soil sample|soil core|soil carbon/],
    ['moisture', /moisture|drought|water table|irrigation/],
    ['erosion', /erosion|sediment|runoff/],
    ['biomass', /biomass|canopy|ndvi|forest|tree|pollinator|habitat map/],
    ['field-survey', /field survey|field validation|field photo|patrol|dive survey|sightings/],
    ['field-plot', /field plot|plot|parcel|aoi|boundary|corridor/],
    ['lab', /lab |laboratory|health|exposure map|sample/],
    ['blockchain', /blockchain|block chain|hash record|blockchain hash|blockchain proof|audit trail|timestamp log|chain of custody|immutable|ledger|sha-?256|evidence hash/],
    ['qr', /qr page|qr evidence|qr record/],
    ['validator', /validator|audit|review|compliance/],
    ['community', /community|citizen|shelter|demographic/],
    ['registry', /registry|manifest|permit|records|documents|project doc|claims/],
    ['leakage', /leakage|leak|plume|fugitive/],
    ['stack', /stack|cems|emission|industrial|facility/],
    ['thermal', /thermal|heat|uhi|temperature/],
    ['infrared', /infrared|thermal imagery/],
    ['traffic', /traffic|mobility/],
    ['plastic', /plastic|debris|cleanup/],
    ['acoustic', /acoustic|sound/],
    ['camera-trap', /camera trap/],
    ['energy', /energy|meter|process data|energy use|utility record|equipment data/],
    ['management', /building data|building record|retrofit record/],
    ['traffic', /traffic|mobility data|route analytic|fleet record|charger map|fleet data/],
    ['erosion', /stormwater|bioswale|canopy map|surface map/],
    ['documents', /work order|inspection report|completion record|site photo|project map|performance report|service log/],
    ['management', /management|practice|intervention|activity record|project record/],
    ['baseline', /baseline/],
    ['activity', /activity|carbon factor|emission factor|production/],
    ['land-cover', /land-cover|land cover/],
    ['restoration', /restoration|recovery|regrowth/],
    ['parcel', /parcel/],
    ['patrol', /patrol/],
    ['permit', /permit|discharge|inspection/],
    ['documents', /document|report|record|evidence|claim|filing/],
  ];
  for (const [key, re] of rules) {
    if (re.test(lower)) return key;
  }
  return 'default';
}

export type DmrvInputSymbolProps = {
  label: string;
  size?: number;
  accentColor?: string;
  className?: string;
};

export function DmrvInputSymbol({
  label,
  size = 44,
  accentColor,
  className,
}: DmrvInputSymbolProps): React.ReactElement {
  const gradId = useId().replace(/:/g, '');
  const key = resolveInputSymbolKey(label);
  const Symbol = SYMBOL_MAP[key] ?? DefaultSymbol;
  return (
    <GradIdContext.Provider value={gradId}>
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-slate-200/90 ${className ?? ''}`}
        style={
          accentColor
            ? { boxShadow: `0 2px 8px ${accentColor}33`, borderColor: `${accentColor}55` }
            : undefined
        }
        title={label}
      >
        <Symbol size={size} />
      </span>
    </GradIdContext.Provider>
  );
}
