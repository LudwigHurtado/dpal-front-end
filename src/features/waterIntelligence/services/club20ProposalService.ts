export interface Club20ProposalSections {
  problem: string;
  opportunity: string;
  agricultureProtection: string;
  conservationMeasurement: string;
  transactionCategories: string;
  stateUsbrExchange: string;
  pilotGeography: string;
  dpalTechnologyRole: string;
  stakeholders: string;
  nextSteps: string;
  russConceptSummary: string;
}

export function buildClub20ProposalDraft(): Club20ProposalSections {
  return {
    problem:
      'Mandatory conservation can strain agricultural water-right holders if savings are not measured, verified, and fairly compensated. The Colorado River Basin faces persistent supply pressure; clarity is needed on how conserved consumptive use is credited and routed.',
    opportunity:
      'A pilot exchange framework can align municipal needs, agricultural participation, and system reliability by treating verified conservation as a measurable, evidence-backed quantity before any transfer or lease is executed.',
    agricultureProtection:
      'DPAL documents conservation performance and supports compensation narratives under approved agreements. DPAL does not replace legal authorities or transfer water rights by itself.',
    conservationMeasurement:
      'Baselines, monitoring, adjustments, and uncertainty buffers produce net verified conservation in acre-feet. Pilot Verified Water Conservation Units (1 VWCU = 1 acre-foot in this demo) illustrate accounting only.',
    transactionCategories:
      'Three pilot categories: resale (lease/sale pathways), system enhancement (reservoir / reliability support), and sequestered/archived (retired from resale for environmental or flow-support goals).',
    stateUsbrExchange:
      'A future State / USBR-coordinated exchange concept would require statutory authority, operating agreements, and hydrologic safeguards — this UI does not assert approval or operational status.',
    pilotGeography:
      'Colorado River Basin demonstration with illustrative sub-projects (Grand Valley agriculture, Front Range urban conservation, Colorado Big Thompson lease prototype, reservoir system enhancement).',
    dpalTechnologyRole:
      'DPAL provides baseline records, monitoring labels, calculator transparency, evidence packets, registry views, public verification patterns, and stakeholder memos — all explicitly marked Pilot / Demonstration Mode.',
    stakeholders:
      'Water-right holders, irrigation districts, municipalities, state and federal water managers, NGOs, and regional forums such as Club 20 — for discussion only in this build.',
    nextSteps:
      'Connect governing program rules, legal review workflows, live hydrology APIs, and independent validation. Keep mock labels until each layer is authorized and wired.',
    russConceptSummary:
      "Russ's concept: Certified water conservation should be measured, verified, and made tradable so water-right holders can be compensated for conserving water instead of being punished by mandatory restrictions. DPAL demonstrates the software layer for baseline measurement, conservation monitoring, evidence packets, pilot Verified Water Conservation Units, transaction categories, and public trust records.",
  };
}
