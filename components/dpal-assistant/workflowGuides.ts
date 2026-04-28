import type { DpalWorkflowGuideDefinition } from './workflowGuideTypes';

export const earthObservationGuide: DpalWorkflowGuideDefinition = {
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
      description: 'Define the land or water area to analyze.',
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
      description: 'Ask DPAL to search available satellite sources.',
      requiredState: ['scanRequested'],
    },
    {
      id: 'review_results',
      title: 'Review Results',
      description: 'Check signal, confidence, source, date, and limitations.',
      requiredState: ['scanResult'],
    },
    {
      id: 'create_evidence_packet',
      title: 'Create Evidence Packet',
      description: 'Package location, AOI, source, metrics, and limitations.',
      requiredState: ['evidencePacket'],
    },
    {
      id: 'create_verification_mission',
      title: 'Create Verification Mission',
      description: 'Send the issue to field verification or validator review.',
      requiredState: ['missionCreated'],
    },
  ],
};

export const genericProjectGuide: DpalWorkflowGuideDefinition = {
  moduleType: 'generic_project',
  title: 'DPAL Project Guide',
  steps: [
    { id: 'define_goal', title: 'Define Goal', description: 'Describe what you need to verify or solve.', requiredState: [] },
    { id: 'collect_inputs', title: 'Collect Inputs', description: 'Add location, evidence, and source context.', requiredState: [] },
    { id: 'run_analysis', title: 'Run Analysis', description: 'Run the available module scan or audit.', requiredState: [] },
    { id: 'review_limits', title: 'Review Limits', description: 'Check uncertainty and what is not verified.', requiredState: [] },
    { id: 'plan_action', title: 'Plan Action', description: 'Create next mission, report, or audit action.', requiredState: [] },
  ],
};

export const workflowGuides: Record<string, DpalWorkflowGuideDefinition> = {
  earth_observation: earthObservationGuide,
  aquascan: genericProjectGuide,
  carb_air: genericProjectGuide,
  carbon_viu: genericProjectGuide,
  hazardous_waste: genericProjectGuide,
  missions: genericProjectGuide,
  generic_project: genericProjectGuide,
};

