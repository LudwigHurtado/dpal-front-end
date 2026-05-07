/**
 * Plain-object alert router used by the FloodGuard dashboard for the MVP.
 *
 * Translates a risk score + city alert settings into the audiences, channels,
 * and public-safe message that should be dispatched. The real router lives in
 * `server/services/floodGuard/floodAlertRouter.ts` once the API is implemented;
 * the front-end mirrors the same data shape so the migration is mechanical.
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
} from '../floodGuardTypes';

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

function pickAudiences(
  riskScore: FloodRiskScore,
  settings: FloodAlertSettings,
): FloodAlertAudience[] {
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

function pickChannels(
  audiences: FloodAlertAudience[],
  settings: FloodAlertSettings,
): FloodAlertChannel[] {
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

export interface DraftFloodAlertInput {
  zone: FloodZone;
  riskScore: FloodRiskScore;
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
  settings: FloodAlertSettings;
  /** Existing alert id, if we are updating an in-flight alert. */
  existingAlertId?: string;
  /** Lifecycle to apply when drafting. */
  lifecycle?: FloodAlertLifecycle;
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
      ? `DPAL FloodGuard observa señales de inundación en ${input.zone.name}. Esto es una alerta verificada de detección temprana y no reemplaza alertas oficiales del gobierno.`
      : `DPAL FloodGuard registra señales de monitoreo en ${input.zone.name}. Sin nivel de alerta pública por ahora.`;

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
    lifecycle: input.lifecycle ?? 'evidence_assembled',
    createdAt: now,
    updatedAt: now,
    signalSnapshot: {
      cameras: input.cameras,
      citizenReports: input.citizenReports,
      weather: input.weather,
    },
    publicSafeMessage,
  };
}

export function describeChannel(channel: FloodAlertChannel): string {
  switch (channel) {
    case 'dashboard': return 'City dashboard';
    case 'push': return 'App push';
    case 'email': return 'Email';
    case 'sms': return 'SMS';
    case 'webhook': return 'City webhook';
    case 'whatsapp': return 'WhatsApp';
    case 'telegram': return 'Telegram';
    default: return channel;
  }
}

export function describeAudience(audience: FloodAlertAudience): string {
  switch (audience) {
    case 'city_officials': return 'City officials';
    case 'emergency_services': return 'Emergency services';
    case 'public_users': return 'Public users';
    case 'schools_hospitals': return 'Schools & hospitals';
    case 'validators': return 'DPAL validators';
    case 'community_groups': return 'Community groups';
    default: return audience;
  }
}
