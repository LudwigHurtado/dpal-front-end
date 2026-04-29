import type { DpalProjectGuideDefinition } from './projectGuideTypes';

export const earthObservationGuide: DpalProjectGuideDefinition = {
  moduleType: 'earth_observation',
  title: 'Earth Observation Guide',
  steps: [
    {
      id: 'choose_analysis_type',
      title: 'Choose Analysis Type',
      description: 'Tell DPAL what the satellite should look for.',
      requiredState: ['analysisType'],
    },
    {
      id: 'select_location',
      title: 'Select Location',
      description: 'Pick the center point for the scan.',
      requiredState: ['latitude', 'longitude'],
    },
    {
      id: 'define_aoi',
      title: 'Draw Area of Interest',
      description: 'Define the actual land or water area to analyze.',
      requiredState: ['aoiDraft'],
    },
    {
      id: 'save_aoi',
      title: 'Save AOI',
      description: 'Lock the boundary before scanning.',
      requiredState: ['aoiSaved'],
    },
    {
      id: 'run_scan',
      title: 'Run Scan',
      description: 'Search available satellite sources and compute available metrics.',
      requiredState: ['scanRequested'],
    },
    {
      id: 'review_results',
      title: 'Review Results',
      description: 'Check signal status, processing stage, confidence, source, metric method, and limitations.',
      requiredState: ['scanResult'],
    },
    {
      id: 'create_evidence_packet',
      title: 'Create Evidence Packet',
      description: 'Package location, AOI, source, metrics, limitations, and recommended actions.',
      requiredState: ['evidencePacket'],
    },
    {
      id: 'create_verification_mission',
      title: 'Create Verification Mission',
      description: 'Send the issue to field verification or validator review.',
      requiredState: ['missionCreated'],
    },
    {
      id: 'send_to_situation_room',
      title: 'Send to Situation Room',
      description: 'If the signal needs team review, open the existing DPAL Situation Room thread.',
      requiredState: ['situationRoomSent'],
    },
  ],
};

export const genericProjectGuide: DpalProjectGuideDefinition = {
  moduleType: 'generic_project',
  title: 'DPAL Project Guide',
  steps: [
    { id: 'define_goal', title: 'Define Goal', description: 'Describe what you need to verify or solve.', requiredState: [] },
    { id: 'collect_inputs', title: 'Collect Inputs', description: 'Add location, evidence, and source context.', requiredState: [] },
    { id: 'run_analysis', title: 'Run Analysis', description: 'Run scan/audit steps available in this module.', requiredState: [] },
    { id: 'review_limits', title: 'Review Limits', description: 'Check uncertainty, limitations, and claim safety.', requiredState: [] },
    { id: 'route_action', title: 'Route Action', description: 'Create the next mission, report, or audit action.', requiredState: [] },
  ],
};

export const projectGuides: Record<string, DpalProjectGuideDefinition> = {
  earth_observation: earthObservationGuide,
  aquascan: genericProjectGuide,
  carb_air: genericProjectGuide,
  carbon_viu: genericProjectGuide,
  hazardous_waste: genericProjectGuide,
  missions: genericProjectGuide,
  good_wheels: genericProjectGuide,
  generic_project: genericProjectGuide,
};

