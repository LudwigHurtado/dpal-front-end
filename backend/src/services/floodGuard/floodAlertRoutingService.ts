/**
 * DPAL FloodGuard — Stage 12G alert routing (preview / dry-run only).
 *
 * Hard rules (do NOT relax):
 *   1. No real SMS, email, webhook, or push notifications are sent. Channels
 *      named *_preview are dashboard-only message previews. External delivery
 *      adapters must be added in a later stage with explicit operator review.
 *   2. Default mode is `dry_run`. `preview_only` and `internal_only` are also
 *      safe (no outbound delivery). `external_disabled` is the legal default
 *      while DPAL is not authorized to fan out emergency-style messages.
 *   3. Honor existing safety gates from agentic monitoring (12C/12E) and the
 *      DPAL mission bridge (12F). If `no_mission_allowed`, suppress routes
 *      that would imply field action.
 *   4. The legal/safety disclaimer is attached to every decision.
 */

import type {
  FloodAlert,
  FloodMissionBridgeRecord,
  FloodMissionSafetyClassification,
  FloodRoutingAudience,
  FloodRoutingBlockedReasonCode,
  FloodRoutingChannel,
  FloodRoutingDecision,
  FloodRoutingMode,
  FloodRoutingPreviewSummary,
  FloodZone,
  FloodZoneAgentEvaluation,
} from './floodGuardTypes';
import { randomUUID } from 'crypto';

export const FLOODGUARD_ROUTING_LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

/** Default route catalog: who would receive what on which channel. */
const DEFAULT_ROUTES: Array<{ audience: FloodRoutingAudience; channel: FloodRoutingChannel }> = [
  { audience: 'dpal_operator', channel: 'dashboard' },
  { audience: 'city_validator', channel: 'dashboard' },
  { audience: 'city_official', channel: 'dashboard' },
  { audience: 'city_official', channel: 'email_preview' },
  { audience: 'emergency_contact', channel: 'sms_preview' },
  { audience: 'school_admin', channel: 'email_preview' },
  { audience: 'hospital_admin', channel: 'email_preview' },
  { audience: 'shelter_operator', channel: 'email_preview' },
  { audience: 'community_group', channel: 'public_map' },
  { audience: 'public_dashboard', channel: 'dashboard' },
  { audience: 'public_dashboard', channel: 'public_map' },
  { audience: 'situation_room', channel: 'situation_room' },
  { audience: 'dpal_operator', channel: 'mission_bridge' },
  { audience: 'city_validator', channel: 'webhook_preview' },
];

const PREVIEW_CHANNELS: Set<FloodRoutingChannel> = new Set([
  'email_preview',
  'sms_preview',
  'webhook_preview',
]);

const FIELD_RECIPIENT_AUDIENCES: Set<FloodRoutingAudience> = new Set([
  'school_admin',
  'hospital_admin',
  'shelter_operator',
  'community_group',
  'public_dashboard',
  'emergency_contact',
]);

export interface BuildRoutingPreviewInput {
  alert: FloodAlert;
  zone: FloodZone;
  agentEvaluation?: FloodZoneAgentEvaluation | null;
  linkedMissions?: FloodMissionBridgeRecord[];
  evidencePacketId?: string | null;
  hasSituationRoom?: boolean;
  /** Operator/system that requested the preview. */
  generatedBy: string;
  /** Defaults to `dry_run`. External delivery is never enabled here. */
  mode?: FloodRoutingMode;
  /** Optional override; defaults to alert.cityId. */
  cityId?: string;
}

/**
 * Pure builder — produces a list of routing decisions plus a compact digest the
 * evidence-packet builder can fold into the SHA-256 body. Never sends anything.
 */
