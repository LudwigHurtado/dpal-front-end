import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../features/trips/tripStore';
import { GW_PATHS } from '../routes/paths';
import { useDriverStore } from '../features/driver/driverStore';
import DevicePreview, { readGwPreviewDevice, type GwPreviewDeviceId, GW_PREVIEW_DEVICES, writeGwPreviewDevice } from '../components/dev/DevicePreview';
import { useGwLang } from '../i18n/useGwLang';
import type { GwLang } from '../i18n/gwTranslations';
import { getDpalApiConfig } from '../../config/api';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeRole);
  const signOut = useAuthStore((s) => s.signOut);
  const hydrate = useTripStore((s) => s.hydrate);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hydrateDriver = useDriverStore((s) => s.hydrate);

  const lang    = useGwLang((s) => s.lang);
  const setLang = useGwLang((s) => s.setLang);
  const t       = useGwLang((s) => s.t);

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 860 : false));
  const isDev = Boolean((import.meta as any).env?.DEV);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<GwPreviewDeviceId>(() => (typeof window !== 'undefined' ? readGwPreviewDevice() : 'off'));
  const [backendHealth, setBackendHealth] = useState<'loading' | 'ok' | 'down'>('loading');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) void hydrate(user.id);
    if (user?.id) setLastSyncAt(new Date().toISOString());
  }, [user?.id, hydrate]);

  useEffect(() => {
    if (!user?.id || role !== 'passenger') return;
    const uid = user.id;
    const id = window.setInterval(() => void hydrate(uid), 7000);
    return () => window.clearInterval(id);
  }, [user?.id, role, hydrate]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const url = `${getDpalApiConfig().apiBaseUrl}/api/good-wheels/health`;
        const res = await fetch(url);
        if (!mounted) return;
        setBackendHealth(res.ok ? 'ok' : 'down');
      } catch {
        if (!mounted) return;
        setBackendHealth('down');
      }
    };
    void check();
    const tmr = window.setInterval(() => void check(), 20000);
    return () => {
      mounted = false;
      window.clearInterval(tmr);
    };
  }, []);

  useEffect(() => {
    if (role === 'driver') void hydrateDriver();
  }, [role, hydrateDriver]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const previewSpec = useMemo(() => GW_PREVIEW_DEVICES.find((d) => d.id === previewDevice) ?? GW_PREVIEW_DEVICES[0], [previewDevice]);
  const previewing = previewDevice !== 'off' && isDev;
  const effectiveIsMobile = previewing ? true : isMobile;

  const themeClass =
    role === 'driver' ? 'gw-theme-driver' : role === 'worker' ? 'gw-theme-worker' : role === 'passenger' ? 'gw-theme-passenger' : 'gw-theme-guest';

  /** Mobile uses the slide-out drawer for navigation; remove bottom tabs for all roles. */
  const showMobileBottomNav = false;
  const mobileContentPaddingBottom = effectiveIsMobile && showMobileBottomNav ? 84 : undefined;

  const [passengerMenuOpen, setPassengerMenuOpen] = useState(false);
  const [driverMenuOpen, setDriverMenuOpen] = useState(false);
  useEffect(() => {
    if (!passengerMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPassengerMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passengerMenuOpen]);
  useEffect(() => {
    if (!driverMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDriverMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [driverMenuOpen]);

  return (
    <div className={`${previewing ? 'gw-root min-h-screen gw-previewing gw-force-mobile' : 'gw-root min-h-screen'} ${themeClass}`}>
      <div
        className={previewing ? 'gw-preview-app' : undefined}
        style={
          previewing
            ? {
                width: previewSpec.width ?? 'auto',
                height: previewSpec.height ?? 'auto',
              }
            : undefined
        }
      >
      <header className="gw-appbar">
        <div className="gw-container gw-appbar-inner">
          {effectiveIsMobile && (role === 'passenger' || role === 'driver' || role === 'worker') && (
            <button
              type="button"
              className="gw-button gw-button-ghost"
              aria-label={t('menu')}
              aria-expanded={role === 'driver' ? driverMenuOpen : passengerMenuOpen}
              onClick={() => {
                if (role === 'driver') setDriverMenuOpen((o) => !o);
                else setPassengerMenuOpen((o) => !o);
              }}
              style={{ padding: '8px 12px', minWidth: 44 }}
            >
              <span style={{ display: 'block', fontSize: 18, lineHeight: 1 }} aria-hidden>
                ☰
              </span>
            </button>
          )}
          <button type="button" className="gw-button gw-button-ghost" onClick={() => navigate(GW_PATHS.public.home)}>
            {t('appName')}
          </button>
          <div className="gw-appbar-spacer" />
          {isDev && (
            <button type="button" className="gw-button gw-button-secondary" onClick={() => setPreviewOpen(true)}>
              {t('devicePreview')}
            </button>
          )}
          {!effectiveIsMobile && <NavLink to={GW_PATHS.shared.notifications} className="gw-navpill">{t('notifications')}</NavLink>}
          {!effectiveIsMobile && <NavLink to={GW_PATHS.shared.settings} className="gw-navpill">{t('settings')}</NavLink>}
          <button type="button" className="gw-button gw-button-ghost" onClick={() => void signOut().then(() => navigate(GW_PATHS.public.home))}>
            {t('signOut')}
          </button>
        </div>
      </header>

      <div className="gw-container gw-appshell">
        {!effectiveIsMobile && (
        <aside className="gw-sidenav">
          {role === 'driver' ? (
            <div className="gw-driver-sidenav-brand" aria-hidden={false}>
              <div className="gw-driver-sidenav-logo">GOOD WHEELS</div>
              <div className="gw-driver-sidenav-tagline">{t('driverAppTitle')}</div>
            </div>
          ) : (
            <div className="gw-sidenav-card">
              <div className="gw-sidenav-title">{user?.fullName ?? '—'}</div>
              <div className="gw-sidenav-sub">{t('role')}: {role ? t(`roleName_${role}` as any) : '—'}</div>
            </div>
          )}

          {role === 'passenger' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.passenger.dashboard} className="gw-sidenav-link">{t('dashboard')}</NavLink>
              <NavLink to={GW_PATHS.passenger.active} className="gw-sidenav-link">{t('activeTrip')}</NavLink>
              <NavLink to={GW_PATHS.passenger.history} className="gw-sidenav-link">{t('rideHistory')}</NavLink>
              <NavLink to={GW_PATHS.passenger.places} className="gw-sidenav-link">{t('savedPlaces')}</NavLink>
              <NavLink to={GW_PATHS.passenger.support} className="gw-sidenav-link">{t('support')}</NavLink>
            </nav>
          )}

          {role === 'driver' && (
            <>
              <nav className="gw-sidenav-links">
                <NavLink to={GW_PATHS.driver.dashboard} className="gw-sidenav-link">
                  {t('dashboard')}
                </NavLink>
                <NavLink to={GW_PATHS.driver.queue} className="gw-sidenav-link">
                  {t('queue')}
                </NavLink>
                <NavLink to={GW_PATHS.driver.active} className="gw-sidenav-link">
                  {t('activeTrip')}
                </NavLink>
                <NavLink to={GW_PATHS.driver.earnings} className="gw-sidenav-link">
                  {t('earnings')}
                </NavLink>
                <NavLink to={GW_PATHS.driver.vehicle} className="gw-sidenav-link">
                  {t('vehicle')}
                </NavLink>
                <NavLink to={GW_PATHS.driver.history} className="gw-sidenav-link">
                  {t('history')}
                </NavLink>
              </nav>
              <div className="gw-driver-sidenav-promo">
                <span>{t('driverNavPromoTitle')}</span>
                {t('driverNavPromoBody')}
              </div>
              <div className="gw-driver-sidenav-footer">
                <NavLink to={GW_PATHS.public.help}>
                  {t('support')} <span aria-hidden>›</span>
                </NavLink>
                <NavLink to={GW_PATHS.shared.settings}>
                  {t('settings')} <span aria-hidden>›</span>
                </NavLink>
              </div>
              <div className="gw-sidenav-card">
                <div className="gw-sidenav-title">Language</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {(['en', 'es', 'pt'] as GwLang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className="gw-button"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 800,
                        background: lang === l ? 'rgba(26,115,232,0.12)' : 'rgba(15,23,42,0.03)',
                        color: lang === l ? '#1557b0' : '#334155',
                        borderColor: lang === l ? 'rgba(26,115,232,0.25)' : 'rgba(15,23,42,0.1)',
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {role === 'worker' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.worker.dashboard} className="gw-sidenav-link">{t('dashboard')}</NavLink>
              <NavLink to={GW_PATHS.worker.tasks} className="gw-sidenav-link">{t('tasks')}</NavLink>
              <NavLink to={GW_PATHS.worker.dispatch} className="gw-sidenav-link">{t('dispatch')}</NavLink>
              <NavLink to={GW_PATHS.worker.history} className="gw-sidenav-link">{t('history')}</NavLink>
              <NavLink to={GW_PATHS.worker.impact} className="gw-sidenav-link">{t('impact')}</NavLink>
            </nav>
          )}

          {role !== 'driver' && (
            <div className="gw-sidenav-card">
              <div className="gw-sidenav-title">Language</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {(['en', 'es', 'pt'] as GwLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className="gw-button"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 800,
                      background: lang === l ? 'rgba(0,119,200,0.12)' : 'rgba(15,23,42,0.03)',
                      color: lang === l ? '#0077C8' : '#334155',
                      borderColor: lang === l ? 'rgba(0,119,200,0.25)' : 'rgba(15,23,42,0.1)',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
        )}

        <main className="gw-content" style={mobileContentPaddingBottom != null ? { paddingBottom: mobileContentPaddingBottom } : undefined}>
          <Outlet />
        </main>
      </div>

      {effectiveIsMobile && role === 'passenger' && passengerMenuOpen && (
        <>
          <button
            type="button"
            aria-label={t('donationClose')}
            onClick={() => setPassengerMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 85,
              background: 'rgba(15, 23, 42, 0.45)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <nav
            aria-label={t('menu')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(300px, 88vw)',
              zIndex: 90,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
              borderTopRightRadius: 18,
              borderBottomRightRadius: 18,
            }}
          >
            <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid #E5E7EB', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              {user?.fullName ?? t('dashboard')}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 10px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(
                [
                  { to: GW_PATHS.passenger.dashboard, label: t('dashboard') },
                  { to: GW_PATHS.passenger.active, label: t('activeTrip') },
                  { to: GW_PATHS.passenger.history, label: t('rideHistory') },
                  { to: GW_PATHS.passenger.places, label: t('savedPlaces') },
                  { to: GW_PATHS.passenger.support, label: t('support') },
                  { to: GW_PATHS.passenger.charities, label: t('charities') },
                  { to: GW_PATHS.passenger.donations, label: t('donations') },
                  { to: GW_PATHS.auth.profile, label: t('profile') },
                ] as const
              ).map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setPassengerMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '12px 14px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive ? '#0077C8' : '#334155',
                    background: isActive ? 'rgba(0, 119, 200, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(0, 119, 200, 0.18)' : '1px solid transparent',
                  })}
                >
                  {label}
                </NavLink>
              ))}
              <div style={{ marginTop: 10, borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Language</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['en', 'es', 'pt'] as GwLang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className="gw-button"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 800,
                        background: lang === l ? 'rgba(0,119,200,0.12)' : 'rgba(15,23,42,0.03)',
                        color: lang === l ? '#0077C8' : '#334155',
                        borderColor: lang === l ? 'rgba(0,119,200,0.24)' : 'rgba(15,23,42,0.1)',
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </>
      )}

      {effectiveIsMobile && role === 'driver' && driverMenuOpen && (
        <>
          <button
            type="button"
            aria-label={t('donationClose')}
            onClick={() => setDriverMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 85,
              background: 'rgba(15, 23, 42, 0.45)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <nav
            aria-label={t('menu')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(300px, 88vw)',
              zIndex: 90,
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
              borderTopRightRadius: 18,
              borderBottomRightRadius: 18,
            }}
          >
            <div className="gw-driver-sidenav-brand" style={{ margin: '10px 12px 12px', borderRadius: 18 }}>
              <div className="gw-driver-sidenav-logo">GOOD WHEELS</div>
              <div className="gw-driver-sidenav-tagline">{t('driverAppTitle')}</div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 10px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(
                [
                  { to: GW_PATHS.driver.dashboard, label: t('dashboard') },
                  { to: GW_PATHS.driver.queue, label: t('queue') },
                  { to: GW_PATHS.driver.active, label: t('activeTrip') },
                  { to: GW_PATHS.driver.earnings, label: t('earnings') },
                  { to: GW_PATHS.driver.vehicle, label: t('vehicle') },
                  { to: GW_PATHS.driver.history, label: t('history') },
                  { to: GW_PATHS.auth.profile, label: t('profile') },
                ] as const
              ).map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDriverMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '12px 14px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive ? '#1557b0' : '#334155',
                    background: isActive ? 'rgba(26, 115, 232, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(26, 115, 232, 0.18)' : '1px solid transparent',
                  })}
                >
                  {label}
                </NavLink>
              ))}
              <div className="gw-driver-sidenav-promo" style={{ marginTop: 8 }}>
                <span>{t('driverNavPromoTitle')}</span>
                {t('driverNavPromoBody')}
              </div>
              <div className="gw-driver-sidenav-footer" style={{ marginTop: 8 }}>
                <NavLink to={GW_PATHS.public.help} onClick={() => setDriverMenuOpen(false)} style={{ width: '100%' }}>
                  {t('support')} <span aria-hidden>›</span>
                </NavLink>
                <NavLink to={GW_PATHS.shared.settings} onClick={() => setDriverMenuOpen(false)} style={{ width: '100%' }}>
                  {t('settings')} <span aria-hidden>›</span>
                </NavLink>
              </div>
              <div style={{ marginTop: 10, borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Language</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['en', 'es', 'pt'] as GwLang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className="gw-button"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 800,
                        background: lang === l ? 'rgba(26,115,232,0.12)' : 'rgba(15,23,42,0.03)',
                        color: lang === l ? '#1557b0' : '#334155',
                        borderColor: lang === l ? 'rgba(26,115,232,0.24)' : 'rgba(15,23,42,0.1)',
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
      </div>

      {isDev && (
        <DevicePreview
          open={previewOpen}
          value={previewDevice}
          onChange={(id) => {
            setPreviewDevice(id);
            writeGwPreviewDevice(id);
          }}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {isDev && (
        <div
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            zIndex: 1000,
            borderRadius: 12,
            border: '1px solid rgba(14,116,144,0.35)',
            background: 'rgba(2,6,23,0.92)',
            color: '#e2e8f0',
            padding: '10px 12px',
            fontSize: 11,
            lineHeight: 1.45,
            minWidth: 260,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t('goodWheelsDebug')}</div>
          <div>{t('apiBase')}: {getDpalApiConfig().apiBaseUrl}</div>
          <div>{t('backendHealth')}: {backendHealth}</div>
          <div>{t('activeTripId')}: {activeTrip?.id ?? t('no')}</div>
          <div>{t('tripStatus')}: {activeTrip?.status ?? t('no')}</div>
          <div>{t('driverAssigned')}: {activeTrip?.driverId ? t('yes') : t('no')}</div>
          <div>{t('lastSync')}: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : t('na')}</div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;

