import type { Jurisdiction } from '../types/emissionsIntegrity.types';

export const JURISDICTION_CONTEXT: Record<Jurisdiction, string[]> = {
  California: [
    'CARB mandatory reporting requirements may apply depending on facility type and threshold.',
    'Cap-and-invest compliance and verified reporting can shape how claims should be reviewed.',
    'SB 253 and SB 261 disclosure context may affect broader company climate-risk statements.',
    'Statewide emissions target context increases scrutiny of major reduction claims.',
  ],
  Arizona: [
    'Statewide GHG mandate is limited compared with California.',
    'Stronger analysis should focus on EPA GHGRP, Title V, PSD permits, local air rules, and company disclosures.',
    'Permit and operational records often carry more audit weight than statewide climate mandates.',
  ],
  'New Mexico': [
    'Oil and gas methane rules create a strong basis for methane discrepancy review.',
    'Venting and flaring restrictions can be relevant where plume signals or operational claims diverge.',
    'Ozone precursor rules can strengthen NO2 and activity-proxy review for industrial sites.',
  ],
  Federal: [
    'EPA GHGRP can provide reported emissions records for covered facilities.',
    'Clean Air Act permitting, Title V, and PSD / NSR records help contextualize claimed reductions.',
    'Facility-specific permits and enforcement history should be reviewed before any legal conclusion is drawn.',
  ],
};

export const LEGAL_DISCLAIMER =
  'DPAL does not make final legal findings. DPAL identifies evidence-based discrepancies between reported emissions, observed signals, and regulatory records.';
