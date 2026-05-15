export type CarbonPuraPersistenceMode = 'prisma' | 'memory' | 'unavailable';

export type CarbonPuraProject = {
  id: string;
  projectId: string;
  partnerKey: string;
  name: string;
  status: string;
  locationLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarbonPuraEvidenceEvent = {
  id: string;
  eventId: string;
  projectId: string;
  partnerKey: string;
  moduleId: string | null;
  moduleName: string;
  sourceSuite: string | null;
  eventType: string;
  title: string;
  summary: string | null;
  status: string;
  coordinates: unknown;
  aoiGeoJson: unknown;
  provider: string | null;
  confidenceUse: string | null;
  rawPayloadJson: unknown;
  limitationsJson: unknown;
  evidenceHash: string;
  createdAt: string;
};

export type CarbonPuraEvidencePacket = {
  id: string;
  packetId: string;
  projectId: string;
  partnerKey: string;
  status: string;
  title: string;
  summary: string | null;
  eventIds: string[];
  packetHash: string;
  qrUrl: string | null;
  jsonExportUrl: string | null;
  pdfExportUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCarbonPuraEvidenceEventInput = {
  moduleId?: string | null;
  moduleName: string;
  sourceSuite?: string | null;
  eventType?: string;
  title: string;
  summary?: string | null;
  status?: string;
  confidenceUse?: string | null;
  provider?: string | null;
  rawPayloadJson?: unknown;
  limitationsJson?: string[];
};

export const CARBONPURA_CHAIN_STATUSES = {
  draft: 'Draft',
  evidenceSourceSelected: 'Evidence source selected',
  moduleResultPending: 'Module result pending',
  packetDraftCreated: 'Packet draft created',
  validatorReviewPending: 'Validator review pending',
  qrPagePending: 'QR page pending',
  monitoringSchedulePending: 'Monitoring schedule pending',
} as const;
