import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import CauseDiscoveryPanel from '../../features/charity/components/CauseDiscoveryPanel';
import { useGwLang } from '../../i18n/useGwLang';

const CharitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh', paddingBottom: 90 }}>
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
            {t('causeDiscoveryTitle')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600 }}>
            {t('causeDiscoverySubtitle')}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: 12, borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff', padding: '10px 12px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#1d4ed8' }}>{t('causeJourneyLead')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: '#334155' }}>{t('causeChooseDestinationCopy')}</p>
        </div>
        <CauseDiscoveryPanel
          onAttachToRide={() => navigate(GW_PATHS.passenger.dashboard)}
          onUseAsLocation={() => navigate(GW_PATHS.passenger.dashboard)}
          onSupportCause={() => navigate(GW_PATHS.passenger.donations)}
        />
        <button
          type="button"
          onClick={() => navigate(GW_PATHS.passenger.dashboard)}
          style={{
            width: '100%',
            marginTop: 12,
            borderRadius: 12,
            border: 'none',
            background: '#0f172a',
            color: 'white',
            padding: '12px 14px',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {t('requestRide')}
        </button>
      </div>
      <nav style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '8px 4px max(8px, env(safe-area-inset-bottom))',
      }}>
        {[
          { label: t('exploreTab'), icon: '🧭' },
          { label: t('myTripsTab'), icon: '🚗' },
          { label: t('requestRideTab'), icon: '➕' },
          { label: t('donationsTab'), icon: '🤝' },
          { label: t('profileTab'), icon: '👤' },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#475569' }}>
            <div style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</div>
            {item.label}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default CharitiesPage;
