/** Default sensor selections per DMRV type when opening the source configurator. */

export const DMRV_RECOMMENDED_SOURCES: Record<string, string[]> = {
  'forest-land-use': [
    'sentinel-2-msi',
    'landsat-8-9',
    'sentinel-1-sar',
    'esa-biomass',
    'nisar',
    'ecostress',
  ],
  agriculture: ['sentinel-2-msi', 'landsat-8-9', 'ecostress', 'desis', 'modis'],
  'water-blue-carbon': [
    'sentinel-2-msi',
    'sentinel-3-olci',
    'pace-oci',
    'swot',
    'sentinel-1-sar',
    'enmap',
  ],
  'pollution-emissions': ['emit', 'enmap', 'prisma', 'desis', 'sentinel-3-olci', 'viirs'],
  'biodiversity-ecosystems': [
    'sentinel-2-msi',
    'gedi-lidar',
    'icesat-2-atlas',
    'landsat-8-9',
    'esa-biomass',
  ],
  'climate-risk-disaster': [
    'sentinel-1-sar',
    'nisar',
    'viirs',
    'modis',
    'swot',
    'ecostress',
  ],
  'custom-advanced-intelligence': [],
  'flood-hydrology': ['sentinel-1-sar', 'swot', 'modis', 'viirs', 'landsat-8-9'],
  'freshwater-watershed': ['sentinel-2-msi', 'landsat-8-9', 'swot', 'sentinel-1-sar', 'modis'],
  'urban-built': ['sentinel-2-msi', 'landsat-8-9', 'ecostress', 'viirs', 'usgs-3dep-lidar'],
};

export const DMRV_LIDAR_RECOMMENDED_SOURCES: Record<string, string[]> = {
  'forest-land-use': ['gedi-lidar', 'icesat-2-atlas', 'usgs-3dep-lidar', 'drone-lidar', 'ground-tls-lidar'],
  agriculture: ['usgs-3dep-lidar', 'drone-lidar'],
  'water-blue-carbon': ['icesat-2-atlas', 'usgs-3dep-lidar'],
  'biodiversity-ecosystems': ['gedi-lidar', 'icesat-2-atlas', 'drone-lidar', 'ground-tls-lidar'],
  'climate-risk-disaster': ['icesat-2-atlas', 'usgs-3dep-lidar'],
  'urban-built': ['usgs-3dep-lidar', 'drone-lidar'],
};

export const DMRV_TYPE_HELPER_COPY: Record<string, { satellite?: string; lidar?: string }> = {
  'forest-land-use': {
    satellite:
      'Recommended stack: Sentinel-2 and Landsat for optical vegetation change, Sentinel-1/NISAR/Biomass for radar-based structure and disturbance, GEDI/ICESat-2 for canopy height, and ECOSTRESS for drought or water-stress context.',
    lidar:
      'LiDAR sources provide 3D structure: canopy height, terrain elevation, biomass validation, and field-level point-cloud evidence.',
  },
  agriculture: {
    satellite:
      'Use Sentinel-2 and Landsat for crop and vegetation signals, ECOSTRESS for stress, and DESIS/MODIS for broader context — always pair with field management records.',
    lidar: 'Airborne or drone LiDAR can validate terrain and structure where 3DEP or field surveys exist.',
  },
  'water-blue-carbon': {
    satellite:
      'Combine optical (Sentinel-2), ocean color (PACE, Sentinel-3), hydrology (SWOT), and SAR (Sentinel-1) for wetland and coastal screening.',
    lidar: 'ICESat-2 and local elevation products help validate water surface and canopy height near coasts.',
  },
};

export function getDefaultSourceIds(
  dmrvTypeId: string,
  kind: 'satellite' | 'lidar',
): string[] {
  if (kind === 'lidar') {
    return DMRV_LIDAR_RECOMMENDED_SOURCES[dmrvTypeId] ?? [];
  }
  return DMRV_RECOMMENDED_SOURCES[dmrvTypeId] ?? [];
}

export function getTypeHelperCopy(
  dmrvTypeId: string,
  kind: 'satellite' | 'lidar',
): string | undefined {
  const entry = DMRV_TYPE_HELPER_COPY[dmrvTypeId];
  if (!entry) return undefined;
  return kind === 'lidar' ? entry.lidar : entry.satellite;
}
