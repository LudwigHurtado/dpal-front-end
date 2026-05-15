import type { HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';

export type PlasticWatchReportSection = {
  id: string;
  title: string;
  status: 'info' | 'ok' | 'warning' | 'pending' | 'neutral';
  headline: string;
  bullets: string[];
  footnote?: string;
};

function signalLabel(signal: string): string {
  if (signal === 'strong_candidate_for_review') return 'Strong candidate for review';
  if (signal === 'elevated_plastic_risk_signal') return 'Elevated plastic-risk signal';
  if (signal === 'watchlist') return 'Watchlist';
  if (signal === 'low_confidence_no_clear_signal') return 'Low confidence / no clear signal';
  if (signal === 'none') return 'None';
  if (signal === 'weak_context') return 'Weak context';
  if (signal === 'possible_spectral_anomaly') return 'Possible spectral anomaly';
  return signal.replace(/_/g, ' ');
}

function confounderHeadline(scan: HyperspectralPlasticScanResponse): string {
  const w = scan.spectralSignals.waterConfounders;
  const highs = [w.algae, w.turbidity, w.sediment, w.cloudsGlint].filter((v) => v === 'high').length;
  if (highs >= 2) return 'Elevated confounder risk — interpret spectral context cautiously';
  if (highs === 1) return 'Moderate confounder risk';
  return 'Confounder screening complete';
}

function validationHeadline(scan: HyperspectralPlasticScanResponse): string {
  if (scan.providers.emit.status === 'available' || scan.providers.pace.status === 'available') {
    return 'Narrow-band CMR metadata present — field + drone validation still required';
  }
  return 'Requires field validation before enforcement or strong public claims';
}

export function buildPlasticWatchReportBrief(
  scan: HyperspectralPlasticScanResponse | null,
  evidence: PlasticEvidencePacketResponse | null,
): PlasticWatchReportSection[] {
  if (!scan) {
    return [
      {
        id: 'awaiting',
        title: 'Report status',
        status: 'pending',
        headline: 'No scan loaded yet',
        bullets: [
          'Define an area of interest on the map and run a scan or Watch DPAL Work.',
          'This assistant will organize plastic-risk metadata, provider lanes, and validation gaps after a scan completes.',
        ],
      },
    ];
  }

  const pendingIndex =
    scan.riskLevel === 'pending_index_extraction' || scan.plasticRisk.status === 'pending_index_extraction';
  const scoreText = scan.plasticRisk.score == null ? 'Not computed' : `${scan.plasticRisk.score} / 100`;
  const confidencePct =
    typeof scan.spectralSignals.confidence === 'number' && !Number.isNaN(scan.spectralSignals.confidence)
      ? `${Math.round(scan.spectralSignals.confidence * 100)}%`
      : 'Not reported';

  const paceScenes = scan.providers.pace.scenes?.length ?? 0;
  const emitScenes = scan.providers.emit.scenes?.length ?? 0;

  const sections: PlasticWatchReportSection[] = [
    {
      id: 'executive',
      title: 'Executive summary',
      status: pendingIndex ? 'warning' : 'info',
      headline: pendingIndex
        ? 'Metadata retrieved — plastic-risk index extraction still pending'
        : scan.plasticRisk.score == null
          ? 'Screening context only — numeric plastic-risk score not emitted'
          : `Plastic-risk screening context available (${scan.riskLevel.replace(/_/g, ' ')})`,
      bullets: [
        `AOI: ${scan.aoi.label || scan.label} · ${scan.aoi.lat.toFixed(4)}, ${scan.aoi.lng.toFixed(4)} · ${scan.aoi.radiusKm} km radius`,
        `Window: ${scan.aoi.baselineDate.slice(0, 10)} → ${scan.aoi.currentDate.slice(0, 10)} · ${scan.aoi.environmentType.replace(/_/g, ' ')}`,
        scan.plasticRisk.message,
      ],
      footnote: 'Evidence-support screening only — not validator-approved plastic detection.',
    },
    {
      id: 'signal',
      title: 'Plastic-risk signal',
      status: pendingIndex ? 'warning' : scan.spectralSignals.plasticRiskSignal === 'none' ? 'neutral' : 'warning',
      headline: `${signalLabel(scan.spectralSignals.plasticRiskSignal)} · score ${scoreText}`,
      bullets: [
        pendingIndex
          ? 'NASA CMR returned product metadata; narrow-band indices are not extracted in this build.'
          : scan.plasticRisk.score == null
            ? 'Score withheld until index extraction and validation logic run on real spectral products.'
            : `Status: ${scan.plasticRisk.status.replace(/_/g, ' ')}`,
        'This is not plastic classification from imagery alone.',
      ],
    },
    {
      id: 'confidence',
      title: 'Confidence',
      status: 'neutral',
      headline: `${confidencePct} model confidence (bounded context)`,
      bullets: [
        'Context-only — not a calibrated detection probability.',
        ...(scan.spectralSignals.notes.length ? scan.spectralSignals.notes.slice(0, 3) : []),
      ],
    },
    {
      id: 'pace',
      title: 'PACE (NASA CMR)',
      status: scan.providers.pace.status === 'available' ? 'ok' : 'warning',
      headline:
        scan.providers.pace.status === 'available'
          ? `PACE metadata available · ${paceScenes} granule${paceScenes === 1 ? '' : 's'} (metadata)`
          : `PACE lane: ${scan.providers.pace.status}`,
      bullets: [
        scan.providers.pace.message,
        ...(scan.providers.pace.sceneDate
          ? [`Latest reference date: ${String(scan.providers.pace.sceneDate).slice(0, 10)}`]
          : []),
        ...(scan.providers.pace.spectralRange ? [`Spectral range: ${scan.providers.pace.spectralRange}`] : []),
        'Not plastic classification — spectral extraction not implemented in this build.',
      ],
    },
    {
      id: 'emit',
      title: 'EMIT status',
      status: scan.providers.emit.status === 'available' ? 'ok' : 'warning',
      headline: scan.providers.emit.status.replace(/_/g, ' '),
      bullets: [
        scan.providers.emit.message,
        ...(emitScenes > 0 ? [`${emitScenes} EMIT L2A granule record(s) in CMR metadata`] : []),
        'Hyperspectral granule metadata only until index pipelines are wired.',
      ],
    },
    {
      id: 'confounders',
      title: 'Confounder risk',
      status: 'info',
      headline: confounderHeadline(scan),
      bullets: [
        `Algae: ${scan.spectralSignals.waterConfounders.algae}`,
        `Turbidity: ${scan.spectralSignals.waterConfounders.turbidity}`,
        `Sediment: ${scan.spectralSignals.waterConfounders.sediment}`,
        `Clouds / glint: ${scan.spectralSignals.waterConfounders.cloudsGlint}`,
        'Qualitative screening — not a substitute for in-situ water-quality sampling.',
      ],
    },
    {
      id: 'validation',
      title: 'Validation readiness',
      status: 'warning',
      headline: validationHeadline(scan),
      bullets: [
        'Field sampling, drone validation, and water-quality context are required before strong claims.',
        `Claims level: ${scan.evidencePacket.claimsLevel.replace(/_/g, ' ')}`,
        ...(scan.evidencePacket.nextActions?.slice(0, 4) ?? []),
      ],
    },
    {
      id: 'limitations',
      title: 'What this report does not prove',
      status: 'neutral',
      headline: 'Do not treat this scan as confirmed plastic pollution',
      bullets: [
        ...(scan.limitations?.slice(0, 5) ?? []),
        ...(scan.evidencePacket.limitations?.slice(0, 3) ?? []),
        'No fabricated plastic-risk score — pending lanes stay explicitly uncomputed.',
      ].filter(Boolean),
    },
  ];

  if (evidence?.integrityHash) {
    sections.push({
      id: 'packet',
      title: 'Evidence packet',
      status: 'ok',
      headline: 'Server-side evidence packet prepared',
      bullets: [
        `Integrity hash: ${evidence.integrityHash.slice(0, 16)}…`,
        evidence.packet?.disclaimer
          ? String(evidence.packet.disclaimer)
          : 'Packet is metadata-oriented until spectral indices attach.',
      ],
    });
  }

  return sections;
}

export function briefToPromptContext(sections: PlasticWatchReportSection[]): string {
  return sections
    .map(
      (s) =>
        `## ${s.title}\nHeadline: ${s.headline}\n${s.bullets.map((b) => `- ${b}`).join('\n')}${s.footnote ? `\nNote: ${s.footnote}` : ''}`,
    )
    .join('\n\n');
}
