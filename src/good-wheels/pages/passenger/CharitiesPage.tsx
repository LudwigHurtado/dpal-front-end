import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

const CHARITIES = [
  {
    id: 'hope-shelter',
    name: 'Hope Shelter',
    tagline: 'Help the homeless in need.',
    distance: '0.5 miles away',
    category: 'Homeless Support',
    color: '#0077C8',
  },
  {
    id: 'kids-outreach',
    name: 'Kids Outreach',
    tagline: 'Support local children.',
    distance: '0.8 miles away',
    category: 'Children',
    color: '#2FB344',
  },
  {
    id: 'golden-years',
    name: 'Golden Years',
    tagline: 'Transportation for local seniors.',
    distance: '1.2 miles away',
    category: 'Senior Care',
    color: '#F4A300',
  },
  {
    id: 'paws-rescue',
    name: 'Paws Rescue',
    tagline: 'Feed, shelter, and rescue animals.',
    distance: '1.6 miles away',
    category: 'Animal Welfare',
    color: '#8B5CF6',
  },
];

const CharitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(
    () => localStorage.getItem('gw_crypto_terms') === 'true'
  );
  const [showTerms, setShowTerms] = useState(false);

  const acceptTerms = () => {
    localStorage.setItem('gw_crypto_terms', 'true');
    setTermsAccepted(true);
    setShowTerms(false);
  };

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Blue header */}
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
            Nearby Charities
          </div>
          <div style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600 }}>
            Support a cause with every ride
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Donate banner */}
        <div style={{
          background: 'linear-gradient(135deg, #F4A300, #e89800)',
          borderRadius: 18,
          padding: '16px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>Make a Difference Today</div>
            <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
              Attach a charity to your next ride
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(GW_PATHS.passenger.donations)}
            style={{
              background: 'white',
              color: '#F4A300',
              border: 'none',
              borderRadius: 12,
              padding: '10px 16px',
              fontWeight: 900,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Donate Now
          </button>
        </div>

        {/* ── CRYPTO REWARDS BANNER ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0D1117 0%, #1a2744 100%)',
          borderRadius: 18,
          padding: '18px',
          marginBottom: 20,
          border: '1px solid rgba(247,147,26,0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(247,147,26,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #F7931A, #e8830a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 14px rgba(247,147,26,0.4)',
            }}>₿</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#F7931A', fontWeight: 900, fontSize: 15, letterSpacing: '-0.01em' }}>
                Every Report Earns Crypto
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, marginTop: 3, lineHeight: 1.5 }}>
                Start a verified report on the DPAL platform and earn a Bitcoin micro-reward — a promise to pay, secured on the blockchain.
              </div>
            </div>
          </div>

          {/* How it works steps */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '📝', text: 'File a verified report or complete a ride' },
              { icon: '⛓️', text: 'Your action is anchored to a DPAL verification block' },
              { icon: '🏗️', text: 'When the block completes — every contributor gets paid' },
              { icon: '₿', text: 'Bitcoin micro-reward sent to your wallet' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(247,147,26,0.12)',
                  border: '1px solid rgba(247,147,26,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>{step.icon}</div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', fontWeight: 600, lineHeight: 1.4 }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* Block reward explainer */}
          <div style={{
            marginTop: 14,
            background: 'rgba(247,147,26,0.08)',
            border: '1px solid rgba(247,147,26,0.20)',
            borderRadius: 12, padding: '10px 13px',
          }}>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6 }}>
              <span style={{ color: '#F7931A', fontWeight: 800 }}>Block Reward System:</span>{' '}
              Reports and rides build verification blocks. When a block is sealed — like a tower completing its final floor —
              every report inside it triggers a reward payout. The more you report, the more blocks you fill, the more you earn.
              This is a blockchain designed to create real-world value and new economic opportunity.
            </p>
          </div>

          {/* Terms / CTA */}
          {!termsAccepted ? (
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              style={{
                marginTop: 14, width: '100%',
                background: 'linear-gradient(135deg, #F7931A, #e8830a)',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '12px', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(247,147,26,0.35)',
              }}
            >
              Claim My Crypto Rewards →
            </button>
          ) : (
            <div style={{
              marginTop: 14, borderRadius: 12, padding: '10px 14px',
              background: 'rgba(47,179,68,0.12)', border: '1px solid rgba(47,179,68,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, color: '#2FB344', fontWeight: 800 }}>
                Terms accepted — your reports earn crypto rewards automatically
              </span>
            </div>
          )}
        </div>

        {/* ── TERMS MODAL ── */}
        {showTerms && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.75)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0',
          }}>
            <div style={{
              background: '#0D1117', borderRadius: '24px 24px 0 0',
              padding: '24px 20px 32px', width: '100%', maxWidth: 480,
              border: '1px solid rgba(247,147,26,0.25)', borderBottom: 'none',
              maxHeight: '80vh', overflowY: 'auto',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>₿</div>
                <div style={{ color: '#F7931A', fontWeight: 900, fontSize: 18 }}>DPAL Crypto Rewards</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 }}>Terms & Conditions</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[
                  'By using the DPAL platform you agree to these terms.',
                  'Every verified report you file earns a Bitcoin micro-reward — a cryptographic promise to pay, recorded on the DPAL blockchain.',
                  'Rewards are held in escrow until the verification block containing your report is sealed and validated by the community.',
                  'When a block completes (the tower is built), all contributors inside that block receive their reward payout.',
                  'DPAL micro-rewards are real but small — this is a long-term economic model, not a get-rich-quick scheme.',
                  'You must maintain a valid wallet address in your profile to receive payouts.',
                  'Reports must be genuine, verifiable, and pass community validation to qualify for rewards.',
                  'Fraudulent or duplicate reports are disqualified and may result in account suspension.',
                ].map((term, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#F7931A', fontWeight: 900, marginTop: 1,
                    }}>{i + 1}</div>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.80)', lineHeight: 1.55 }}>{term}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={acceptTerms}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #F7931A, #e8830a)',
                  color: 'white', border: 'none', borderRadius: 14,
                  padding: '14px', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(247,147,26,0.4)', marginBottom: 10,
                }}
              >
                I Accept — Start Earning Crypto
              </button>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                style={{
                  width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                  padding: '12px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Charity grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {CHARITIES.map((ch) => (
            <div key={ch.id} style={{
              background: 'white',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
              border: '1px solid rgba(0,0,0,0.07)',
            }}>
              {/* Image placeholder with color */}
              <div style={{
                height: 88,
                background: `linear-gradient(135deg, ${ch.color}22, ${ch.color}44)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}>
                {ch.category === 'Homeless Support' && '🏠'}
                {ch.category === 'Children' && '👶'}
                {ch.category === 'Senior Care' && '👵'}
                {ch.category === 'Animal Welfare' && '🐾'}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#0D3B66' }}>{ch.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginTop: 2, marginBottom: 8 }}>
                  {ch.distance}
                </div>
                <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.35, marginBottom: 10 }}>
                  {ch.tagline}
                </div>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: '#0077C8',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(GW_PATHS.passenger.dashboard)}
                >
                  Donate
                </button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>
          More charities coming soon
        </p>
      </div>
    </div>
  );
};

export default CharitiesPage;
