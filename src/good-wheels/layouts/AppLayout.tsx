import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../features/trips/tripStore';
import { GW_PATHS } from '../routes/paths';
import { useDriverStore } from '../features/driver/driverStore';
import DevicePreview, { readGwPreviewDevice, type GwPreviewDeviceId, GW_PREVIEW_DEVICES, writeGwPreviewDevice } from '../components/dev/DevicePreview';
import { useGwLang } from '../i18n/useGwLang';
import type { GwLang } from '../i18n/gwTranslations';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeRole);
  const signOut = useAuthStore((s) => s.signOut);
  const hydrate = useTripStore((s) => s.hydrate);
  const hydrateDriver = useDriverStore((s) => s.hydrate);

  const lang    = useGwLang((s) => s.lang);
  const setLang = useGwLang((s) => s.setLang);
  const t       = useGwLang((s) => s.t);

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 860 : false));
  const isDev = Boolean((import.meta as any).env?.DEV);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<GwPreviewDeviceId>(() => (typeof window !== 'undefined' ? readGwPreviewDevice() : 'off'));

  useEffect(() => {
    if (user?.id) void hydrate(user.id);
  }, [user?.id, hydrate]);

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

  const mobileTabs = useMemo(() => {
    if (role === 'driver') {
      return [
        { to: GW_PATHS.driver.dashboard, label: t('ride') },
        { to: GW_PATHS.driver.queue,     label: t('queue') },
        { to: GW_PATHS.driver.active,    label: t('onTrip') },
        { to: GW_PATHS.driver.vehicle,   label: t('profile') },
      ];
    }
    if (role === 'passenger') {
      return [
        { to: GW_PATHS.passenger.dashboard, label: t('ride') },
        { to: GW_PATHS.passenger.charities, label: t('charities') },
        { to: GW_PATHS.passenger.donations, label: t('donations') },
        { to: GW_PATHS.auth.profile,        label: t('profile') },
      ];
    }
    if (role === 'worker') {
      return [
        { to: GW_PATHS.worker.dashboard, label: t('home') },
        { to: GW_PATHS.worker.dispatch,  label: t('dispatch') },
        { to: GW_PATHS.worker.tasks,     label: t('tasks') },
        { to: GW_PATHS.auth.profile,     label: t('profile') },
      ];
    }
    return [];
  }, [role, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={previewing ? 'gw-root min-h-screen gw-previewing gw-force-mobile' : 'gw-root min-h-screen'}>
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
          {/* Language toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 2 }}>
            {(['EN', 'ES'] as GwLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  background: lang === l ? '#fff' : 'transparent',
                  color: lang === l ? '#0e7490' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="gw-button gw-button-ghost" onClick={() => void signOut().then(() => navigate(GW_PATHS.public.home))}>
            {t('signOut')}
          </button>
        </div>
      </header>

      <div className="gw-container gw-appshell">
        {!effectiveIsMobile && (
        <aside className="gw-sidenav">
          <div className="gw-sidenav-card">
            <div className="gw-sidenav-title">{user?.fullName ?? '—'}</div>
            <div className="gw-sidenav-sub">{t('role')}: {role ? t(`roleName_${role}` as any) : '—'}</div>
          </div>

          {role === 'passenger' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.passenger.dashboard} className="gw-sidenav-link">{t('dashboard')}</NavLink>
              <NavLink to={GW_PATHS.passenger.request} className="gw-sidenav-link">{t('requestRide')}</NavLink>
              <NavLink to={GW_PATHS.passenger.active} className="gw-sidenav-link">{t('activeTrip')}</NavLink>
              <NavLink to={GW_PATHS.passenger.history} className="gw-sidenav-link">{t('rideHistory')}</NavLink>
              <NavLink to={GW_PATHS.passenger.places} className="gw-sidenav-link">{t('savedPlaces')}</NavLink>
              <NavLink to={GW_PATHS.passenger.support} className="gw-sidenav-link">{t('support')}</NavLink>
            </nav>
          )}

          {role === 'driver' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.driver.dashboard} className="gw-sidenav-link">{t('dashboard')}</NavLink>
              <NavLink to={GW_PATHS.driver.queue} className="gw-sidenav-link">{t('queue')}</NavLink>
              <NavLink to={GW_PATHS.driver.active} className="gw-sidenav-link">{t('activeTrip')}</NavLink>
              <NavLink to={GW_PATHS.driver.earnings} className="gw-sidenav-link">{t('earnings')}</NavLink>
              <NavLink to={GW_PATHS.driver.vehicle} className="gw-sidenav-link">{t('vehicle')}</NavLink>
              <NavLink to={GW_PATHS.driver.history} className="gw-sidenav-link">{t('history')}</NavLink>
            </nav>
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
        </aside>
        )}

        <main className="gw-content" style={effectiveIsMobile ? { paddingBottom: 84 } : undefined}>
          <Outlet />
        </main>
      </div>

      {effectiveIsMobile && mobileTabs.length > 0 && (
        <nav
          className="gw-bottomnav"
          aria-label="Bottom navigation"
        >
          <div className="gw-bottomnav-inner">
            {mobileTabs.map((t) => {
              const active = location.pathname === t.to;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={active ? 'gw-bottomnav-item gw-bottomnav-item-active' : 'gw-bottomnav-item'}
                >
                  <span className="gw-bottomnav-label">{t.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
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
    </div>
  );
};

export default AppLayout;

