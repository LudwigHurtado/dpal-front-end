import React from 'react';
import type { GoodWheelsFareSplitUsd } from '../utils/goodWheelsFareSplitUsd';

export type RideImpactBreakdownProps = {
  split: GoodWheelsFareSplitUsd;
  formatMoney: (value: number) => string;
};

/**
 * Friendly fare breakdown for charity ride flow (5% platform, 90/10 of remainder).
 */
const RideImpactBreakdown: React.FC<RideImpactBreakdownProps> = ({ split, formatMoney }) => {
  if (split.totalFare <= 0) return null;

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    padding: '8px 0',
    borderBottom: '1px solid rgba(15,23,42,0.06)',
  };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: '#0f172a', marginBottom: 4 }}>
        HOW YOUR FARE SPLITS
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 10px', lineHeight: 1.45 }}>
        Pick your community impact. After a 5% platform fee, 90% of the remaining fare goes to your driver and 10%
        goes to your selected cause.
      </p>
      <div style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
        <div style={rowStyle}>
          <span>Ride price</span>
          <span style={{ fontWeight: 900, color: '#0f172a' }}>{formatMoney(split.totalFare)}</span>
        </div>
        <div style={rowStyle}>
          <span>Good Wheels platform fee (5%)</span>
          <span style={{ fontWeight: 800 }}>{formatMoney(split.platformFee)}</span>
        </div>
        <div style={rowStyle}>
          <span>Remaining balance</span>
          <span style={{ fontWeight: 800 }}>{formatMoney(split.remainingAfterFee)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none', paddingBottom: 4 }}>
          <span>Driver receives (90% of remaining)</span>
          <span style={{ fontWeight: 900, color: '#047857' }}>{formatMoney(split.driverAmount)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none', paddingTop: 0 }}>
          <span>Community cause receives (10% of remaining)</span>
          <span style={{ fontWeight: 900, color: '#0369a1' }}>{formatMoney(split.charityAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default RideImpactBreakdown;
