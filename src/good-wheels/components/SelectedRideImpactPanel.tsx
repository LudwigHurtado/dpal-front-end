import React from 'react';

export type SelectedRideImpactPanelProps = {
  title: string;
  subtitle: string;
  capacityLine?: string;
  estimatedFareUsd: number;
  formatFare: (n: number) => string;
  Icon: React.FC<{ size?: number; active?: boolean }>;
};

/**
 * Compact summary of the chosen ride at the top of Charity Ride Selection Mode.
 */
const SelectedRideImpactPanel: React.FC<SelectedRideImpactPanelProps> = ({
  title,
  subtitle,
  capacityLine,
  estimatedFareUsd,
  formatFare,
  Icon,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 55%)',
        border: '1px solid rgba(217, 119, 6, 0.22)',
        boxShadow: '0 8px 24px rgba(146, 64, 14, 0.08)',
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          width: 88,
          height: 64,
          borderRadius: 14,
          background: 'rgba(0, 119, 200, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={76} active />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#b45309' }}>YOUR RIDE</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#57534e', marginTop: 2 }}>{subtitle}</div>
        {capacityLine ? (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#78716c', marginTop: 4 }}>{capacityLine}</div>
        ) : null}
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginTop: 10 }}>
          Estimated fare: {formatFare(estimatedFareUsd)}
        </div>
      </div>
    </div>
  );
};

export default SelectedRideImpactPanel;
