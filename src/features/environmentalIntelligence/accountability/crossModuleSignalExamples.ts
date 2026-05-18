/** Example mapping rows for Satellite Accountability UI — not live findings. */
export const ACCOUNTABILITY_CROSS_MODULE_EXAMPLES = [
  {
    module: 'Hyperspectral Plastic Watch',
    signal: 'plastic_pollution_confidence',
    outcome: 'metadata_only / preview scenario',
  },
  {
    module: 'Forest Integrity',
    signal: 'forest_loss / biomass_decline',
    outcome: 'satellite_indicated when supported by configured providers',
  },
  {
    module: 'AquaScan / Water Monitor',
    signal: 'water_quality_risk',
    outcome: 'satellite_indicated where live — requires field validation for legal claims',
  },
  {
    module: 'Carbon DMRV',
    signal: 'carbon_mrv',
    outcome: 'DMRV support context — not final credit verification',
  },
  {
    module: 'CARB / EPA surfaces',
    signal: 'official_record_supported',
    outcome: 'regulatory or public-record cross-check — interpretation still required',
  },
] as const;
