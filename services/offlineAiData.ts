
import { Category, type AiDirective, type IntelItem, type TrainingScenario } from '../types';

export const OFFLINE_DIRECTIVES: Record<string, AiDirective[]> = {
  [Category.Environment]: [
    {
      id: 'DIR-OFF-001',
      title: 'LOCAL_BUFFER: Drainage Audit',
      description: 'Audit industrial runoff channels for non-permitted discharge signatures.',
      instruction: 'Complete all phases to document and verify industrial runoff compliance.',
      rewardHc: 150, 
      rewardXp: 50, 
      difficulty: 'Standard', 
      category: Category.Environment, 
      status: 'available', 
      timestamp: Date.now(),
      currentPhaseIndex: 0,
      phases: [
        {
          id: 'phase-recon-001',
          name: 'Initial Reconnaissance',
          description: 'Survey the target area and identify potential discharge points.',
          phaseType: 'RECON',
          steps: [
            {
              id: 'step-recon-1',
              name: 'Locate Discharge Points',
              task: 'Identify all visible outflow valves and drainage channels in the target area.',
              instruction: 'Walk the perimeter and mark all discharge points on a map or notes.',
              isComplete: false,
              requiresProof: true,
              proofType: 'location',
              order: 1
            },
            {
              id: 'step-recon-2',
              name: 'Assess Safety Conditions',
              task: 'Check for visible chemical hazards, warning signs, or restricted access areas.',
              instruction: 'Document any safety concerns or barriers to access.',
              isComplete: false,
              requiresProof: true,
              proofType: 'photo',
              order: 2
            }
          ],
          compensation: { hc: 30, xp: 10 },
          isComplete: false,
          estimatedDuration: '30-45 minutes'
        },
        {
          id: 'phase-exec-001',
          name: 'Evidence Collection',
          description: 'Capture visual and environmental evidence of discharge activity.',
          phaseType: 'EXECUTION',
          steps: [
            {
              id: 'step-exec-1',
              name: 'Capture Outflow Images',
              task: 'Take 3 high-fidelity photos of outflow residue with timestamps.',
              instruction: 'Ensure photos show clear detail of any discharge material or residue.',
              isComplete: false,
              requiresProof: true,
              proofType: 'photo',
              order: 1
            },
            {
              id: 'step-exec-2',
              name: 'Document Location Metadata',
              task: 'Record GPS coordinates and exact location details.',
              instruction: 'Note building address, nearest landmarks, and access points.',
              isComplete: false,
              requiresProof: true,
              proofType: 'location',
              order: 2
            },
            {
              id: 'step-exec-3',
              name: 'Log Timestamp Evidence',
              task: 'Document the time of observation and any activity patterns.',
              instruction: 'Note if discharge is continuous, intermittent, or one-time.',
              isComplete: false,
              requiresProof: true,
              proofType: 'text',
              order: 3
            }
          ],
          compensation: { hc: 75, xp: 25 },
          isComplete: false,
          estimatedDuration: '1-2 hours'
        },
        {
          id: 'phase-verify-001',
          name: 'Verification & Validation',
          description: 'Verify evidence quality and cross-reference with public records.',
          phaseType: 'VERIFICATION',
          steps: [
            {
              id: 'step-verify-1',
              name: 'Review Evidence Quality',
              task: 'Ensure all photos are clear and metadata is complete.',
              instruction: 'Check that images show identifiable features and timestamps are accurate.',
              isComplete: false,
              requiresProof: false,
              order: 1
            },
            {
              id: 'step-verify-2',
              name: 'Submit Proof Package',
              task: 'Upload all collected evidence to the DPAL ledger.',
              instruction: 'Combine photos, location data, and notes into a single submission.',
              isComplete: false,
              requiresProof: true,
              proofType: 'photo',
              order: 2
            }
          ],
          compensation: { hc: 30, xp: 10 },
          isComplete: false,
          estimatedDuration: '20-30 minutes'
        },
        {
          id: 'phase-complete-001',
          name: 'Completion & Reward',
          description: 'Final review and compensation distribution.',
          phaseType: 'COMPLETION',
          steps: [
            {
              id: 'step-complete-1',
              name: 'Confirm Work Completion',
              task: 'Review all phases and confirm directive completion.',
              instruction: 'Verify all evidence has been submitted and phases are marked complete.',
              isComplete: false,
              requiresProof: false,
              order: 1
            }
          ],
          compensation: { hc: 15, xp: 5 },
          isComplete: false,
          estimatedDuration: '5 minutes'
        }
      ],
      packet: {
        priority: 'HIGH', 
        confidence: 94, 
        timeWindow: '4 Hours', 
        geoRadiusMeters: 500, 
        primaryAction: 'Documentation of physical residue.',
        steps: [{ verb: 'Locate', actor: 'Operative', detail: 'Find primary outflow valve', eta: '15m', safety: 'High' }],
        escalation: [{ trigger: 'Chemical Burn', action: 'Notify Med-Ops' }],
        evidenceMissing: [{ item: 'pH Strip Test', howToCaptureSafely: 'Use telescopic sampler' }],
        resourceRequests: [], 
        safetyFlags: ['CHEMICAL']
      }
    }
  ],
  [Category.Infrastructure]: [
    {
      id: 'DIR-OFF-002',
      title: 'LOCAL_BUFFER: Signal Parity',
      description: 'Verify traffic light cycle timing against the municipal public ledger.',
      instruction: 'Complete all phases to verify traffic signal compliance with municipal standards.',
      rewardHc: 100, 
      rewardXp: 30, 
      difficulty: 'Entry', 
      category: Category.Infrastructure, 
      status: 'available', 
      timestamp: Date.now(),
      currentPhaseIndex: 0,
      phases: [
        {
          id: 'phase-recon-002',
          name: 'Signal Identification',
          description: 'Locate and identify the target traffic signal intersection.',
          phaseType: 'RECON',
          steps: [
            {
              id: 'step-recon-1',
              name: 'Locate Intersection',
              task: 'Find the specific traffic signal mentioned in the directive.',
              instruction: 'Navigate to the intersection and confirm you have the correct signal.',
              isComplete: false,
              requiresProof: true,
              proofType: 'location',
              order: 1
            },
            {
              id: 'step-recon-2',
              name: 'Note Signal Configuration',
              task: 'Document the type of signal (standard, pedestrian, left-turn arrow, etc.).',
              instruction: 'Record the signal type and any special features.',
              isComplete: false,
              requiresProof: true,
              proofType: 'photo',
              order: 2
            }
          ],
          compensation: { hc: 20, xp: 6 },
          isComplete: false,
          estimatedDuration: '15-20 minutes'
        },
        {
          id: 'phase-exec-002',
          name: 'Cycle Timing Measurement',
          description: 'Record complete traffic light cycles and measure timing.',
          phaseType: 'EXECUTION',
          steps: [
            {
              id: 'step-exec-1',
              name: 'Record Green Light Duration',
              task: 'Time how long the green light stays on for the main direction.',
              instruction: 'Use a stopwatch or timer to measure the green light cycle.',
              isComplete: false,
              requiresProof: true,
              proofType: 'text',
              order: 1
            },
            {
              id: 'step-exec-2',
              name: 'Record Complete Cycle',
              task: 'Time one full cycle (red → green → yellow → red).',
              instruction: 'Measure the complete cycle time for accuracy.',
              isComplete: false,
              requiresProof: true,
              proofType: 'text',
              order: 2
            },
            {
              id: 'step-exec-3',
              name: 'Document Deviations',
              task: 'Note any timing that differs from expected municipal standards.',
              instruction: 'Compare measured times to expected values and document differences.',
              isComplete: false,
              requiresProof: true,
              proofType: 'text',
              order: 3
            }
          ],
          compensation: { hc: 50, xp: 15 },
          isComplete: false,
          estimatedDuration: '30-45 minutes'
        },
        {
          id: 'phase-verify-002',
          name: 'Data Verification',
          description: 'Verify timing data and submit to transit buffer.',
          phaseType: 'VERIFICATION',
          steps: [
            {
              id: 'step-verify-1',
              name: 'Cross-Check Measurements',
              task: 'Verify timing measurements are consistent and accurate.',
              instruction: 'Review recorded times for logical consistency.',
              isComplete: false,
              requiresProof: false,
              order: 1
            },
            {
              id: 'step-verify-2',
              name: 'Submit to Ledger',
              task: 'Upload timing data to the municipal transit buffer.',
              instruction: 'Submit all recorded measurements and observations.',
              isComplete: false,
              requiresProof: true,
              proofType: 'text',
              order: 2
            }
          ],
          compensation: { hc: 20, xp: 6 },
          isComplete: false,
          estimatedDuration: '15 minutes'
        },
        {
          id: 'phase-complete-002',
          name: 'Completion & Reward',
          description: 'Final confirmation and reward distribution.',
          phaseType: 'COMPLETION',
          steps: [
            {
              id: 'step-complete-1',
              name: 'Confirm Completion',
              task: 'Review all phases and confirm directive completion.',
              instruction: 'Verify all data has been submitted correctly.',
              isComplete: false,
              requiresProof: false,
              order: 1
            }
          ],
          compensation: { hc: 10, xp: 3 },
          isComplete: false,
          estimatedDuration: '5 minutes'
        }
      ],
      packet: {
        priority: 'LOW', 
        confidence: 88, 
        timeWindow: '12 Hours', 
        geoRadiusMeters: 200, 
        primaryAction: 'Timing synchronization.',
        steps: [{ verb: 'Observe', actor: 'Citizen', detail: 'Clock green light duration', eta: '5m', safety: 'Safe' }],
        escalation: [], 
        evidenceMissing: [], 
        resourceRequests: [], 
        safetyFlags: ['TRAFFIC']
      }
    }
  ]
};

