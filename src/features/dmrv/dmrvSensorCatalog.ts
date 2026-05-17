/** DMRV sensor / satellite source catalog for the source configurator. */

export type DmrvSensorType =
  | 'multispectral'
  | 'sar-radar'
  | 'hyperspectral'
  | 'lidar'
  | 'thermal'
  | 'ocean-color'
  | 'altimetry'
  | 'field-source'
  | 'blockchain';

export type DmrvSensorStatus =
  | 'recommended'
  | 'available'
  | 'needs-api-key'
  | 'research-only'
  | 'coming-soon';

export type DmrvSensorUiIcon =
  | 'satellite'
  | 'radar'
  | 'waves'
  | 'trees'
  | 'mountain'
  | 'scan'
  | 'layers'
  | 'thermal'
  | 'database'
  | 'lock'
  | 'check';

export type DmrvSensorSource = {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  sensorType: DmrvSensorType;
  purposeTags: string[];
  recommendedFor: string[];
  detects: string[];
  bestFor: string;
  evidenceRole: string;
  status: DmrvSensorStatus;
  resolutionLabel?: string;
  revisitLabel?: string;
  yearLabel?: string;
  uiIcon: DmrvSensorUiIcon;
  imageUrl?: string;
};

export const DMRV_SENSOR_IMAGE_URLS: Record<string, string> = {
  'sentinel-2-msi': '/dmrv/satellites/sentinel-2.png',
  'landsat-8-9': '/dmrv/satellites/landsat-9.png',
  'sentinel-1-sar': '/dmrv/satellites/sentinel-1.png',
  modis: '/dmrv/satellites/modis.png',
  'pace-oci': '/dmrv/satellites/pace.png',
  'esa-biomass': '/dmrv/satellites/esa-biomass.png',
  ecostress: '/dmrv/satellites/ecostress.png',
  swot: '/dmrv/satellites/swot.png',
  enmap: '/dmrv/satellites/enmap.png',
  emit: '/dmrv/satellites/emit.png',
  prisma: '/dmrv/satellites/prisma.png',
  desis: '/dmrv/satellites/desis.png',
  viirs: '/dmrv/satellites/viirs.png',
  'sentinel-3-olci': '/dmrv/satellites/sentinel-2.png',
  nisar: '/dmrv/satellites/sentinel-1.png',
  'gedi-lidar': '/dmrv/lidar/gedi-iss-mount.png',
};

/** Resolved artwork for configurator cards (explicit entry or catalog map). */
export function getSensorImageUrl(source: Pick<DmrvSensorSource, 'id' | 'imageUrl'>): string | undefined {
  return source.imageUrl ?? DMRV_SENSOR_IMAGE_URLS[source.id];
}

