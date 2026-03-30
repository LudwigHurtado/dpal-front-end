import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import type { Role } from '../../types/role';

interface RoleCard {
  role: Role;
  label: string;
  tagline: string;
  bullets: string[];
  image: string;
  accent: string;
  badge: string;
}

const ROLES: RoleCard[] = [
  {
    role: 'passenger',
    label: 'Passenger',
    tagline: 'Ride with purpose',
    bullets: ['Request a ride in seconds', 'Family-safe verified drivers', 'Donate to local charities per trip'],
    image: '/gw-role-passenger.png',
    accent: '#0077C8',
    badge: 'Most Popular',
  },
  {
    role: 'driver',
    label: 'Driver',
    tagline: 'Earn on your schedule',
    bullets: ['Go online when you want', 'Accept rides & complete trips', 'Transparent earnings dashboard'],
    image: '/gw-role-driver.png',
    accent: '#2FB344',
    badge: 'Earn Money',
  },
  {
    role: 'worker',
    label: 'Support Worker',
    tagline: 'Coordinate & assist',
    bullets: ['Dispatch & support coordination', 'Link trips to assistance cases', 'Track outcomes & impact'],
    image: '/gw-role-worker.png',
    accent: '#F4A300',
    badge: 'Community',
  },
];

const RoleSelectPage: React.FC = () => {
  const navigate   = useNavigate();
  const switchRole = useAuthStore((s) => s.switchRole);
  const [picking, setPicking] = useState<Role | null>(null);

  const pick = async (role: Role) => {
    setPicking(role);
    await switchRole(role);
    if (role === 'passenger') navigate(GW_PATHS.passenger.dashboard);
    if (role === 'driver')    navigate(GW_PATHS.driver.dashboard);
    if (role === 'worker')    navigate(GW_PATHS.worker.dashboard);
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg, #0D3B66 0%, #0077C8 60%, #1a6b3a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: '6px 16px', marginBottom: 16 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Good Wheels by DPAL</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: 'white', margin: '0 0 8px', lineHeight: 1.15 }}>
          Choose Your Role
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500 }}>
          Select how you want to participate in Good Wheels
        </p>
      </div>

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, width: '100%', maxWidth: 900 }}>
        {ROLES.map((r) => {
          const isLoading = picking === r.role;
          return (
            <button
              key={r.role}
              type="button"
              disabled={picking !== null}
              onClick={() => void pick(r.role)}
              style={{
                position: 'relative',
                background: 'white',
                border: `2px solid transparent`,
                borderRadius: 20,
                overflow: 'hidden',
                cursor: picking ? 'wait' : 'pointer',
                textAlign: 'left',
                padding: 0,
                boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                transition: 'transform 0.18s, box-shadow 0.18s',
                opacity: picking && !isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!picking) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.28), 0 0 0 3px ${r.accent}55`;
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.22)';
              }}
            >
              {/* Photo */}
              <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
                <img
                  src={r.image}
                  alt={r.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }} />
                {/* Badge */}
                <span style={{ position: 'absolute', top: 12, left: 12, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'white', background: r.accent, borderRadius: 20, padding: '4px 10px' }}>
                  {r.badge}
                </span>
                {/* Role name on photo */}
                <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '3px 0 0', fontWeight: 600 }}>{r.tagline}</p>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 18px 18px' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {r.bullets.map((b) => (
                    <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${r.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke={r.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div style={{ marginTop: 16, height: 44, borderRadius: 12, background: isLoading ? '#e5e7eb' : r.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
                  {isLoading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#9ca3af' }}>Loading…</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>Continue as {r.label}</span>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
        You can switch roles at any time from your profile settings
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RoleSelectPage;
