import type { PlasticEnvironmentType } from '../types';

export type PlasticMissionTypeId =
  | 'ocean_floating'
  | 'river_discharge'
  | 'beach_coastal'
  | 'port_industrial'
  | 'post_storm'
  | 'illegal_dumping'
  | 'mangrove_stress';

export type PlasticMissionTypeDef = {
  id: PlasticMissionTypeId;
  title: string;
  shortDescription: string;
  environmentType: PlasticEnvironmentType;
  helperFocus: string;
  recommendedStack: string[];
};

export const PLASTIC_MISSION_TYPES: PlasticMissionTypeDef[] = [
  {
    id: 'ocean_floating',
    title: 'Ocean Floating Plastic',
    shortDescription: 'Open-water accumulation and drift corridors.',
    environmentType: 'ocean',
    helperFocus: 'Draw an offshore or nearshore polygon where floating debris may concentrate after currents or winds.',
    recommendedStack: [
      'PACE OCI: ocean color / hyperspectral water signal',
      'Sentinel-2: optical surface detail',
      'Landsat: historical comparison',
      'SAR support: cloud/night/surface roughness context',
      'Weather/cloud screening: scan quality validation',
    ],
  },
  {
    id: 'river_discharge',
    title: 'River Plastic Discharge',
    shortDescription: 'River mouth plumes and discharge corridors.',
    environmentType: 'river',
    helperFocus: 'Trace the river channel and estuary where plastic may enter coastal waters.',
    recommendedStack: [
      'Sentinel-2: visual river plume / surface patterns',
      'Landsat: historical land/water context',
      'PACE OCI where coastal/ocean outflow is involved',
      'Rainfall / flood context where available',
      'Field validation recommended',
    ],
  },
  {
    id: 'beach_coastal',
    title: 'Beach / Coastal Accumulation',
    shortDescription: 'Shoreline strand lines and nearshore buildup.',
    environmentType: 'coast',
    helperFocus: 'Outline the beach or coastal segment where debris may strand after tides or storms.',
    recommendedStack: [
      'Sentinel-2: shoreline and nearshore detail',
      'PACE OCI: coastal water color context',
      'Landsat: seasonal shoreline change',
      'Drone / field photos for validation',
      'Weather/cloud screening',
    ],
  },
  {
    id: 'port_industrial',
    title: 'Port / Industrial Runoff',
    shortDescription: 'Harbor, port, and industrial waterfront review.',
    environmentType: 'coast',
    helperFocus: 'Define the harbor basin, berths, or outfall area — not the whole city.',
    recommendedStack: [
      'Sentinel-2: harbor surface and infrastructure context',
      'Landsat: land/water change screening',
      'PACE OCI where open water is visible',
      'Field validation and port authority records',
      'Regulatory / ESG reporting context',
    ],
  },
  {
    id: 'post_storm',
    title: 'Post-Storm Debris',
    shortDescription: 'Storm surge debris and flood-carried waste.',
    environmentType: 'flood_debris',
    helperFocus: 'Cover the flood zone, lagoon, or coastal segment affected by recent storm surge.',
    recommendedStack: [
      'Sentinel-2: post-event surface patterns',
      'Landsat: before/after land cover context',
      'Rainfall / flood context where available',
      'PACE OCI for coastal discoloration screening',
      'Field validation strongly recommended',
    ],
  },
  {
    id: 'illegal_dumping',
    title: 'Illegal Dumping Near Water',
    shortDescription: 'Dump sites, canals, and informal waste near water bodies.',
    environmentType: 'landfill_dumping',
    helperFocus: 'Draw the dump footprint or canal segment — keep the polygon tight to the suspected site.',
    recommendedStack: [
      'Sentinel-2: land cover and dump footprint context',
      'Landsat: historical land change',
      'Field photos and community reports',
      'PACE/EMIT only if open water is in the AOI',
      'Validator review before public claims',
    ],
  },
  {
    id: 'mangrove_stress',
    title: 'Blue Carbon / Mangrove Plastic Stress',
    shortDescription: 'Mangrove edges and blue-carbon habitat plastic stress.',
    environmentType: 'coast',
    helperFocus: 'Outline mangrove fringes, tidal channels, or restoration plots under plastic pressure.',
    recommendedStack: [
      'Sentinel-2: mangrove fringe and tidal detail',
      'PACE OCI: coastal water signal',
      'Landsat: habitat change screening',
      'Field validation in mangrove plots',
      'Blue carbon / restoration project records',
    ],
  },
];

export function getPlasticMissionType(id: PlasticMissionTypeId | null): PlasticMissionTypeDef {
  return PLASTIC_MISSION_TYPES.find((m) => m.id === id) ?? PLASTIC_MISSION_TYPES[0];
}