export const DMRV_SENSOR_SOURCES: DmrvSensorSource[] = [
  {
    id: 'sentinel-2-msi',
    name: 'Sentinel-2 MSI',
    shortName: 'Sentinel-2',
    provider: 'ESA / Copernicus',
    sensorType: 'multispectral',
    purposeTags: ['vegetation', 'land-cover', 'water'],
    recommendedFor: ['forest-land-use', 'agriculture', 'water-blue-carbon', 'biodiversity-ecosystems'],
    detects: ['vegetation health', 'land cover', 'water cover', 'NDVI/NDWI', 'forest change'],
    bestFor: 'High-frequency optical vegetation and land-cover screening',
    evidenceRole: 'Primary optical vegetation and land-cover evidence',
    status: 'recommended',
    resolutionLabel: '10 m',
    revisitLabel: '~5 days',
    yearLabel: '2015–present',
    uiIcon: 'satellite',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['sentinel-2-msi'],
  },
  {
    id: 'landsat-8-9',
    name: 'Landsat 8/9 OLI/TIRS',
    shortName: 'Landsat',
    provider: 'NASA / USGS',
    sensorType: 'multispectral',
    purposeTags: ['baseline', 'thermal', 'trends'],
    recommendedFor: ['forest-land-use', 'agriculture', 'urban-built', 'biodiversity-ecosystems'],
    detects: ['long-term land cover', 'vegetation trend', 'thermal context', 'water change'],
    bestFor: 'Historical baseline and long-term trend comparison',
    evidenceRole: 'Historical baseline and long-term trend comparison',
    status: 'recommended',
    resolutionLabel: '30 m',
    revisitLabel: '~16 days',
    yearLabel: '2013–present',
    uiIcon: 'satellite',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['landsat-8-9'],
  },
  {
    id: 'sentinel-1-sar',
    name: 'Sentinel-1 SAR',
    shortName: 'Sentinel-1',
    provider: 'ESA / Copernicus',
    sensorType: 'sar-radar',
    purposeTags: ['radar', 'flood', 'disturbance'],
    recommendedFor: ['forest-land-use', 'water-blue-carbon', 'flood-hydrology', 'climate-risk-disaster'],
    detects: ['forest disturbance', 'flooding', 'wetland change', 'cloudy area monitoring'],
    bestFor: 'All-weather radar when optical scenes are blocked',
    evidenceRole: 'All-weather radar evidence',
    status: 'recommended',
    resolutionLabel: '5–20 m',
    revisitLabel: '~6–12 days',
    uiIcon: 'radar',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['sentinel-1-sar'],
  },
  {
    id: 'gedi-lidar',
    name: 'GEDI LiDAR',
    shortName: 'GEDI',
    provider: 'NASA',
    sensorType: 'lidar',
    purposeTags: ['canopy', 'biomass', 'structure'],
    recommendedFor: ['forest-land-use', 'biodiversity-ecosystems'],
    detects: ['canopy height', 'canopy vertical structure', 'biomass support', 'surface elevation'],
    bestFor: 'Spaceborne canopy height and 3D structure validation',
    evidenceRole: '3D forest structure and biomass validation',
    status: 'research-only',
    resolutionLabel: '25 m footprints',
    revisitLabel: 'ISS orbit',
    yearLabel: '2019–present',
    uiIcon: 'trees',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['gedi-lidar'],
  },
  {
    id: 'esa-biomass',
    name: 'ESA Biomass',
    shortName: 'Biomass',
    provider: 'ESA',
    sensorType: 'sar-radar',
    purposeTags: ['biomass', 'carbon'],
    recommendedFor: ['forest-land-use'],
    detects: ['forest biomass', 'carbon storage', 'forest structure'],
    bestFor: 'Forest biomass and carbon storage screening',
    evidenceRole: 'Biomass and forest carbon evidence',
    status: 'research-only',
    resolutionLabel: '~200 m',
    revisitLabel: 'Mission cadence',
    uiIcon: 'radar',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['esa-biomass'],
  },
  {
    id: 'nisar',
    name: 'NISAR',
    shortName: 'NISAR',
    provider: 'NASA / ISRO',
    sensorType: 'sar-radar',
    purposeTags: ['change-detection', 'wetlands'],
    recommendedFor: ['forest-land-use', 'climate-risk-disaster', 'water-blue-carbon'],
    detects: ['vegetation change', 'wetlands', 'land movement', 'disaster effects'],
    bestFor: 'Advanced L-band radar change detection',
    evidenceRole: 'Advanced radar change detection',
    status: 'coming-soon',
    resolutionLabel: 'TBD',
    uiIcon: 'radar',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.nisar,
  },
  {
    id: 'ecostress',
    name: 'ECOSTRESS',
    shortName: 'ECOSTRESS',
    provider: 'NASA',
    sensorType: 'thermal',
    purposeTags: ['drought', 'stress'],
    recommendedFor: ['forest-land-use', 'agriculture', 'climate-risk-disaster'],
    detects: ['plant water stress', 'land surface temperature', 'drought stress'],
    bestFor: 'Thermal stress and drought context',
    evidenceRole: 'Thermal stress and drought context',
    status: 'available',
    resolutionLabel: '70 m',
    revisitLabel: 'ISS orbit',
    uiIcon: 'thermal',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.ecostress,
  },
  {
    id: 'pace-oci',
    name: 'PACE OCI',
    shortName: 'PACE',
    provider: 'NASA',
    sensorType: 'ocean-color',
    purposeTags: ['ocean', 'water-quality'],
    recommendedFor: ['water-blue-carbon', 'pollution-emissions'],
    detects: ['ocean color', 'phytoplankton', 'harmful algal bloom risk', 'aerosol/ocean interaction'],
    bestFor: 'Ocean biology and coastal water quality signals',
    evidenceRole: 'Ocean biology and water quality signal',
    status: 'available',
    resolutionLabel: '1 km',
    revisitLabel: '1–2 days',
    yearLabel: '2024–present',
    uiIcon: 'waves',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['pace-oci'],
  },
  {
    id: 'sentinel-3-olci',
    name: 'Sentinel-3 OLCI / SLSTR',
    shortName: 'Sentinel-3',
    provider: 'ESA / Copernicus',
    sensorType: 'ocean-color',
    purposeTags: ['ocean', 'temperature'],
    recommendedFor: ['water-blue-carbon', 'climate-risk-disaster'],
    detects: ['ocean color', 'land color', 'sea surface temperature', 'land surface temperature'],
    bestFor: 'Ocean and large-scale environmental monitoring',
    evidenceRole: 'Ocean and large-scale environmental monitoring',
    status: 'available',
    resolutionLabel: '300 m–1 km',
    revisitLabel: '~1–2 days',
    uiIcon: 'waves',
    imageUrl: DMRV_SENSOR_IMAGE_URLS['sentinel-3-olci'],
  },
  {
    id: 'swot',
    name: 'SWOT',
    shortName: 'SWOT',
    provider: 'NASA / CNES',
    sensorType: 'altimetry',
    purposeTags: ['hydrology', 'surface-water'],
    recommendedFor: ['water-blue-carbon', 'flood-hydrology', 'climate-risk-disaster'],
    detects: ['rivers', 'lakes', 'wetlands', 'ocean surface height'],
    bestFor: 'Surface water height and hydrology context',
    evidenceRole: 'Surface water height and hydrology evidence',
    status: 'available',
    resolutionLabel: 'Variable',
    revisitLabel: '21-day repeat',
    uiIcon: 'scan',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.swot,
  },
  {
    id: 'enmap',
    name: 'EnMAP',
    shortName: 'EnMAP',
    provider: 'DLR / Germany',
    sensorType: 'hyperspectral',
    purposeTags: ['materials', 'pollution'],
    recommendedFor: ['pollution-emissions', 'water-blue-carbon', 'biodiversity-ecosystems'],
    detects: ['minerals', 'vegetation composition', 'water quality', 'pollutants', 'plastics', 'methane'],
    bestFor: 'Hyperspectral material identification',
    evidenceRole: 'Hyperspectral material identification',
    status: 'needs-api-key',
    resolutionLabel: '30 m',
    uiIcon: 'layers',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.enmap,
  },
  {
    id: 'emit',
    name: 'EMIT',
    shortName: 'EMIT',
    provider: 'NASA',
    sensorType: 'hyperspectral',
    purposeTags: ['minerals', 'methane'],
    recommendedFor: ['pollution-emissions', 'custom-advanced-intelligence'],
    detects: ['mineral composition', 'dust source minerals', 'methane plume indicators'],
    bestFor: 'Mineral and methane anomaly screening',
    evidenceRole: 'Mineral and methane anomaly evidence',
    status: 'research-only',
    resolutionLabel: '60 m',
    uiIcon: 'layers',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.emit,
  },
  {
    id: 'prisma',
    name: 'PRISMA',
    shortName: 'PRISMA',
    provider: 'ASI / Italy',
    sensorType: 'hyperspectral',
    purposeTags: ['spectral', 'pollution'],
    recommendedFor: ['pollution-emissions', 'water-blue-carbon', 'custom-advanced-intelligence'],
    detects: ['spectral material signatures', 'vegetation', 'minerals', 'water/pollution indicators'],
    bestFor: 'Hyperspectral material and pollution analysis',
    evidenceRole: 'Hyperspectral material and pollution analysis',
    status: 'needs-api-key',
    resolutionLabel: '30 m',
    uiIcon: 'layers',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.prisma,
  },
  {
    id: 'desis',
    name: 'DESIS',
    shortName: 'DESIS',
    provider: 'DLR / Teledyne',
    sensorType: 'hyperspectral',
    purposeTags: ['agriculture', 'forestry'],
    recommendedFor: ['agriculture', 'forest-land-use', 'pollution-emissions'],
    detects: ['farming', 'forestry', 'land cover', 'environmental monitoring'],
    bestFor: 'Hyperspectral environmental monitoring',
    evidenceRole: 'Hyperspectral environmental monitoring',
    status: 'needs-api-key',
    resolutionLabel: '30 m',
    uiIcon: 'layers',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.desis,
  },
  {
    id: 'modis',
    name: 'MODIS Terra/Aqua',
    shortName: 'MODIS',
    provider: 'NASA',
    sensorType: 'multispectral',
    purposeTags: ['global', 'fire'],
    recommendedFor: ['forest-land-use', 'climate-risk-disaster', 'water-blue-carbon'],
    detects: ['vegetation', 'fires', 'ocean biology', 'land cover', 'broad environmental trends'],
    bestFor: 'Broad historical and global context screening',
    evidenceRole: 'Broad historical/global context',
    status: 'available',
    resolutionLabel: '250 m–1 km',
    revisitLabel: 'Daily',
    uiIcon: 'satellite',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.modis,
  },
  {
    id: 'viirs',
    name: 'VIIRS',
    shortName: 'VIIRS',
    provider: 'NASA / NOAA',
    sensorType: 'multispectral',
    purposeTags: ['fire', 'night-lights'],
    recommendedFor: ['climate-risk-disaster', 'pollution-emissions', 'forest-land-use'],
    detects: ['fires', 'night lights', 'land', 'ocean', 'atmosphere', 'cryosphere'],
    bestFor: 'Near-real-time fire and global context',
    evidenceRole: 'Near-real-time fire and global context',
    status: 'available',
    resolutionLabel: '375 m–750 m',
    revisitLabel: 'Daily',
    uiIcon: 'satellite',
    imageUrl: DMRV_SENSOR_IMAGE_URLS.viirs,
  },
  {
    id: 'icesat-2-atlas',
    name: 'ICESat-2 ATLAS',
    shortName: 'ICESat-2',
    provider: 'NASA',
    sensorType: 'lidar',
    purposeTags: ['elevation', 'canopy'],
    recommendedFor: ['forest-land-use', 'climate-risk-disaster', 'water-blue-carbon'],
    detects: ['terrain height', 'canopy height', 'ice height', 'ocean height'],
    bestFor: 'Elevation and canopy height validation',
    evidenceRole: 'Elevation and canopy height validation',
    status: 'available',
    resolutionLabel: 'Photon footprints',
    revisitLabel: '91-day repeat',
    uiIcon: 'mountain',
  },
  {
    id: 'usgs-3dep-lidar',
    name: 'USGS 3DEP / Airborne LiDAR',
    shortName: '3DEP',
    provider: 'USGS / local data source',
    sensorType: 'lidar',
    purposeTags: ['terrain', 'dem'],
    recommendedFor: ['forest-land-use', 'urban-built', 'climate-risk-disaster'],
    detects: ['high-resolution elevation', 'bare-earth DEM', 'terrain', 'infrastructure', 'above-ground features'],
    bestFor: 'Local elevation and terrain validation (US coverage)',
    evidenceRole: 'Local elevation and terrain validation',
    status: 'available',
    resolutionLabel: '1 m+ where available',
    uiIcon: 'mountain',
  },
  {
    id: 'drone-lidar',
    name: 'Drone / UAV LiDAR',
    shortName: 'Drone LiDAR',
    provider: 'Field Team',
    sensorType: 'lidar',
    purposeTags: ['field-validation'],
    recommendedFor: ['forest-land-use', 'biodiversity-ecosystems'],
    detects: ['project-specific canopy height', 'terrain', 'field validation'],
    bestFor: 'Field-scale point-cloud validation',
    evidenceRole: 'Field validation point cloud',
    status: 'available',
    uiIcon: 'scan',
  },
  {
    id: 'ground-tls-lidar',
    name: 'Ground TLS / Terrestrial LiDAR',
    shortName: 'TLS',
    provider: 'Field Team',
    sensorType: 'lidar',
    purposeTags: ['field-validation', 'structure'],
    recommendedFor: ['forest-land-use', 'biodiversity-ecosystems', 'urban-built'],
    detects: ['high-precision canopy structure', 'terrain', 'infrastructure', 'plot-scale 3D evidence'],
    bestFor: 'Plot-scale terrestrial laser scanning validation',
    evidenceRole: 'Ground-truth 3D structure evidence',
    status: 'available',
    uiIcon: 'trees',
  },
];

