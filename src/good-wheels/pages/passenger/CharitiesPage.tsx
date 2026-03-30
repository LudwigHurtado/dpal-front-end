import React from 'react';
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
