export type DmrvProjectStatus = 'required' | 'draft' | 'complete' | 'blockchain_ready';

export type DmrvMethodologyDomain = 'carbon' | 'biodiversity' | 'pollution' | 'water' | 'custom';

export type DmrvProjectBlockchain = {
  status: 'none' | 'pending' | 'anchored' | 'unavailable';
  configHash?: string;
  ledgerRecordId?: string;
  qrEvidenceRootUrl?: string;
  anchoredAt?: string;
  serviceMessage?: string;
};

export type DmrvProjectContext = {
  projectId: string;
  projectName: string;
  organization: string;
  description: string;
  categorySlug: string;
  categoryTitle: string;
  typeId: string;
  typeTitle: string;
  location: {
    countryRegion: string;
    latitude: string;
    longitude: string;
    aoiId: string;
    aoiSummary: string;
    /** Serialized polygon vertices (`LatLngPoint[]`) or GeoJSON for map restore. */
    aoiGeoJson: string;
    geoJsonUploaded: boolean;
    coordinateValidation: 'valid' | 'invalid' | 'pending';
  };
  reporting: {
    startDate: string;
    endDate: string;
    monitoringFrequency: string;
    baselineYear: string;
    comparisonPeriod: string;
  };
  methodology: {
    name: string;
    standardFramework: string;
    domain: DmrvMethodologyDomain;
    requiredEvidenceSources: string;
    uncertaintyRules: string;
  };
  reviewer: {
    name: string;
    organization: string;
    role: string;
    reviewRequired: boolean;
    humanVerificationRequired: boolean;
  };
  blockchain: DmrvProjectBlockchain;
  status: DmrvProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type DmrvProjectValidationResult = {
  complete: boolean;
  missing: string[];
  coordinateOk: boolean;
};