export function buildFloodRoutingPreview(input: BuildRoutingPreviewInput): FloodRoutingPreviewSummary {
  const generatedAt = new Date().toISOString();
  const mode: FloodRoutingMode = input.mode ?? 'dry_run';
  const cityId = input.cityId ?? input.alert.cityId;
  const evidenceComplete = Boolean(input.evidencePacketId) || Boolean(input.alert.evidencePacketId);
  const humanVerified =
    input.alert.lifecycle === 'human_verified' || input.alert.lifecycle === 'city_notified';
  const safety: FloodMissionSafetyClassification | null = input.agentEvaluation?.missionSafetyClassification ?? null;
  const linkedMissionIds = (input.linkedMissions ?? []).map((m) => m.missionId);
  const evidencePacketId = input.evidencePacketId ?? input.alert.evidencePacketId;

  const decisions: FloodRoutingDecision[] = DEFAULT_ROUTES.map(({ audience, channel }) =>
    buildDecision({
      alert: input.alert,
      zone: input.zone,
      audience,
      channel,
      mode,
      cityId,
      generatedAt,
      generatedBy: input.generatedBy,
      evidenceComplete,
      humanVerified,
      safety,
      hasSituationRoom: Boolean(input.hasSituationRoom),
      linkedMissionIds,
      evidencePacketId,
    }),
  );

  const routableCount = decisions.filter((d) => d.shouldRoute).length;
  const blockedCount = decisions.length - routableCount;

  const digest = compactDigest(decisions, mode);

  return {
    generatedAt,
    generatedBy: input.generatedBy,
    mode,
    totalDecisions: decisions.length,
    routableCount,
    blockedCount,
    decisions,
    legalDisclaimer: FLOODGUARD_ROUTING_LEGAL,
    digest,
  };
}

interface DecisionInput {
  alert: FloodAlert;
  zone: FloodZone;
  audience: FloodRoutingAudience;
  channel: FloodRoutingChannel;
  mode: FloodRoutingMode;
  cityId: string;
  generatedAt: string;
  generatedBy: string;
  evidenceComplete: boolean;
  humanVerified: boolean;
  safety: FloodMissionSafetyClassification | null;
  hasSituationRoom: boolean;
  linkedMissionIds: string[];
  evidencePacketId: string | undefined;
}

function buildDecision(d: DecisionInput): FloodRoutingDecision {
  const { allow, blockedCode, blockedReason } = evaluateGate(d);

  const messageTitle = buildTitle(d.alert, d.audience, d.channel);
  const messageBody = buildBody(d);

  return {
    routingId: `FG-ROUT-${randomUUID().slice(0, 8)}`,
    alertId: d.alert.alertId,
    zoneId: d.alert.zoneId,
    cityId: d.cityId,
    alertLevel: d.alert.level,
    riskScore: d.alert.riskScore,
    audience: d.audience,
    channel: d.channel,
    mode: d.mode,
    messageTitle,
    messageBody,
    safetyDisclaimer: FLOODGUARD_ROUTING_LEGAL,
    shouldRoute: allow,
    blockedCode: allow ? undefined : blockedCode,
    blockedReason: allow ? undefined : blockedReason,
    createdAt: d.generatedAt,
    createdBy: d.generatedBy,
    linkedMissionIds: d.linkedMissionIds.length ? [...d.linkedMissionIds] : undefined,
    linkedEvidencePacketId: d.evidencePacketId,
  };
}

function evaluateGate(d: DecisionInput): {
  allow: boolean;
  blockedCode?: FloodRoutingBlockedReasonCode;
  blockedReason?: string;
} {
  // Mode gates — `external_disabled` blocks any preview channel.
  if (d.mode === 'external_disabled' && PREVIEW_CHANNELS.has(d.channel)) {
    return {
      allow: false,
      blockedCode: 'external_routing_disabled',
      blockedReason:
        'External routing is disabled for this deployment. Preview channels (email/SMS/webhook) are suppressed.',
    };
  }
  if (d.mode === 'internal_only' && PREVIEW_CHANNELS.has(d.channel)) {
    return {
      allow: false,
      blockedCode: 'external_routing_disabled',
      blockedReason: 'Internal-only mode: outbound preview channels suppressed.',
    };
  }

  // Mission bridge channel only routes when at least one mission was created.
  if (d.channel === 'mission_bridge' && d.linkedMissionIds.length === 0) {
    return {
      allow: false,
      blockedCode: 'no_linked_mission',
      blockedReason: 'No DPAL mission has been dispatched for this alert yet.',
    };
  }

  if (d.channel === 'situation_room' && !d.hasSituationRoom) {
    return {
      allow: false,
      blockedCode: 'no_active_situation_room',
      blockedReason: 'No active situation room exists for this alert.',
    };
  }

  // Block field-recipient audiences when the safety gate is no_mission_allowed.
  if (d.safety === 'no_mission_allowed' && FIELD_RECIPIENT_AUDIENCES.has(d.audience)) {
    return {
      allow: false,
      blockedCode: 'no_mission_allowed',
      blockedReason:
        'Mission Safety Agent classified this zone as no_mission_allowed; suppress public/field-recipient routing.',
    };
  }

  // For external-style previews, demand verified evidence + low-risk gating.
  if (PREVIEW_CHANNELS.has(d.channel)) {
    if (!d.evidenceComplete) {
      return {
        allow: false,
        blockedCode: 'evidence_incomplete',
        blockedReason: 'Evidence packet has not been generated for this alert.',
      };
    }
    if (!d.humanVerified) {
      return {
        allow: false,
        blockedCode: 'not_human_verified',
        blockedReason:
          'Alert is not yet human-verified or city-notified. Outbound preview is suppressed until validator review completes.',
      };
    }
    if (d.alert.level <= 1) {
      return {
        allow: false,
        blockedCode: 'alert_level_too_low',
        blockedReason: 'Alert level is too low for outbound preview routing.',
      };
    }
  }

  // Public-map and public-dashboard need at least Flood Risk (level 2) to surface publicly.
  if (
    (d.audience === 'public_dashboard' || d.audience === 'community_group') &&
    d.alert.level <= 1 &&
    d.channel !== 'dashboard'
  ) {
    return {
      allow: false,
      blockedCode: 'alert_level_too_low',
      blockedReason: 'Public surfaces wait until level 2 (Flood Risk) or higher.',
    };
  }

  return { allow: true };
}

