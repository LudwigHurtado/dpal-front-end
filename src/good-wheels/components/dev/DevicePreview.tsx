import React, { useMemo } from 'react';

export type GwPreviewDeviceId = 'off' | 'iphone_390x844' | 'android_360x800' | 'tablet_820x1180';

export type GwPreviewDevice = {
  id: GwPreviewDeviceId;
  label: string;
  width: number | null;
  height: number | null;
  scale: number;
};

export const GW_PREVIEW_DEVICES: GwPreviewDevice[] = [
  { id: 'off', label: 'Desktop', width: null, height: null, scale: 1 },
  { id: 'iphone_390x844', label: 'iPhone (390×844)', width: 390, height: 844, scale: 1 },
  { id: 'android_360x800', label: 'Android (360×800)', width: 360, height: 800, scale: 1 },
  { id: 'tablet_820x1180', label: 'Tablet (820×1180)', width: 820, height: 1180, scale: 0.9 },
];

export function readGwPreviewDevice(): GwPreviewDeviceId {
  try {
    const v = localStorage.getItem('gw-dev-preview-device');
    if (!v) return 'off';
    if (GW_PREVIEW_DEVICES.some((d) => d.id === v)) return v as GwPreviewDeviceId;
  } catch {
    /* ignore */
  }
  return 'off';
}

export function writeGwPreviewDevice(id: GwPreviewDeviceId): void {
  try {
    localStorage.setItem('gw-dev-preview-device', id);
  } catch {
    /* ignore */
  }
}

export default function DevicePreview({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: GwPreviewDeviceId;
  onChange: (id: GwPreviewDeviceId) => void;
  onClose: () => void;
}) {
  const options = useMemo(() => GW_PREVIEW_DEVICES, []);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Device preview">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute left-1/2 -translate-x-1/2 top-16 w-full" style={{ maxWidth: 720 }}>
        <div className="gw-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="gw-card-title">Device preview (testing)</div>
              <div className="gw-muted mt-1">
                Forces Good Wheels into mobile/tablet sizing on your laptop. This is DEV-only.
              </div>
            </div>
            <button type="button" className="gw-button gw-button-secondary" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((d) => {
              const active = d.id === value;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={active ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
                  onClick={() => onChange(d.id)}
                  style={{ borderRadius: 999, padding: '8px 12px' }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="gw-muted mt-4 text-sm">
            Tip: set your browser zoom to 100% for best accuracy.
          </div>
        </div>
      </div>
    </div>
  );
}

