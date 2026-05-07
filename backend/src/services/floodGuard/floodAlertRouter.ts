/**
 * Alert routing — mirrors frontend `floodAlertRouter.ts`.
 */

import {
  FLOOD_ALERT_LABELS,
  type FloodAlert,
  type FloodAlertAudience,
  type FloodAlertChannel,
  type FloodAlertLifecycle,
  type FloodAlertSettings,
  type FloodCameraDetection,
  type FloodCitizenReport,
  type FloodRiskScore,
  type FloodSignalSource,
  type FloodWeatherSignal,
  type FloodZone,
} from './floodGuardTypes';

export const DEFAULT_FLOOD_ALERT_SETTINGS: FloodAlertSettings = {
  cityId: 'SCZ',
  publicPushThreshold: 55,
  emergencyEscalationThreshold: 75,
  enabledAudiences: [
    'city_officials',
    'emergency_services',
    'public_users',
    'schools_hospitals',
    'validators',
    'community_groups',
  ],
  channelsByAudience: {
    city_officials: ['dashboard', 'email', 'webhook'],
    emergency_services: ['dashboard', 'sms'],
    public_users: ['push'],
    schools_hospitals: ['email', 'sms'],
    validators: ['dashboard'],
    community_groups: ['email'],
  },
  cityWebhookUrl: undefined,
  honorNwsCapAlerts: true,
  updatedAt: new Date().toISOString(),
};

export function settingsForCity(cityId: string): FloodAlertSettings {
  return { ...DEFAULT_FLOOD_ALERT_SETTINGS, cityId, updatedAt: new Date().toISOString() };
}

function pickAudiences(riskScore: FloodRiskScore, settings: FloodAlertSettings): FloodAlertAudience[] {
  const enabled = new Set(settings.enabledAudiences);
  const audiences: FloodAlertAudience[] = [];

  if (enabled.has('city_officials')) audiences.push('city_officials');
  if (enabled.has('validators')) audiences.push('validators');

  if (riskScore.score >= settings.publicPushThreshold) {
    if (enabled.has('public_users')) audiences.push('public_users');
    if (enabled.has('schools_hospitals')) audiences.push('schools_hospitals');
    if (enabled.has('community_groups')) audiences.push('community_groups');
  }

  if (riskScore.score >= settings.emergencyEscalationThreshold) {
    if (enabled.has('emergency_services')) audiences.push('emergency_services');
  }

  return audiences;
}

function pickChannels(audiences: FloodAlertAudience[], settings: FloodAlertSettings): FloodAlertChannel[] {
  const channels = new Set<FloodAlertChannel>(['dashboard']);
  for (const audience of audiences) {
    const list = settings.channelsByAudience[audience] ?? [];
    list.forEach((channel) => channels.add(channel));
  }
  if (settings.cityWebhookUrl) channels.add('webhook');
  return Array.from(channels);
}

function pickPrimarySource(input: {
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
}): FloodSignalSource {
  if (input.cameras.length) return 'camera';
  if (input.weather) return input.weather.source;
  if (input.citizenReports.length) return 'citizen';
  return 'weather_feed';
}

function pickContributingSources(input: {
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
}): FloodSignalSource[] {
  const sources = new Set<FloodSignalSource>();
  if (input.cameras.length) sources.add('camera');
  if (input.citizenReports.length) sources.add('citizen');
  if (input.weather) sources.add(input.weather.source);
  return Array.from(sources);
}

const LEGAL =
  'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.';

export interface DraftFloodAlertInput {
  zone: FloodZone;
  riskScore: FloodRiskScore;
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
  settings: FloodAlertSettings;
  existingAlertId?: string;
  lifecycle?: FloodAlertLifecycle;
  preserveCreatedAt?: string;
  preserveLifecycle?: FloodAlertLifecycle;
  evidencePacketId?: string;
  ledgerAnchorHash?: string;
  validatorReview?: FloodAlert['validatorReview'];
}

export function draftFloodAlert(input: DraftFloodAlertInput): FloodAlert {
  const audiences = pickAudiences(input.riskScore, input.settings);
  const channels = pickChannels(audiences, input.settings);
  const now = new Date().toISOString();
  const alertId =
    input.existingAlertId ??
    `DPAL-FLOOD-ALERT-${input.zone.cityId}-${input.zone.zoneId.split('-').slice(-2).join('-')}-${now.slice(11, 19).replace(/:/g, '')}`;

  const publicSafeMessage =
    input.riskScore.score >= input.settings.publicPushThreshold
      ? `DPAL FloodGuard observa señales de inundación en ${input.zone.name}. ${LEGAL}`
      : `DPAL FloodGuard registra señales de monitoreo en ${input.zone.name}. Sin nivel de alerta pública por ahora. ${LEGAL}`;

  return {
    alertId,
    cityId: input.zone.cityId,
    zoneId: input.zone.zoneId,
    level: input.riskScore.alertLevel,
    label: FLOOD_ALERT_LABELS[input.riskScore.alertLevel],
    riskScore: input.riskScore.score,
    confidence: input.riskScore.confidence,
    primarySource: pickPrimarySource({
      cameras: input.cameras,
      citizenReports: input.citizenReports,
      weather: input.weather,
    }),
    contributingSources: pickContributingSources({
      cameras: input.cameras,
      citizenReports: input.citizenReports,
      weather: input.weather,
    }),
    reasons: input.riskScore.reasons,
    audiences,
    channels,
    lifecycle: input.preserveLifecycle ?? input.lifecycle ?? 'evidence_assembled',
    createdAt: input.preserveCreatedAt ?? now,
    updatedAt: now,
    signalSnapshot: {
      cameras: input.cameras,
      citizenReports: input.citizenReports,
      weather: input.weather,
    },
    evidencePacketId: input.evidencePacketId,
    ledgerAnchorHash: input.ledgerAnchorHash,
    validatorReview: input.validatorReview,
    publicSafeMessage,
  };
}

/** Records routing intent (SMS/email/webhook delivery not implemented yet). */
export function describeRoutingDispatch(_alert: FloodAlert): { ok: false; message: string } {
  return {
    ok: false,
    message:
      'Outbound SMS, email, push, and webhooks are not wired on this deployment. Alert routing metadata is stored on the alert record.',
  };
}
