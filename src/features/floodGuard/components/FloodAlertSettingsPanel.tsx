import React from 'react';
import { ShieldCheck, Activity, Megaphone } from '../../../../components/icons';
import type {
  FloodAlertAudience,
  FloodAlertChannel,
  FloodAlertSettings,
} from '../floodGuardTypes';
import { describeAudience, describeChannel } from '../services/floodAlertRouter';

interface FloodAlertSettingsPanelProps {
  settings: FloodAlertSettings;
  onChange: (next: FloodAlertSettings) => void;
  className?: string;
}

const ALL_AUDIENCES: FloodAlertAudience[] = [
  'city_officials',
  'emergency_services',
  'public_users',
  'schools_hospitals',
  'validators',
  'community_groups',
];

const ALL_CHANNELS: FloodAlertChannel[] = [
  'dashboard',
  'push',
  'email',
  'sms',
  'webhook',
  'whatsapp',
  'telegram',
];

const FloodAlertSettingsPanel: React.FC<FloodAlertSettingsPanelProps> = ({
  settings,
  onChange,
  className = '',
}) => {
  const toggleAudience = (audience: FloodAlertAudience) => {
    const enabled = new Set(settings.enabledAudiences);
    if (enabled.has(audience)) enabled.delete(audience);
    else enabled.add(audience);
    onChange({ ...settings, enabledAudiences: Array.from(enabled), updatedAt: new Date().toISOString() });
  };

  const toggleChannelForAudience = (audience: FloodAlertAudience, channel: FloodAlertChannel) => {
    const current = new Set(settings.channelsByAudience[audience] ?? []);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    onChange({
      ...settings,
      channelsByAudience: {
        ...settings.channelsByAudience,
        [audience]: Array.from(current),
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const updateThreshold = (key: 'publicPushThreshold' | 'emergencyEscalationThreshold', value: number) => {
    onChange({ ...settings, [key]: value, updatedAt: new Date().toISOString() });
  };

  const updateWebhook = (value: string) => {
    onChange({ ...settings, cityWebhookUrl: value || undefined, updatedAt: new Date().toISOString() });
  };

  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Alert Settings
        </div>
      </div>

      <div
        className="rounded-xl p-3 mb-3"
        style={{ background: 'var(--dpal-surface-alt)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-[11px] dpal-text-muted">
            Public push threshold ({settings.publicPushThreshold})
            <input
              type="range"
              min={0}
              max={100}
              value={settings.publicPushThreshold}
              onChange={(e) => updateThreshold('publicPushThreshold', Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
          <label className="text-[11px] dpal-text-muted">
            Emergency escalation threshold ({settings.emergencyEscalationThreshold})
            <input
              type="range"
              min={0}
              max={100}
              value={settings.emergencyEscalationThreshold}
              onChange={(e) => updateThreshold('emergencyEscalationThreshold', Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
          <label className="text-[11px] dpal-text-muted md:col-span-2">
            City dashboard webhook URL
            <input
              type="url"
              value={settings.cityWebhookUrl ?? ''}
              onChange={(e) => updateWebhook(e.target.value)}
              placeholder="https://city-dashboard.example.gov/incoming"
              className="mt-1 w-full rounded-md px-2 py-1 text-xs"
              style={{
                background: 'var(--dpal-input-bg)',
                color: 'var(--dpal-input-text)',
                border: '1px solid var(--dpal-input-border)',
              }}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {ALL_AUDIENCES.map((audience) => {
          const enabled = settings.enabledAudiences.includes(audience);
          const channels = settings.channelsByAudience[audience] ?? [];
          return (
            <div
              key={audience}
              className="rounded-xl p-3"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                    {describeAudience(audience)}
                  </div>
                  <div className="text-[10px] dpal-text-muted mt-0.5">
                    {channels.map(describeChannel).join(' · ') || 'No channels enabled'}
                  </div>
                </div>
                <label className="text-[11px] flex items-center gap-1 cursor-pointer dpal-text-muted">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleAudience(audience)}
                  />
                  Enabled
                </label>
              </div>

              {enabled && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALL_CHANNELS.map((channel) => {
                    const active = channels.includes(channel);
                    return (
                      <button
                        type="button"
                        key={channel}
                        onClick={() => toggleChannelForAudience(audience, channel)}
                        className="text-[10px] font-semibold rounded-md px-2 py-1 transition"
                        style={{
                          background: active ? 'rgba(34,211,238,0.18)' : 'var(--dpal-surface)',
                          color: active ? '#22d3ee' : 'var(--dpal-text-secondary)',
                          border: `1px solid ${active ? 'rgba(34,211,238,0.4)' : 'var(--dpal-border)'}`,
                        }}
                      >
                        {describeChannel(channel)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label
        className="flex items-start gap-2 text-[11px]"
        style={{ color: 'var(--dpal-text-secondary)' }}
      >
        <input
          type="checkbox"
          checked={settings.honorNwsCapAlerts}
          onChange={(e) => onChange({ ...settings, honorNwsCapAlerts: e.target.checked, updatedAt: new Date().toISOString() })}
          className="mt-0.5"
        />
        <span>
          Honor National Weather Service CAP alerts as authoritative external context. CAP is the standard
          all-hazard public-warning format used by interoperable emergency systems.
        </span>
      </label>

      <div
        className="mt-3 rounded-lg p-2 text-[11px] flex items-start gap-2"
        style={{ background: 'var(--dpal-surface)', border: '1px dashed var(--dpal-border)', color: 'var(--dpal-text-secondary)' }}
      >
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5" />
        <span>
          DPAL FloodGuard does not replace government emergency alerts. It provides verified civic flood
          intelligence, evidence packets, and routing support for cities, communities, and validators.
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] dpal-text-muted">
        <Activity className="w-3.5 h-3.5" />
        <span>Last updated {new Date(settings.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default FloodAlertSettingsPanel;
