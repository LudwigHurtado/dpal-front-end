export type CarbonPuraProjectRecord = {
  id: string;
  projectId: string;
  partnerKey: string;
  name: string;
  status: string;
  locationLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarbonPuraEvidenceEventRecord = {
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

export type CarbonPuraEvidencePacketRecord = {
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

export const CARBONPURA_DEFAULT_PARTNER_KEY = 'carbonpura';

export const CARBONPURA_EVIDENCE_SOURCE_LIMITATION =
  'Evidence selection only; scan output attachment pending unless module has exported result.';
