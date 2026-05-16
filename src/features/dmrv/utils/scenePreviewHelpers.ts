export type ScenePreviewMode =
  | 'optical'
  | 'radar'
  | 'lidar'
  | 'water'
  | 'hyperspectral'
  | 'thermal'
  | 'generic';

export type ScenePreviewConfig = {
  provider?: string;
  product?: string;
  dateStart?: string;
  dateEnd?: string;
  cloudCover?: number | string;
  resolution?: string;
  minimumCoverage?: number | string;
  aoiRequired?: boolean;
  refreshFrequency?: string;
  dmrvTypeId?: string;
  dmrvTypeName?: string;
  aoiExists?: boolean;
};

export type SceneChecklistItem = {
  id: string;
  label: string;
  status: 'complete' | 'warning' | 'pending';
};

const OPTICAL_HINTS = ['landsat', 'sentinel-2', 'sentinel2', 'oli', 'optical', 'ndvi', 'modis'];
const RADAR_HINTS = ['sentinel-1', 'sentinel1', 'sar', 'radar', 'vv', 'vh'];
const LIDAR_HINTS = ['lidar', 'point cloud', 'point-cloud', 'chm', 'canopy height'];
const WATER_HINTS = ['water', 'ocean', 'marine', 'aquatic', 'ndwi', 'pace', 'chlorophyll'];
const HYPERSPECTRAL_HINTS = ['hyperspectral', 'emit', 'pace', 'spectral', 'plastic'];
const THERMAL_HINTS = ['thermal', 'lst', 'temperature', 'heat'];