function buildTitle(alert: FloodAlert, audience: FloodRoutingAudience, channel: FloodRoutingChannel): string {
  const audienceLabel = describeRoutingAudience(audience);
  const channelLabel = describeRoutingChannel(channel);
  return `[DPAL FloodGuard PREVIEW] L${alert.level} ${alert.label} — ${audienceLabel} via ${channelLabel}`;
}

function buildBody(d: DecisionInput): string {
  const lines: string[] = [];
  lines.push(
    `Zone: ${d.zone.name} (${d.alert.zoneId}). Risk score ${d.alert.riskScore}/100, level ${d.alert.level} ${d.alert.label}.`,
  );
  if (d.alert.reasons.length) lines.push(`Reasons: ${d.alert.reasons.join(' · ')}.`);
  if (d.safety) lines.push(`Mission safety gate: ${d.safety}.`);
  if (d.evidencePacketId) lines.push(`Evidence packet: ${d.evidencePacketId}.`);
  if (d.linkedMissionIds.length) lines.push(`DPAL missions: ${d.linkedMissionIds.join(', ')}.`);
  if (d.channel === 'sms_preview') {
    lines.push('PREVIEW ONLY — no SMS will be sent on this deployment.');
  } else if (d.channel === 'email_preview') {
    lines.push('PREVIEW ONLY — no email will be sent on this deployment.');
  } else if (d.channel === 'webhook_preview') {
    lines.push('PREVIEW ONLY — no webhook will be invoked on this deployment.');
  }
  lines.push(FLOODGUARD_ROUTING_LEGAL);
  return lines.join(' ');
}

function compactDigest(decisions: FloodRoutingDecision[], mode: FloodRoutingMode): string {
  const parts = decisions.map(
    (d) => `${d.audience}:${d.channel}:${d.shouldRoute ? 'route' : `block(${d.blockedCode ?? 'unknown'})`}`,
  );
  return `mode=${mode};` + parts.join('|');
}

export function describeRoutingAudience(a: FloodRoutingAudience): string {
  switch (a) {
    case 'dpal_operator':
      return 'DPAL operator';
    case 'city_validator':
      return 'City validator';
    case 'city_official':
      return 'City official';
    case 'emergency_contact':
      return 'Emergency contact';
    case 'school_admin':
      return 'School admin';
    case 'hospital_admin':
      return 'Hospital admin';
    case 'shelter_operator':
      return 'Shelter operator';
    case 'community_group':
      return 'Community group';
    case 'public_dashboard':
      return 'Public dashboard';
    case 'situation_room':
      return 'Situation room';
    default:
      return a;
  }
}

export function describeRoutingChannel(c: FloodRoutingChannel): string {
  switch (c) {
    case 'dashboard':
      return 'Dashboard';
    case 'situation_room':
      return 'Situation room';
    case 'email_preview':
      return 'Email preview';
    case 'sms_preview':
      return 'SMS preview';
    case 'webhook_preview':
      return 'Webhook preview';
    case 'public_map':
      return 'Public map';
    case 'mission_bridge':
      return 'Mission bridge';
    default:
      return c;
  }
}

export function isValidRoutingMode(value: string): value is FloodRoutingMode {
  return value === 'dry_run' || value === 'preview_only' || value === 'internal_only' || value === 'external_disabled';
}
