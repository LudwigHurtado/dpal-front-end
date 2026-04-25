import type { AlertItem, DataSourceItem, MetricItem, ModuleCardItem } from './types';

export const commandCenterMetrics: MetricItem[] = [
  { label: 'Facilities Monitored', value: '1,248', trend: '+4.2% vs last month' },
  { label: 'Active Alerts', value: '37', trend: '12 require triage today' },
  { label: 'High Risk Sites', value: '9', trend: '2 increased in last 24h' },
  { label: 'Evidence Packets Generated', value: '216', trend: '+18 this week' },
];

export const alertFeed: AlertItem[] = [
  { id: 'ALT-1001', title: 'Unexpected stack emission plume', location: 'Richmond, CA', severity: 'high', time: '11 min ago' },
  { id: 'ALT-1002', title: 'Storage activity mismatch', location: 'Long Beach, CA', severity: 'medium', time: '29 min ago' },
  { id: 'ALT-1003', title: 'Water thermal anomaly', location: 'Baton Rouge, LA', severity: 'medium', time: '47 min ago' },
  { id: 'ALT-1004', title: 'Permit declaration lag', location: 'Portland, OR', severity: 'low', time: '1h ago' },
];

export const hubSections: Array<{ title: string; description: string; cards: ModuleCardItem[] }> = [
  {
    title: 'Monitoring & Remote Sensing',
    description: 'Observe environmental conditions using satellite, sensor, and geospatial data.',
    cards: [
      { title: 'Earth Observation', badge: 'Monitoring', description: 'Track regional land, thermal, and atmospheric changes with multi-sensor snapshots and trend baselines.', status: 'Operational', cta: 'Open Module' },
      { title: 'Water Satellite Monitor', badge: 'Monitoring', description: 'Review watershed stress, reservoir movement, and anomaly markers from remote sensing indicators.', status: 'Operational', cta: 'Open Module' },
      { title: 'Air Quality Control', badge: 'Monitoring', description: 'Monitor pollutant risk zones and compare observed concentration trends against declared emissions.', status: 'Operational', cta: 'Open Module' },
      { title: 'Forest Integrity', badge: 'Monitoring', description: 'Detect canopy disturbance, habitat fragmentation, and restoration progress using geospatial evidence.', status: 'Operational', cta: 'Open Module' },
    ],
  },
  {
    title: 'Carbon & MRV',
    description: 'Measure, calculate, verify, and explain carbon impacts.',
    cards: [
      { title: 'Carbon Intelligence & MRV', badge: 'MRV', description: 'Run carbon overview analytics, MRV calculations, verification checks, and VIU impact accounting.', status: 'Operational', cta: 'Open Module' },
    ],
  },
  {
    title: 'Compliance & Audits',
    description: 'Compare reported data against evidence, detect discrepancies, and export audit packets.',
    cards: [
      { title: 'Emissions Audit', badge: 'Audit', description: 'Validate emissions claims against supporting activity records, remote observations, and jurisdiction thresholds.', status: 'Review Queue', cta: 'Open Module' },
      { title: 'Hazardous Waste Integrity Audit', badge: 'Audit', description: 'Review RCRA records, transport evidence, and permit obligations for compliance inconsistencies.', status: 'Operational', cta: 'Open Module' },
      { title: 'Fuel Storage Integrity Audit', badge: 'Audit', description: 'Assess storage declarations against throughput, thermal activity, and transport flow evidence.', status: 'Pilot', cta: 'Open Module' },
    ],
  },
  {
    title: 'Ecosystem & Impact',
    description: 'Track conservation outcomes, environmental projects, and public-facing impact summaries.',
    cards: [
      { title: 'Ecological Conservation', badge: 'Impact', description: 'Follow habitat quality, vegetation recovery, and conservation intervention outcomes over time.', status: 'Operational', cta: 'Open Module' },
      { title: 'Impact Dashboard', badge: 'Impact', description: 'View stakeholder-ready summaries of verified project outcomes and environmental impact claims.', status: 'Operational', cta: 'Open Module' },
    ],
  },
  {
    title: 'Signals & Intelligence',
    description: 'Detect cross-domain anomalies, alerts, and environmental intelligence signals.',
    cards: [
      { title: 'Global Environmental Signals', badge: 'Signals', description: 'Aggregate hazard signals, cross-domain anomalies, and early warning intelligence indicators.', status: 'Operational', cta: 'Open Module' },
    ],
  },
];

export const mockDataSources: DataSourceItem[] = [
  { name: 'EPA Facility Registry', type: 'Regulatory Registry', freshness: 'Daily', confidence: 'High' },
  { name: 'Satellite Thermal Index', type: 'Remote Sensing', freshness: '6h', confidence: 'Medium-High' },
  { name: 'Transport Flow Logs', type: 'Logistics', freshness: 'Daily', confidence: 'Medium' },
  { name: 'Self-Reported Facility Data', type: 'Operator Report', freshness: 'Weekly', confidence: 'Variable' },
];
