export type EvidenceType = 'image' | 'video' | 'document' | 'field_note' | 'satellite';

export interface GeoTag {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface ImpactEvidence {
  id: string;
  projectId: string;
  type: EvidenceType;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  caption?: string;
  fieldNotes?: string;
  geoTag?: GeoTag;
  capturedAt: string;
  uploadedById: string;
  uploadedAt: string;
  tags: string[];
}

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  image: 'Photo',
  video: 'Video',
  document: 'Document',
  field_note: 'Field Note',
  satellite: 'Satellite Data',
};

export const EVIDENCE_TYPE_ICONS: Record<EvidenceType, string> = {
  image: '📷',
  video: '🎥',
  document: '📄',
  field_note: '📝',
  satellite: '🛰️',
};
