/** Plain-language explanations for satellite stack technology pills. */

export type DmrvTechnologyEntry = {
  /** What the instrument or product is. */
  summary: string;
  /** How DPAL uses it in DMRV screening and evidence workflows. */
  inDpal: string;
};

const GLOSSARY: Record<string, DmrvTechnologyEntry> = {
  'OLI-2 multispectral': {
    summary:
      'Operational Land Imager 2 — the main camera on Landsat 9. It measures reflected sunlight in visible, near-infrared, and shortwave-infrared bands used to map vegetation, water, snow, and burned areas.',
    inDpal:
      'DPAL adapters pull OLI-2 bands to compute NDVI, NBR, and land-cover change between baseline and monitoring dates inside your AOI. Scene statistics from Planetary Computer or similar STAC catalogs feed screening cards and evidence packets — not certified carbon credits on their own.',
  },
  'TIRS-2 thermal': {
    summary:
      'Thermal Infrared Sensor 2 — two thermal bands that estimate land surface temperature. Useful for heat stress, urban heat, fire scars, and evapotranspiration context.',
    inDpal:
      'When thermal is available in the selected product, DPAL can surface temperature anomalies next to optical indices. Many DMRV workflows lean on OLI-2 reflectance first; thermal adds supporting context for drought, fire, or industrial heat screening.',
  },
  'Collection 2 Surface Reflectance': {
    summary:
      'USGS Landsat Collection 2 Level-2 surface reflectance — atmospherically corrected pixels so red/NIR values compare across dates and locations.',
    inDpal:
      'Earth Observation and carbon-related scans request Collection 2 L2 scenes via STAC (e.g. Microsoft Planetary Computer), pick before/after pairs in your date window, and compute index deltas from item statistics. Limitations in the UI call out scene-level screening vs zonal AOI averages.',
  },
  '30 m pixels': {
    summary:
      'Each pixel represents roughly 30×30 meters on the ground — the standard Landsat trade-off between detail and swath width.',
    inDpal:
      'AOI radius and map scale should account for 30 m resolution: small sites may have few pixels per feature. DPAL labels results as indicative screening; validators still need ground truth or higher-resolution imagery when claims require it.',
  },
  'MSI multispectral': {
    summary:
      'MultiSpectral Instrument on Sentinel-2 — 13 bands from visible to shortwave infrared at 10–60 m, designed for vegetation, agriculture, and land monitoring.',
    inDpal:
      'Sentinel-2 is often chosen for fresher optical pairs than Landsat alone. DPAL Copernicus and STAC paths can compare Level-2A reflectance for NDVI/NDWI-style indices in water and land DMRV modules when those routes are configured on your API host.',
  },
  'Level-2A surface reflectance': {
    summary:
      'Sentinel-2 atmospherically corrected surface reflectance product (Level-2A) — ready for vegetation and water indices without doing your own atmospheric correction.',
    inDpal:
      'Before/after comparisons in AquaScan, Earth Observation, and related adapters prefer L2A so index deltas reflect surface change, not haze. If only L1C is available, the UI should note reduced comparability.',
  },
  '10–20 m bands': {
    summary:
      'Sentinel-2’s best spatial resolution: 10 m for key visible/NIR bands and 20 m for red-edge and SWIR — sharper than Landsat for field-scale features.',
    inDpal:
      'Use when your AOI includes narrow corridors, riparian zones, or parcel-scale restoration. DPAL still treats outputs as screening; resolution does not replace ground plots or validator sign-off.',
  },
  'Sentinel Hub / PC STAC': {
    summary:
      'Catalog APIs that list satellite scenes and assets: Sentinel Hub (Copernicus Data Space) and Microsoft Planetary Computer STAC for search, metadata, and statistics.',
    inDpal:
      'Backend routes query STAC collections, select scenes inside your date range and bbox, and call statistics or process APIs — credentials stay on the server (`COPERNICUS_CLIENT_*`, public PC endpoints). The SPA never holds Copernicus secrets.',
  },
  'C-band SAR (IW)': {
    summary:
      'Sentinel-1 C-band synthetic aperture radar in Interferometric Wide swath — active microwave that sees through clouds and at night.',
    inDpal:
      'Water Monitor and flood-related flows use SAR backscatter for surface water and flood extent when optical scenes are blocked. DPAL distinguishes live Sentinel-1 scenes from fallback estimates and labels SAR as screening, not legal flood warning.',
  },
  'VV / VH backscatter': {
    summary:
      'Dual-polarization radar returns: VV (transmit/receive vertical) and VH (cross-polar). Water and rough surfaces change backscatter differently than dry land.',
    inDpal:
      'Adapters read VV/VH statistics to infer water fraction and flood-risk style signals. The UI shows capture date and source when `sentinel1.ok` is true; otherwise it may show labeled fallback fields without implying verified SAR.',
  },
  'Radiometric terrain correction': {
    summary:
      'Processing that adjusts SAR brightness for hills and slopes so mountains do not look like false water or change.',
    inDpal:
      'Corrected products improve comparability across passes in mountainous AOIs. When correction metadata is missing, DPAL should surface lower confidence rather than over-interpret raw backscatter.',
  },
  'Copernicus Data Space API': {
    summary:
      'ESA’s Copernicus Data Space — OAuth, catalog search, and Statistical API for Sentinel-1/2 processing on the cloud.',
    inDpal:
      'Railway `dpal-ai-server` (or repo `backend` Copernicus routes) caches tokens and calls statistics with proper CRS and pixel dimensions. Front-end calls same-origin `/api/copernicus/*` only.',
  },
  'MODIS radiometry': {
    summary:
      'Moderate Resolution Imaging Spectroradiometer — daily global optical/thermal measurements at 250 m–1 km.',
    inDpal:
      'Used for regional context: heat anomalies, broad vegetation stress, snow, and rapid event pulses where fine resolution is not required. DPAL positions MODIS as wide-area screening, not parcel-level proof.',
  },
  'NASA FIRMS fire detections': {
    summary:
      'Fire Information for Resource Management System — near-real-time active fire hotspots from MODIS and VIIRS sensors.',
    inDpal:
      'FloodGuard and fire-adjacent workflows can overlay hotspot points for situational awareness. FIRMS does not replace official emergency alerts; DPAL copy states civic intelligence only.',
  },
  'MOD13 vegetation indices': {
    summary:
      'MODIS vegetation index products (e.g. NDVI/EVI composites) on 16-day or annual schedules at coarse resolution.',
    inDpal:
      'Supports regional NDVI anomaly context when finer satellites are cloudy or unavailable. Evidence packets should cite product name, date, and resolution limits.',
  },
  '250 m–1 km products': {
    summary:
      'Spatial grain of many MODIS standard products — each pixel summarizes a large area.',
    inDpal:
      'Document that findings apply at regional scale. Do not use MODIS alone for small-site carbon or compliance claims without higher-resolution corroboration.',
  },
  'OCI ocean color': {
    summary:
      'Ocean Color Instrument on PACE — hyperspectral measurements of ocean biology, sediments, and water-leaving radiance.',
    inDpal:
      'Coastal water quality and plastic/ocean DMRV modules can reference OCI for chlorophyll and color anomalies. Hyperspectral PACE paths in DPAL are screening until validated against in situ water samples.',
  },
  'HARP2 polarimetry': {
    summary:
      'Hyper-Angular Rainbow Polarimeter 2 — multi-angle polarized light measurements for clouds and aerosols above the ocean.',
    inDpal:
      'Adds atmospheric context for coastal projects (plume transport, cloud contamination flags). Not a substitute for ground water chemistry.',
  },
  'SPEXone aerosols': {
    summary:
      'Spectrophotometer for aerosol particles — column aerosol optical depth and type hints.',
    inDpal:
      'Helps explain haze or pollution columns near facilities when paired with Sentinel-5P or ground monitors. Document as contextual, not emissions tonnage.',
  },
  'NASA CMR / OB.DAAC': {
    summary:
      'NASA Common Metadata Repository and Ocean Biology Distributed Active Archive Center — search and download paths for PACE and ocean biology products.',
    inDpal:
      'Backend or future adapters discover granules and metadata; clients show source lineage in evidence metadata when wired. Live vs demo fallback must be explicit in UI.',
  },
  'TROPOMI spectrometer': {
    summary:
      'TROPOspheric Monitoring Instrument on Sentinel-5P — spectrometer measuring UV–SWIR sunlight to retrieve trace gases.',
    inDpal:
      'Air-quality and methane-plume screening near facilities use column products (NO₂, CH₄ proxies, etc.). Columns are not ground concentration — pair with monitors and safe claim language.',
  },
  'UV–VIS–NIR–SWIR': {
    summary:
      'Wavelength range covered by TROPOMI — different bands isolate ozone, NO₂, SO₂, aerosols, and methane-related signals.',
    inDpal:
      'Validation rules should name which gas product was used. DPAL does not auto-convert columns to regulatory compliance values.',
  },
  'Level-2 trace gas columns': {
    summary:
      'Sentinel-5P Level-2 files giving integrated column amounts (e.g. mol/m²) along the viewing path.',
    inDpal:
      'Stored or displayed with retrieval quality flags. Use for relative hotspot screening and temporal comparison, not single-pixel facility attribution without expert review.',
  },
  'Sentinel-5P NRT / offline': {
    summary:
      'Near-real-time (faster, less refined) vs offline (reprocessed, higher quality) Sentinel-5P product streams.',
    inDpal:
      'Incident workflows may prefer NRT for speed; audit packets should prefer offline reprocessed products when available. UI should show which stream was configured.',
  },
};

const FALLBACK_ENTRY: DmrvTechnologyEntry = {
  summary: 'A sensor, data product, or API named in your selected satellite missions.',
  inDpal:
    'DPAL uses this label in adapter configuration, validation rules, and evidence metadata so reviewers know which upstream product family was intended. Check your project’s source settings and API host for live vs demo behavior.',
};

export function getTechnologyEntry(label: string): DmrvTechnologyEntry {
  return GLOSSARY[label] ?? FALLBACK_ENTRY;
}

export function hasTechnologyGlossaryEntry(label: string): boolean {
  return label in GLOSSARY;
}
