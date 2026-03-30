import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

type DonationType = 'fixed' | 'percentage' | 'round_up';

/* ── Fare split visual ── */
const FARE_SPLIT = [
  { label: 'Driver', pct: 85, color: '#0077C8', icon: '🚗' },
  { label: 'Charity', pct: 10, color: '#2FB344', icon: '❤️' },
  { label: 'Infrastructure', pct: 5, color: '#F4A300', icon: '⚙️' },
];

const DonationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [donationType, setDonationType] = useState<DonationType>('percentage');
  const [fixedAmount, setFixedAmount] = useState<number>(2);
  const [percentage, setPercentage] = useState<number>(5);
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const previewFare = 18.5;
  let previewDonation = 0;
  if (enabled) {
    if (donationType === 'fixed') previewDonation = fixedAmount;
    else if (donationType === 'percentage') previewDonation = previewFare * percentage / 100;
    else if (donationType === 'round_up') previewDonation = Math.ceil(previewFare) - previewFare;
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate(GW_PATHS.passenger.dashboard);
    }, 1500);
  };

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh', paddingBottom: 32 }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(180deg, #0D3B66 0%, #0077C8 100%)',
        padding: '14px 16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          type="button"
          onClick={() => navigate(GW_PATHS.passenger.dashboard)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'white',
            borderRadius: 10,
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
            Donation Settings
          </div>
          <div style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600 }}>
            Give back while you ride — at no extra cost
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── HOW IT WORKS — the most important card ── */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '18px',
          border: '1px solid #DCE7F2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0077C8, #2FB344)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}>
              💡
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#0D3B66' }}>
                You never pay extra
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                Charity comes from how the fare is already split
              </div>
            </div>
          </div>

          {/* Bold statement */}
          <div style={{
            background: 'rgba(0,119,200,0.06)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 16,
            border: '1px solid rgba(0,119,200,0.14)',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#0D3B66', fontWeight: 700, lineHeight: 1.55 }}>
              Every Good Wheels fare is already split three ways.{' '}
              <span style={{ color: '#2FB344' }}>10% goes directly to the charity you choose</span> — this is
              built into the platform, not added on top of your ride price. You pay exactly what the app quotes. Nothing more.
            </p>
          </div>

          {/* Visual fare split bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              height: 12,
              borderRadius: 999,
              overflow: 'hidden',
              display: 'flex',
              marginBottom: 10,
            }}>
              {FARE_SPLIT.map((s) => (
                <div
                  key={s.label}
                  style={{
                    width: `${s.pct}%`,
                    background: s.color,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FARE_SPLIT.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: s.color,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', flex: 1 }}>
                    {s.icon} {s.label}
                  </span>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: s.color,
                  }}>
                    {s.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#F0FDF4',
            borderRadius: 12,
            padding: '10px 13px',
            border: '1px solid rgba(34,197,94,0.25)',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 700, lineHeight: 1.5 }}>
              ✅ No surprises. The fare you see is the fare you pay.
              Charity is already inside the 10% platform share — it costs you nothing extra to make a difference.
            </p>
          </div>
        </div>

        {/* ── Optional extra donation toggle ── */}
        <div style={{
          background: 'white',
          borderRadius: 18,
          padding: '16px',
          border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0D3B66' }}>
                Add an extra donation <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>(optional)</span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>
                Want to give a little more? Totally up to you.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                background: enabled ? '#0077C8' : '#D1D5DB',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: enabled ? 23 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {/* ── Extra donation options (shown only when enabled) ── */}
        {enabled && (
          <>
            {/* Fixed */}
            <div style={{
              background: 'white',
              borderRadius: 18,
              padding: '14px',
              border: `2px solid ${donationType === 'fixed' ? '#0077C8' : '#E5E7EB'}`,
            }}>
              <div
                style={{ fontWeight: 800, fontSize: 13, color: '#0D3B66', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setDonationType('fixed')}
              >
                💵 Add a fixed amount
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[1, 2, 5].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setDonationType('fixed'); setFixedAmount(amt); }}
                    style={{
                      padding: '11px',
                      borderRadius: 12,
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: 'pointer',
                      background: donationType === 'fixed' && fixedAmount === amt ? '#F4A300' : '#F9FAFB',
                      color: donationType === 'fixed' && fixedAmount === amt ? 'white' : '#374151',
                    }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Percentage */}
            <div style={{
              background: 'white',
              borderRadius: 18,
              padding: '14px',
              border: `2px solid ${donationType === 'percentage' ? '#0077C8' : '#E5E7EB'}`,
            }}>
              <div
                style={{ fontWeight: 800, fontSize: 13, color: '#0D3B66', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setDonationType('percentage')}
              >
                📊 Percentage of fare
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => { setDonationType('percentage'); setPercentage(pct); }}
                    style={{
                      padding: '11px',
                      borderRadius: 12,
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: 'pointer',
                      background: donationType === 'percentage' && percentage === pct ? '#2FB344' : '#F9FAFB',
                      color: donationType === 'percentage' && percentage === pct ? 'white' : '#374151',
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Round up */}
            <button
              type="button"
              onClick={() => setDonationType('round_up')}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '14px 16px',
                border: `2px solid ${donationType === 'round_up' ? '#0077C8' : '#E5E7EB'}`,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0D3B66' }}>🔃 Round up to nearest dollar</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                A few cents go a long way for a good cause
              </div>
            </button>

            {/* Donation preview */}
            <div style={{
              background: 'white',
              borderRadius: 18,
              padding: '14px 16px',
              border: '1px solid #DCE7F2',
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Preview (sample $18.50 fare)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>Your fare</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0D3B66' }}>${previewFare.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>Built-in charity (10%)</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#2FB344' }}>
                  ${(previewFare * 0.10).toFixed(2)} ✓
                </span>
              </div>
              <div style={{ height: 1, background: '#F3F4F6', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#374151' }}>Your extra donation</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#F4A300' }}>
                  +${previewDonation.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0D3B66' }}>You pay total</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#0D3B66' }}>
                  ${(previewFare + previewDonation).toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Save button ── */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            background: saved ? '#2FB344' : 'linear-gradient(135deg, #0077C8, #0D3B66)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            padding: '16px',
            fontWeight: 900,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>

      </div>
    </div>
  );
};

export default DonationsPage;