const SOURCE_BY_ID = new Map(DMRV_SENSOR_SOURCES.map((s) => [s.id, s]));

export function getSensorSourceById(id: string): DmrvSensorSource | undefined {
  return SOURCE_BY_ID.get(id);
}

export function getSensorSourcesForKind(
  kind: 'satellite' | 'lidar' | 'field' | 'blockchain',
): DmrvSensorSource[] {
  switch (kind) {
    case 'lidar':
      return DMRV_SENSOR_SOURCES.filter((s) => s.sensorType === 'lidar');
    case 'field':
      return DMRV_SENSOR_SOURCES.filter((s) => s.sensorType === 'field-source');
    case 'blockchain':
      return DMRV_SENSOR_SOURCES.filter((s) => s.sensorType === 'blockchain');
    case 'satellite':
    default:
      return DMRV_SENSOR_SOURCES.filter(
        (s) =>
          s.sensorType !== 'lidar' &&
          s.sensorType !== 'field-source' &&
          s.sensorType !== 'blockchain',
      );
  }
}

export type DmrvSourceConfiguratorKind = 'satellite' | 'lidar' | 'field' | 'blockchain';

export const DMRV_SENSOR_TYPE_LABELS: Record<DmrvSensorType, string> = {
  multispectral: 'Multispectral',
  'sar-radar': 'SAR / Radar',
  hyperspectral: 'Hyperspectral',
  lidar: 'LiDAR',
  thermal: 'Thermal',
  'ocean-color': 'Ocean color',
  altimetry: 'Altimetry',
  'field-source': 'Field source',
  blockchain: 'Blockchain',
};

export type DmrvSourceStatusLabel =
  | 'Connected'
  | 'Configurable'
  | 'Needs API Key'
  | 'Research Only'
  | 'Coming Soon';

export function sourceStatusDisplay(status: DmrvSensorStatus): DmrvSourceStatusLabel {
  switch (status) {
    case 'recommended':
    case 'available':
      return 'Configurable';
    case 'needs-api-key':
      return 'Needs API Key';
    case 'research-only':
      return 'Research Only';
    case 'coming-soon':
      return 'Coming Soon';
    default:
      return 'Configurable';
  }
}

export function sourceStatusBadgeClass(label: DmrvSourceStatusLabel): string {
  switch (label) {
    case 'Connected':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'Configurable':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    case 'Needs API Key':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'Research Only':
      return 'bg-violet-100 text-violet-900 border-violet-200';
    case 'Coming Soon':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