export const OFFLINE_MISSION_TEMPLATES = {
    EVIDENCE_FIRST: [
        { name: 'Sync Geometry', task: 'Confirm location and time window anchors.', icon: '📍', priority: 'High' },
        { name: 'Visual Telemetry', task: 'Capture 4K photo or video evidence with metadata.', icon: '📸', priority: 'High' },
        { name: 'Witness Ledger', task: 'Identify witness and record encrypted contact hash.', icon: '👥', priority: 'Medium' },
        { name: 'Factual Synthesis', task: 'Create a short neutral factual narrative.', icon: '📄', priority: 'Medium' },
        { name: 'Ledger Commit', task: 'Submit forensic report with tags and category.', icon: '💾', priority: 'High' }
    ],
    COMMUNITY_FIRST: [
        { name: 'Impact Mapping', task: 'Identify impacted groups (neighbors, schools, riders).', icon: '🗺️', priority: 'High' },
        { name: 'Resource Locating', task: 'Locate local support nodes (NGOs, Agencies).', icon: '🏥', priority: 'Medium' },
        { name: 'Draft Pulse', task: 'Draft a non-violent communal outreach message.', icon: '✉️', priority: 'Medium' },
        { name: 'Sync Confirmations', task: 'Collect 2 confirmations or field tips from members.', icon: '✅', priority: 'Medium' },
        { name: 'Communal Dispatch', task: 'Submit report and share mapped resource list.', icon: '📢', priority: 'High' }
    ],
    SYSTEMS_FIRST: [
        { name: 'Node Identification', task: 'Identify responsible agency or corporate entity.', icon: '🏢', priority: 'High' },
        { name: 'Protocol Audit', task: 'Gather the specific policy or rule that applies.', icon: '📖', priority: 'Medium' },
        { name: 'Violation Logging', task: 'Document specific structural violation indicators.', icon: '⚠️', priority: 'High' },
        { name: 'Escalation Plan', task: 'Create tactical escalation plan (who/when/proof).', icon: '📈', priority: 'Medium' },
        { name: 'Systemic Commit', task: 'Submit report and generate follow-up directive.', icon: '🔄', priority: 'High' }
    ]
};

export const OFFLINE_INTEL: IntelItem[] = [
  {
    id: 'INTEL-OFF-01',
    category: Category.Environment,
    title: 'LOCAL_BUFFER: Anomaly in Sector 7',
    location: 'Regional Terminal',
    time: 'Recent',
    summary: 'Internal sensors detected a 12% rise in air particulates. Local operatives requested to verify filters.',
    source: 'DPAL_INTERNAL',
    links: [{ uri: '#', title: 'Local Cache' }]
  }
];

export const OFFLINE_TRAINING: TrainingScenario[] = [
  {
    id: 'TRAIN-OFF-01',
    title: 'LOCAL_BUFFER: Conflict Resolution',
    description: 'A citizen is blocking a public path, claiming private ownership. Verify the zoning shard.',
    environment: 'Urban Corridor',
    bgKeyword: 'city',
    objectives: ['Verify Zoning Data'],
    masterDebrief: 'Conflict resolved via data transparency.',
    difficulty: 2,
    options: [{ id: '1', text: 'Scan zoning marker', successOutcome: 'Marker confirms public path.', failOutcome: 'N/A', dc: 5, rationale: 'Primary lock.' }]
  }
];
