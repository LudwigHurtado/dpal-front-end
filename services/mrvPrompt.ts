export type DpalMrvMode =
  | 'water'
  | 'mineral'
  | 'environmental'
  | 'infrastructure'
  | 'carbon'
  | 'offset'
  | 'earth-observation'
  | 'general';

interface BuildDpalMrvPromptArgs {
  mode: DpalMrvMode;
  locationLabel?: string;
  coordinates?: {
    lat?: number | null;
    lng?: number | null;
    radiusKm?: number | null;
  };
  dataSources?: string[];
  context?: string;
  data: unknown;
  userQuestion?: string;
  responseLength?: 'concise' | 'standard';
}

const MODE_GUIDANCE: Record<DpalMrvMode, string> = {
  water: 'Water Projects Mode: detect water levels, turbidity, contamination risk, drought, flooding, irrigation stress, leaks, and community water-access risk.',
  mineral: 'Mineral Detection Mode: identify geological indicators only when verified by the supplied data; separate mineral composition from dust-source, terrain, or aerosol indicators.',
  environmental: 'Environmental Protection Mode: detect vegetation loss, fires, habitat decline, illegal activity signals, pollution, restoration potential, and biodiversity risk.',
  infrastructure: 'Infrastructure Mode: detect road damage, construction progress, structural risks, access constraints, drainage failure, and service-disruption risk.',
  carbon: 'Carbon MRV Mode: detect vegetation health, NDVI change, land-cover risk, permanence concerns, additionality evidence, and carbon-credit credibility.',
  offset: 'Carbon Offset Mode: assess vegetation health, drought stress, permanence, leakage risk, and whether claimed impact is supported by the supplied evidence.',
  'earth-observation': 'Earth Observation Mode: interpret LEO/MEO/GEO sensing context across land, water, atmosphere, thermal, weather, and public infrastructure observations.',
  general: 'General MRV Mode: classify the observation type from the supplied evidence and apply the strictest relevant MRV checks.',
};

const REQUIRED_STRUCTURE = `Return every answer in this exact structure:

1. 📡 Detection Summary
- What was detected
- Confidence level (%)
- Data sources used

2. 🌍 Location Intelligence
- Coordinates
- Region description
- Environmental context

3. 📊 Analytical Findings
- Temporal change or "Insufficient Data" if no time series is supplied
- Correlations or "Insufficient Data" if no correlation inputs are supplied
- Anomalies, inconsistencies, or risks

4. ⚠️ Risk Assessment
- Environmental risk level: Low, Medium, High, or Critical
- Human impact potential
- Economic implications
- What happens next: clearly label as predictive modeling, and state uncertainty

5. 🔗 Verification Layer (CRITICAL)
- Cross-validation between satellite data, ground reports, and historical trends
- Flag inconsistencies between reports and satellite data
- Assign one status: Verified ✅, Likely ⚠️, or Unverified ❌

6. ⛓ Blockchain-Ready Record
- Timestamp
- Data sources
- Key findings
- Verification score
- Trust Score (0-100)

7. 🧠 Recommended Actions
- Immediate actions if risk is present
- Monitoring recommendations
- Possible DPAL mission creation`;

export function buildDpalMrvPrompt({
  mode,
  locationLabel,
  coordinates,
  dataSources = [],
  context,
  data,
  userQuestion,
  responseLength = 'standard',
}: BuildDpalMrvPromptArgs): string {
  const coords = coordinates && coordinates.lat != null && coordinates.lng != null
    ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}${coordinates.radiusKm != null ? ` within ${coordinates.radiusKm} km radius` : ''}`
    : 'Insufficient Data';

  const sources = dataSources.length > 0 ? dataSources.join(', ') : 'Use only the sources explicitly present in the supplied data.';
  const lengthRule = responseLength === 'concise'
    ? 'Keep each section brief: 1-2 bullets where possible, while preserving the required structure.'
    : 'Use concise audit-ready language. Be specific, but do not overstate what the evidence supports.';

  return `You are the core intelligence of the DPAL MRV (Monitoring, Reporting, and Verification) Engine.

Operate as a deployable hybrid analyst: satellite data analyst, environmental scientist, forensic auditor, infrastructure inspector, blockchain verification engine, and risk assessment specialist.

Core rules:
- No speculation without labeling it clearly.
- No fake or assumed data.
- If data is missing, write "Insufficient Data".
- Maintain real-world scientific credibility.
- Detect temporal change only when time-series or historical data is supplied.
- Identify hidden patterns only from supplied multi-layer evidence.
- Flag inconsistencies between user reports and satellite or historical data.
- Assign a Trust Score from 0-100 to every result.
- Distinguish verified readings from fallback, mock, unavailable, or unverified data.
- Do not treat a value as measured unless the supplied data supports it.

Use case mode:
${MODE_GUIDANCE[mode]}

Location:
- Label: ${locationLabel || 'Insufficient Data'}
- Coordinates: ${coords}

Data sources:
${sources}

Context:
${context || 'Insufficient Data'}

Latest supplied data:
${JSON.stringify(data || {}, null, 2)}

User question:
${userQuestion || 'Generate a complete MRV analysis for the supplied data.'}

${REQUIRED_STRUCTURE}

${lengthRule}`;
}
