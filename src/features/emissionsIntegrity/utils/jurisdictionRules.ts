import type { Jurisdiction } from '../types/emissionsIntegrity.types';

export const JURISDICTION_CONTEXT: Record<Jurisdiction, string[]> = {
  California: [
    'Strongest mandatory reporting and disclosure framework. Use CARB MRR, cap-and-invest verification where applicable, EPA GHGRP, and SB 253/SB 261 disclosure context.',
  ],
  Arizona: [
    'Statewide GHG mandates are limited. Focus on EPA GHGRP, Title V, PSD/NSR permits, local air rules, and company disclosures.',
  ],
  'New Mexico': [
    'Strong methane and oil/gas review context. Focus on venting, flaring, methane waste prevention, ozone precursor rules, and oil/gas operational signals.',
  ],
  Federal: [
    'Use EPA GHGRP, Clean Air Act permitting, Title V, PSD/NSR, facility permits, and company disclosures.',
  ],
};

export const LEGAL_DISCLAIMER =
  'DPAL does not make final legal findings. DPAL identifies evidence-based discrepancies for review.';
