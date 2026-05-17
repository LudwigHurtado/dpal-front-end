/**
 * Offline / fallback DMRV assistant — uses only context text, never invents measurements.
 */

function lower(s: string): string {
  return s.toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  const t = lower(text);
  return terms.some((term) => t.includes(term));
}

/** Truncate huge JSON context so rule-based parsing stays fast. */
export function trimDmrvAiContext(context: string, maxLen = 12_000): string {
  if (context.length <= maxLen) return context;
  return `${context.slice(0, maxLen)}\n…(context truncated for assistant)`;
}

export function dmrvRuleBasedReply(contextSummary: string, userMessage: string): string {
  const q = lower(userMessage.trim());
  const ctx = contextSummary;

  if (!q) {
    return 'Ask a specific question about this DMRV step — for example required fields, satellite sources, or what is still Missing.';
  }

  if (includesAny(q, ['missing', 'incomplete', 'gap', 'not configured', 'readiness'])) {
    const gapMatch = ctx.match(/Missing sections?:\s*([^\n.]+)/i);
    const gaps = ctx.match(/verifierReadinessGaps[^\]]*]/i) || ctx.match(/verifier gaps?:\s*([^\n]+)/i);
    if (gapMatch?.[1] && gapMatch[1].trim() !== 'none') {
      return `From your living report, these areas still need work: ${gapMatch[1].trim()}. Fill them in the workflow forms — I am not inventing values. Empty fields stay labeled Missing or Not Yet Configured until you save real data.`;
    }
    if (gaps) {
      return `Verifier readiness gaps detected in context. Review the live report panel for the checklist, then complete project config, satellite review, field plots, and evidence packet steps. I cannot mark anything complete without saved configuration.`;
    }
    return 'Check the Live dMRV Evidence Report panel for Missing sections and open threats. Complete project identity, AOI, satellite/data sources, field plots, validation rules, then generate an evidence packet. I only describe what your saved configuration shows.';
  }

  if (includesAny(q, ['satellite', 'sentinel', 'landsat', 'scene', 'cloud', 'ndvi', 'imagery'])) {
    const lastReview = ctx.match(/lastSatelliteReviewAt["\s:]+([^",\n]+)/i) || ctx.match(/Last satellite review:\s*([^\n]+)/i);
    const sat = ctx.match(/Satellite:\s*([^\n]+)/i) || ctx.match(/selectedSatellites["\s:]+([^",\n]+)/i);
    if (lastReview?.[1] && !/missing/i.test(lastReview[1])) {
      return `Your last satellite review date in the living report is ${lastReview[1].trim()}. Open satellite scene settings to adjust provider, cloud limit, and date range, then run Test Data Source or Earth Observation when the API is available. I do not fabricate scene IDs or biomass from imagery alone.`;
    }
    return 'No completed satellite review is on record yet. Configure satellite sources in the source stack, set scene dates and cloud limits, then save and test the data source. Until then, satellite fields remain Not Yet Configured in the report.';
  }

  if (includesAny(q, ['biomass', 'carbon', 'co2', 'tco2', 'stock'])) {
    const baseline = ctx.match(/baselineBiomassTonsPerHa["\s:]+([^",\n]+)/i) || ctx.match(/Baseline biomass:\s*([^\n]+)/i);
    const current = ctx.match(/currentBiomassTonsPerHa["\s:]+([^",\n]+)/i) || ctx.match(/Current biomass:\s*([^\n]+)/i);
    const b = baseline?.[1]?.trim() ?? 'Missing';
    const c = current?.[1]?.trim() ?? 'Missing';
    if (b !== 'Missing' && c === 'Missing') {
      return `Baseline biomass exists (${b}), but current monitoring biomass has not been calculated yet. Use the methodology calculator (Recalculate) or enter field-plot measurements — I will not invent t/ha values.`;
    }
    if (b === 'Missing' && c === 'Missing') {
      return 'Biomass baseline and current estimates are both Missing. Select a methodology preset, enter calculator inputs, and run Recalculate — or document field plot evidence. These are indicative screening values, not certified credits.';
    }
    return `Biomass in your report: baseline ${b}, current ${c}. Link satellite review and field plots before verifier handoff. All estimates need human review.`;
  }

  if (includesAny(q, ['threat', 'risk', 'anomal', 'deforest', 'fire', 'cloud gap'])) {
    const open = ctx.match(/openThreatCount["\s:]+(\d+)/i) || ctx.match(/Open threats:\s*(\d+)/i);
    const n = open?.[1] ?? '0';
    if (Number(n) > 0) {
      return `The living report shows ${n} open threat(s). Review the Threat Register in the full report preview and consider creating validator missions for field verification. I can suggest mission types but cannot dispatch validators automatically.`;
    }
    return 'No open threats are flagged in the current report context. Threats are added when data gaps, cloud issues, or unanchored changes are detected — not invented.';
  }

  if (includesAny(q, ['validator', 'mission', 'field plot', 'ground truth', 'vvb', 'verifier'])) {
    const missions = ctx.match(/validatorMissionCount["\s:]+(\d+)/i) || ctx.match(/Validator missions:\s*(\d+)/i);
    const plots = ctx.match(/Field plots:\s*([^\n]+)/i);
    return `Validator missions on record: ${missions?.[1] ?? '0'}. ${plots ? `Field plots: ${plots[1]}.` : ''} Use field plot configuration for sampling method and geo-tagged evidence. Verifier / VVB review still requires a generated evidence packet and explicit human approval.`;
  }

  if (includesAny(q, ['anchor', 'blockchain', 'hash', 'unanchored'])) {
    if (includesAny(ctx, ['unanchored', 'not yet been anchored'])) {
      return 'This report has unanchored changes. Save a snapshot, then use Anchor Snapshot after major steps (satellite review, biomass save, evidence packet). Only hashes and references are anchored — not the full PDF on-chain.';
    }
    return 'Blockchain anchors store report hashes and evidence references after you explicitly anchor a version. Configure blockchain settings per input and use Anchor Snapshot in the live report panel when ready.';
  }

  if (includesAny(q, ['evidence packet', 'packet', 'appendix'])) {
    const packets = ctx.match(/evidencePacketCount["\s:]+(\d+)/i) || ctx.match(/Evidence packets:\s*(\d+)/i);
    return `Evidence packets linked: ${packets?.[1] ?? '0'}. Generate a packet from an input configuration page after validation rules and QA fields are set. The packet is a verifier handoff draft — not automatic certification.`;
  }

  if (includesAny(q, ['aoi', 'boundary', 'polygon', 'map', 'location'])) {
    const aoi = ctx.match(/AOI:\s*([^\n]+)/i) || ctx.match(/aoiGeometrySummary["\s:]+([^",\n]+)/i);
    if (aoi?.[1] && !/missing|not yet/i.test(aoi[1])) {
      return `Your AOI context: ${aoi[1].trim()}. Ensure the map polygon or coordinates match your reporting period and satellite scene search. Reviewers need a clear boundary before MRV screening.`;
    }
    return 'AOI is Missing or Not Yet Configured. Draw or import a boundary on the project map, save project configuration, then configure satellite sources for that area.';
  }

  if (includesAny(q, ['methodology', 'standard', 'framework', 'vm0047', 'ipcc'])) {
    const meth = ctx.match(/Methodology:\s*([^\n]+)/i) || ctx.match(/methodologyContext/i);
    return meth
      ? `Methodology context is in your project/report configuration. Align validation rules and biomass calculator with the selected preset. If methodology is Missing, open Project Configuration and apply a methodology preset before claiming carbon stock changes.`
      : 'Select and document a methodology in Project Configuration. Without it, calculation and verifier sections stay Missing.';
  }

  if (includesAny(q, ['help', 'how', 'what', 'start', 'next'])) {
    return [
      'Suggested next steps for this DMRV workflow:',
      '1. Complete project identity and AOI on the map.',
      '2. Select satellite/LiDAR sources and scene settings; record a satellite review.',
      '3. Configure field plots and methodology; save baseline/current biomass only from your inputs.',
      '4. Enable validation rules and generate an evidence packet.',
      '5. Anchor a report snapshot when ready for verifier review.',
      '',
      'I use only your saved configuration — ask about satellite, biomass, threats, missions, or missing sections.',
    ].join('\n');
  }

  return [
    'I am answering from your saved DMRV configuration only — I do not invent measurements or certified credits.',
    '',
    'Try asking: "What is missing for verifier review?", "When was my last satellite review?", "Do I have baseline biomass?", or "What are the open threats?"',
  ].join('\n');
}
