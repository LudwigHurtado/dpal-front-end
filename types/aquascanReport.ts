export interface AquaScanEvidenceAttachment {
  name: string;
  type: string;
  size?: number;
  hash?: string;
  url?: string;
}

export interface AquaScanEvidenceScreenshot {
  name: string;
  url?: string;
  hash?: string;
}

export interface AquaScanEvidenceReport {
  reportId: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  createdBy?: string;
  aquaScanResult: {
    beforeDate?: string;
    afterDate?: string;
    comparisonDate?: string;
    aoiName?: string;
    aoiCoordinates?: Array<{ lat: number; lng: number }>;
    centerPoint?: { lat: number; lng: number };
    areaSqKm?: number;
    status?: string;
    confidence?: number;
    indices: {
      ndwi?: { before?: number; after?: number; change?: number; percentChange?: number };
      ndvi?: { before?: number; after?: number; change?: number; percentChange?: number };
      ndmi?: { before?: number; after?: number; change?: number; percentChange?: number };
      nbr?: { before?: number; after?: number; change?: number; percentChange?: number };
    };
  };
  satelliteMetadata: {
    source?: string;
    provider?: string;
    product?: string;
    layerName?: string;
    acquisitionDate?: string;
    comparisonWindow?: string;
    resolution?: string;
    cloudCover?: number | null;
    tileUrl?: string;
    mapSnapshotUrl?: string;
    inspectedCoordinates?: { lat: number; lng: number };
  };
  aiIntelligence: {
    summary: string;
    keyFindings: string[];
    confidenceInterpretation: string;
    riskLevel?: string;
    missingEvidence: string[];
    suggestedQuestions: string[];
    recommendedActions: string[];
    disclaimers: string[];
  };
  evidencePacket: {
    includedFiles?: AquaScanEvidenceAttachment[];
    screenshots?: AquaScanEvidenceScreenshot[];
    notes?: string[];
  };
  hashes: {
    reportPayloadHash: string;
    pdfHash?: string;
    evidenceHash?: string;
    previousBlockHash?: string;
    blockHash?: string;
  };
  ledger: {
    blockId: string;
    chainName: 'DPAL Evidence Ledger';
    chainType: 'internal-hash-chain' | 'public-chain' | 'hybrid';
    transactionId?: string;
    blockTimestamp: string;
    previousHash?: string;
    currentHash: string;
    verificationStatus: 'logged' | 'pending' | 'failed';
  };
  qr: {
    reportUrl: string;
    qrCodeDataUrl?: string;
    verificationUrl?: string;
  };
  situationRoom: {
    roomId: string;
    roomUrl: string;
    status: 'open' | 'pending' | 'closed';
  };
}

export interface BuildAquaScanEvidenceReportInput {
  projectId?: string;
  projectName?: string;
  createdBy?: string;
  createdAt?: string;
  aquaScanResult: AquaScanEvidenceReport['aquaScanResult'];
  satelliteMetadata: AquaScanEvidenceReport['satelliteMetadata'];
  aiIntelligence: AquaScanEvidenceReport['aiIntelligence'];
  evidencePacket: AquaScanEvidenceReport['evidencePacket'];
}
