import type { AccountabilityProfileType } from '../accountabilityProfiles/accountabilityProfileTypes';
import type { EnvironmentalValidationRequestType } from '../validation/validationTypes';

export type BusinessWorkflowTemplate = {
  workflowId: string;
  name: string;
  description: string;
  defaultProfileType: AccountabilityProfileType;
  defaultUseCaseId: string;
  defaultValidationRequestType: EnvironmentalValidationRequestType;
  requiresValidation: boolean;
  outputProducts: string[];
  safetyLanguage: string;
  limitations: string[];
};

const CORE_LIM =
  'Orchestrated workflows assemble screening artifacts only. Outputs are not legal, regulatory, enforcement, registry, VIU, carbon-credit-issuance, or human-verification conclusions.';

const TEMPLATES: BusinessWorkflowTemplate[] = [
  {
    workflowId: 'corporate_greenwashing_review',
    name: 'Corporate greenwashing review',
    description:
      'Builds a company-oriented accountability profile, aligns disclosures with configured environmental sources, and can open validation for document-oriented review.',
    defaultProfileType: 'company',
    defaultUseCaseId: 'corporate_greenwashing_review',
    defaultValidationRequestType: 'document_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL compares available disclosures and source signals. It does not determine fraud, guilt, or regulatory liability.',
    limitations: [CORE_LIM, 'Disclosure comparison depends on accessible public materials and configured adapters.'],
  },
  {
    workflowId: 'carbon_credit_integrity',
    name: 'Carbon credit integrity screening',
    description:
      'Builds a project-oriented profile and runs forest, carbon, and public-record oriented sources for integrity screening.',
    defaultProfileType: 'project',
    defaultUseCaseId: 'carbon_credit_integrity',
    defaultValidationRequestType: 'expert_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL organizes screening evidence. It does not issue carbon credits, assert VIU eligibility, registry approval, or offset validity.',
    limitations: [CORE_LIM, 'Satellite and registry signals are scene- or record-level unless otherwise stated by the adapter.'],
  },
  {
    workflowId: 'methane_super_emitter_monitoring',
    name: 'Methane super-emitter monitoring',
    description:
      'Builds a facility profile and runs emissions, weather, and public-record sources for methane-oriented screening.',
    defaultProfileType: 'facility',
    defaultUseCaseId: 'methane_super_emitter_monitoring',
    defaultValidationRequestType: 'expert_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL surfaces emissions-related signals for review. It does not prove enforcement, permit violations, or facility guilt.',
    limitations: [CORE_LIM, 'Emissions proxies may be incomplete when satellites, weather, or public records are unavailable.'],
  },
  {
    workflowId: 'water_pollution_evidence',
    name: 'Water pollution evidence screening',
    description:
      'Builds an incident-oriented site profile and runs water, public-record, and evidence-packet-oriented sources.',
    defaultProfileType: 'incident',
    defaultUseCaseId: 'water_pollution_evidence',
    defaultValidationRequestType: 'lab_sample',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL collects screening evidence only. It does not certify contamination, legal harm, or regulatory outcomes.',
    limitations: [CORE_LIM, 'Hydrology and imagery adapters may skip when credentials, AOI, or dates are insufficient.'],
  },
  {
    workflowId: 'hazardous_waste_integrity_audit',
    name: 'Hazardous waste integrity audit (screening)',
    description:
      'Builds a facility profile and runs EPA and regulatory-oriented evidence workflows for screening (not an official audit).',
    defaultProfileType: 'facility',
    defaultUseCaseId: 'hazardous_waste_integrity_audit',
    defaultValidationRequestType: 'document_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL aligns facility context with available regulatory records. It is not an EPA or agency determination.',
    limitations: [CORE_LIM, 'Regulatory datasets can lag, redact fields, or omit facilities not in the queried systems.'],
  },
  {
    workflowId: 'insurance_environmental_risk',
    name: 'Insurance environmental risk screening',
    description:
      'Builds a property profile and runs fire, flood, and weather-oriented risk sources for underwriting support screening.',
    defaultProfileType: 'property',
    defaultUseCaseId: 'insurance_environmental_risk',
    defaultValidationRequestType: 'expert_review',
    requiresValidation: false,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening'],
    safetyLanguage:
      'DPAL summarizes environmental hazard signals available to adapters. It is not an insurance quote, bind decision, or actuarial certification.',
    limitations: [CORE_LIM, 'Hazard layers may be incomplete; always treat outputs as screening inputs to human review.'],
  },
  {
    workflowId: 'real_estate_land_due_diligence',
    name: 'Real estate land due diligence screening',
    description:
      'Builds a property profile and runs land and environmental record checks for transactional due diligence support.',
    defaultProfileType: 'property',
    defaultUseCaseId: 'real_estate_land_due_diligence',
    defaultValidationRequestType: 'document_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL aggregates record-oriented signals. It does not clear title, guarantee land condition, or replace professional diligence.',
    limitations: [CORE_LIM, 'Parcel boundaries and record coverage vary by jurisdiction and data partner availability.'],
  },
  {
    workflowId: 'supplier_environmental_watch',
    name: 'Supplier environmental watch',
    description:
      'Builds a supplier profile and runs disclosure and public-record checks with optional validation.',
    defaultProfileType: 'supplier',
    defaultUseCaseId: 'supplier_environmental_watch',
    defaultValidationRequestType: 'document_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL compares supplier disclosures with available public records. It does not certify supply-chain compliance.',
    limitations: [CORE_LIM, 'Supplier identifiers and international disclosures may be sparse or delayed.'],
  },
  {
    workflowId: 'government_transparency_dashboard',
    name: 'Government transparency dashboard',
    description:
      'Builds a public-asset profile and streams evidence-oriented signals for civic transparency workflows.',
    defaultProfileType: 'public_asset',
    defaultUseCaseId: 'government_transparency_dashboard',
    defaultValidationRequestType: 'community_followup',
    requiresValidation: false,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening'],
    safetyLanguage:
      'DPAL organizes civic transparency artifacts. It does not accuse officials, assert misconduct, or replace open-government processes.',
    limitations: [CORE_LIM, 'Public datasets may omit context; human interpretation remains required.'],
  },
  {
    workflowId: 'environmental_litigation_support',
    name: 'Environmental litigation support (evidence organization)',
    description:
      'Builds a site profile and organizes evidence lanes for legal teams without providing legal advice.',
    defaultProfileType: 'site',
    defaultUseCaseId: 'environmental_litigation_support',
    defaultValidationRequestType: 'document_review',
    requiresValidation: true,
    outputProducts: ['accountability_profile', 'evidence_packet', 'risk_screening', 'validation_request'],
    safetyLanguage:
      'DPAL organizes evidence for review workflows only. It does not provide legal advice, predict outcomes, assert admissibility, or establish liability.',
    limitations: [
      CORE_LIM,
      'Evidence organization is not a substitute for counsel; privilege, chain-of-custody, and court rules are outside DPAL.',
    ],
  },
];

export function getBusinessWorkflowTemplate(workflowId: string): BusinessWorkflowTemplate | undefined {
  return TEMPLATES.find((t) => t.workflowId === workflowId.trim());
}

export function getBusinessWorkflowTemplates(): BusinessWorkflowTemplate[] {
  return [...TEMPLATES];
}