function norm(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function haystack(config: ScenePreviewConfig): string {
  return [config.provider, config.product, config.dmrvTypeId, config.dmrvTypeName]
    .map(norm)
    .join(' ');
}

export function getScenePreviewMode(
  provider?: string,
  product?: string,
  dmrvTypeId?: string,
): ScenePreviewMode {
  const text = [provider, product, dmrvTypeId].map(norm).join(' ');
  if (RADAR_HINTS.some((h) => text.includes(h))) return 'radar';
  if (LIDAR_HINTS.some((h) => text.includes(h))) return 'lidar';
  if (WATER_HINTS.some((h) => text.includes(h))) return 'water';
  if (HYPERSPECTRAL_HINTS.some((h) => text.includes(h))) return 'hyperspectral';
  if (THERMAL_HINTS.some((h) => text.includes(h))) return 'thermal';
  if (OPTICAL_HINTS.some((h) => text.includes(h))) return 'optical';
  return 'generic';
}

function cadenceLabel(freq?: string): string {
  const f = norm(freq);
  if (f === 'daily') return 'daily';
  if (f === 'weekly') return 'weekly';
  if (f === 'quarterly') return 'quarterly';
  if (f === 'on_demand') return 'on-demand';
  return 'monthly';
}

function resolutionDetail(resolution?: string): string {
  const r = norm(resolution);
  if (!r) return 'resolution not specified';
  if (r.includes('10') || r.includes('high')) return 'higher-detail imagery';
  if (r.includes('30') || r.includes('moderate')) return 'moderate-detail land-cover analysis';
  if (r.includes('250') || r.includes('coarse')) return 'broader-area screening at coarser resolution';
  return `${resolution} resolution`;
}

function cloudDetail(cloudCover?: number | string): string {
  const raw = String(cloudCover ?? '').trim();
  if (!raw) return 'cloud filtering not specified';
  const n = Number(raw);
  if (Number.isFinite(n)) {
    if (n <= 15) return `a ${n}% cloud threshold prioritizes cleaner scenes`;
    if (n <= 30) return `a ${n}% cloud threshold balances scene availability and clarity`;
    return `a ${n}% cloud threshold favors more scene candidates with possible cloud contamination`;
  }
  return `cloud cover limited to ${raw}`;
}

export function getSceneSummaryText(config: ScenePreviewConfig): string {
  const mode = getScenePreviewMode(config.provider, config.product, config.dmrvTypeId);
  const providerLabel = config.provider?.trim() || 'your selected provider';
  const productLabel = config.product?.trim() || 'the chosen collection';
  const typeLabel = config.dmrvTypeName?.trim() || 'this DMRV workflow';
  const cadence = cadenceLabel(config.refreshFrequency);
  const minCov = String(config.minimumCoverage ?? '').trim();
  const minCovText = minCov ? `Minimum AOI coverage is set to ${minCov}%.` : 'Minimum AOI coverage is not set yet.';

  const modePhrase: Record<ScenePreviewMode, string> = {
    optical: 'optical vegetation and land-cover monitoring',
    radar: 'radar (SAR) monitoring that can penetrate many cloud conditions',
    lidar: 'LiDAR / height-based structural monitoring',
    water: 'water and ocean-surface screening',
    hyperspectral: 'hyperspectral / spectral fingerprint screening',
    thermal: 'thermal / heat-signal screening',
    generic: 'multi-purpose scene search',
  };

  const dateText =
    config.dateStart && config.dateEnd
      ? `The date window ${config.dateStart} through ${config.dateEnd} frames which scenes can be queried.`
      : 'Set start and end dates to define which scenes can be queried.';

  return (
    `This configuration prepares a ${cadence} ${modePhrase[mode]} workflow for ${typeLabel} using ${providerLabel} and ${productLabel}. ` +
    `${cloudDetail(config.cloudCover).replace(/^a /, 'A ')} supports ${resolutionDetail(config.resolution)}. ` +
    `${minCovText} ${dateText} ` +
    'Preview based on current configuration — no scene catalog query has run yet.'
  );
}

export function getSceneImpactChips(config: ScenePreviewConfig): string[] {
  const chips = new Set<string>();
  const mode = getScenePreviewMode(config.provider, config.product, config.dmrvTypeId);
  const stack = haystack(config);
  const cloud = Number(String(config.cloudCover ?? '').replace(/%/g, ''));
  const res = norm(config.resolution);
  const minCov = String(config.minimumCoverage ?? '').trim();
  const freq = norm(config.refreshFrequency);

  if (mode === 'optical' || OPTICAL_HINTS.some((h) => stack.includes(h))) chips.add('Optical imagery');
  if (mode === 'radar' || RADAR_HINTS.some((h) => stack.includes(h))) chips.add('Radar imagery');
  if (mode === 'optical' || stack.includes('forest') || stack.includes('ndvi')) chips.add('Vegetation monitoring');
  if (config.dateStart && config.dateEnd) chips.add('Historical baseline');
  if (freq === 'monthly') chips.add('Monthly cadence');
  else if (freq === 'weekly') chips.add('Weekly cadence');
  else if (freq === 'daily') chips.add('Daily cadence');
  else if (freq === 'quarterly') chips.add('Quarterly cadence');
  else if (freq === 'on_demand') chips.add('On-demand refresh');
  if (Number.isFinite(cloud) && cloud <= 25) chips.add('Cloud sensitive');
  if (res.includes('10') || res.includes('high')) chips.add('High detail');
  else if (res) chips.add('Moderate detail');
  if (config.aoiRequired) chips.add('AOI required');
  if (minCov) chips.add('Coverage filter enabled');
  if (mode === 'water') chips.add('Water screening');
  if (mode === 'hyperspectral') chips.add('Spectral screening');
  if (mode === 'thermal') chips.add('Thermal screening');

  return Array.from(chips);
}

export function getSceneChecklist(config: ScenePreviewConfig): SceneChecklistItem[] {
  const hasProvider = Boolean(config.provider?.trim());
  const hasProduct = Boolean(config.product?.trim());
  const hasDates = Boolean(config.dateStart?.trim() && config.dateEnd?.trim());
  const hasCoverageRules =
    Boolean(String(config.cloudCover ?? '').trim()) &&
    Boolean(config.resolution?.trim()) &&
    Boolean(String(config.minimumCoverage ?? '').trim());
  const aoiNeeded = Boolean(config.aoiRequired);
  const aoiOk = !aoiNeeded || Boolean(config.aoiExists);

  const items: SceneChecklistItem[] = [
    {
      id: 'provider',
      label: 'Provider selected',
      status: hasProvider ? 'complete' : 'pending',
    },
    {
      id: 'product',
      label: 'Product selected',
      status: hasProduct ? 'complete' : 'pending',
    },
    {
      id: 'dates',
      label: 'Date range set',
      status: hasDates ? 'complete' : 'pending',
    },
    {
      id: 'coverage',
      label: 'Coverage rules set',
      status: hasCoverageRules ? 'complete' : 'pending',
    },
    {
      id: 'aoi',
      label: aoiNeeded ? 'AOI available' : 'AOI optional',
      status: aoiNeeded ? (config.aoiExists ? 'complete' : 'warning') : 'complete',
    },
  ];

  const searchReady =
    hasProvider && hasProduct && hasDates && hasCoverageRules && aoiOk;

  items.push({
    id: 'search',
    label: searchReady ? 'Scene search ready' : 'Scene search not ready',
    status: searchReady ? 'complete' : aoiNeeded && !config.aoiExists ? 'warning' : 'pending',
  });

  return items;
}

export function getNextActionText(config: ScenePreviewConfig): string {
  const checklist = getSceneChecklist(config);
  const pending = checklist.find((c) => c.status === 'pending');
  const warning = checklist.find((c) => c.status === 'warning');

  if (warning?.id === 'aoi') {
    return 'Next: Save AOI in project configuration to unlock scene search.';
  }
  if (pending?.id === 'provider' || pending?.id === 'product') {
    return 'Next: Choose provider and collection/product for your scene stack.';
  }
  if (pending?.id === 'dates') {
    return 'Next: Set date range start and end for scene queries.';
  }
  if (pending?.id === 'coverage') {
    return 'Next: Set cloud limit, resolution, and minimum coverage rules.';
  }

  const searchReady = checklist.find((c) => c.id === 'search')?.status === 'complete';
  if (searchReady) {
    return 'Next: Run scene search for your configured stack when the workflow is ready.';
  }
  return 'Next: Complete scene settings, then confirm evidence rules and blockchain trace.';
}

export function getSceneNarratorMessage(config: ScenePreviewConfig): string {
  const mode = getScenePreviewMode(config.provider, config.product, config.dmrvTypeId);
  const cloud = Number(String(config.cloudCover ?? '').replace(/%/g, ''));
  const freq = norm(config.refreshFrequency);

  if (config.aoiRequired && !config.aoiExists) {
    return 'AOI is required before scene search can begin.';
  }
  if (Number.isFinite(cloud) && cloud <= 15) {
    return 'Cloud threshold tightened to improve scene quality.';
  }
  if (freq === 'monthly') {
    return 'Monthly refresh selected for recurring evidence review.';
  }
  if (freq === 'weekly' || freq === 'daily') {
    return 'Frequent refresh selected — expect more scene candidates and review workload.';
  }
  if (mode === 'radar') {
    return 'DPAL is preparing a radar-friendly monitoring workflow for cloudy regions.';
  }
  if (mode === 'optical') {
    return 'DPAL is preparing an optical vegetation monitoring workflow.';
  }
  if (mode === 'water') {
    return 'DPAL is preparing a water-surface screening workflow.';
  }
  if (mode === 'hyperspectral') {
    return 'DPAL is preparing a spectral screening workflow.';
  }
  return 'DPAL is updating the scene search strategy from your current settings.';
}

export type ScenePreviewVisual = {
  mode: ScenePreviewMode;
  title: string;
  gradient: string;
  icon: string;
  overlayLabel: string;
};

export function getScenePreviewVisual(config: ScenePreviewConfig): ScenePreviewVisual {
  const mode = getScenePreviewMode(config.provider, config.product, config.dmrvTypeId);
  const provider = config.provider?.trim() || 'Provider';
  const product = config.product?.trim() || 'Product';

  const visuals: Record<ScenePreviewMode, Omit<ScenePreviewVisual, 'mode'>> = {
    optical: {
      title: 'Optical land monitoring',
      gradient: 'from-emerald-900 via-green-800 to-lime-700',
      icon: '🌲',
      overlayLabel: 'Optical · vegetation & land cover',
    },
    radar: {
      title: 'SAR / radar screening',
      gradient: 'from-zinc-800 via-slate-700 to-neutral-600',
      icon: '📡',
      overlayLabel: 'Radar · cloud-penetrating SAR',
    },
    lidar: {
      title: 'LiDAR structure view',
      gradient: 'from-violet-900 via-purple-800 to-fuchsia-700',
      icon: '📐',
      overlayLabel: 'LiDAR · height & canopy structure',
    },
    water: {
      title: 'Water / ocean screening',
      gradient: 'from-cyan-900 via-blue-800 to-indigo-800',
      icon: '🌊',
      overlayLabel: 'Water · surface & basin context',
    },
    hyperspectral: {
      title: 'Hyperspectral screening',
      gradient: 'from-rose-900 via-fuchsia-800 to-violet-700',
      icon: '🌈',
      overlayLabel: 'Spectral · multi-band fingerprint',
    },
    thermal: {
      title: 'Thermal / heat screening',
      gradient: 'from-orange-900 via-red-800 to-amber-700',
      icon: '🌡️',
      overlayLabel: 'Thermal · heat signal context',
    },
    generic: {
      title: 'Scene configuration preview',
      gradient: 'from-[#1e3a5f] via-slate-700 to-slate-600',
      icon: '🛰️',
      overlayLabel: 'Configured for scene search',
    },
  };

  const base = visuals[mode];
  return {
    mode,
    ...base,
    overlayLabel: `${base.overlayLabel} · ${provider}${product ? ` · ${product}` : ''}`,
  };
}
