import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

type DonationType = 'fixed' | 'percentage' | 'round_up';

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
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
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
            Configure how you give with every ride
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Enable toggle */}
        <div style={{
          background: 'white',
          borderRadius: 18,
          padding: '16px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0D3B66' }}>Enable donations</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Add a donation to every ride</div>
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

        {enabled && (
          <>
            {/* Fixed amount */}
            <div style={{
              background: 'white',
              borderRadius: 18,
              padding: '16px',
              border: `2px solid ${donationType === 'fixed' ? '#0077C8' : '#E5E7EB'}`,
            }}>
              <div
                style={{ fontWeight: 800, fontSize: 14, color: '#0D3B66', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setDonationType('fixed')}
              >
                💵 Fixed Donation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[1, 2, 5].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setDonationType('fixed'); setFixedAmount(amt); }}
                    style={{
                      padding: '12px',
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
              padding: '16px',
              border: `2px solid ${donationType === 'percentage' ? '#0077C8' : '#E5E7EB'}`,
            }}>
              <div
                style={{ fontWeight: 800, fontSize: 14, color: '#0D3B66', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setDonationType('percentage')}
              >
                📊 Percentage of Fare
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => { setDonationType('percentage'); setPercentage(pct); }}
                    style={{
                      padding: '12px',
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
                padding: '16px',
                border: `2px solid ${donationType === 'round_up' ? '#0077C8' : '#E5E7EB'}`,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0D3B66' }}>🔃 Round Up</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Round your fare up to the nearest dollar
              </div>
            </button>

            {/* Preview */}
            <div style={{
              background: 'white',
              borderRadius: 18,
              padding: '16px',
              border: '1px solid #DCE7F2',
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
                DONATION PREVIEW
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Estimated fare</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0D3B66' }}>
                  ${previewFare.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Donation amount</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#2FB344' }}>
                  ${previewDonation.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
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
          {saved ? '✓ Saved!' : 'Save Donation Settings'}
        </button>
      </div>
    </div>
  );
};

export default DonationsPage;
