import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../features/trips/tripStore';
import { GW_PATHS } from '../routes/paths';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeRole);
  const signOut = useAuthStore((s) => s.signOut);
  const hydrate = useTripStore((s) => s.hydrate);

  useEffect(() => {
    if (user?.id) void hydrate(user.id);
  }, [user?.id, hydrate]);

  return (
    <div className="gw-root min-h-screen">
      <header className="gw-appbar">
        <div className="gw-container gw-appbar-inner">
          <button type="button" className="gw-button gw-button-ghost" onClick={() => navigate(GW_PATHS.public.home)}>
            Good Wheels
          </button>
          <div className="gw-appbar-spacer" />
          <NavLink to={GW_PATHS.shared.notifications} className="gw-navpill">Notifications</NavLink>
          <NavLink to={GW_PATHS.shared.settings} className="gw-navpill">Settings</NavLink>
          <button type="button" className="gw-button gw-button-ghost" onClick={() => void signOut().then(() => navigate(GW_PATHS.public.home))}>
            Sign out
          </button>
        </div>
      </header>

      <div className="gw-container gw-appshell">
        <aside className="gw-sidenav">
          <div className="gw-sidenav-card">
            <div className="gw-sidenav-title">{user?.fullName ?? '—'}</div>
            <div className="gw-sidenav-sub">Role: {role ?? '—'}</div>
          </div>

          {role === 'passenger' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.passenger.dashboard} className="gw-sidenav-link">Dashboard</NavLink>
              <NavLink to={GW_PATHS.passenger.request} className="gw-sidenav-link">Request a Ride</NavLink>
              <NavLink to={GW_PATHS.passenger.active} className="gw-sidenav-link">Active Trip</NavLink>
              <NavLink to={GW_PATHS.passenger.history} className="gw-sidenav-link">Ride History</NavLink>
              <NavLink to={GW_PATHS.passenger.places} className="gw-sidenav-link">Saved Places</NavLink>
              <NavLink to={GW_PATHS.passenger.support} className="gw-sidenav-link">Support</NavLink>
            </nav>
          )}

          {role === 'driver' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.driver.dashboard} className="gw-sidenav-link">Dashboard</NavLink>
              <NavLink to={GW_PATHS.driver.queue} className="gw-sidenav-link">Queue</NavLink>
              <NavLink to={GW_PATHS.driver.active} className="gw-sidenav-link">Active Trip</NavLink>
              <NavLink to={GW_PATHS.driver.earnings} className="gw-sidenav-link">Earnings</NavLink>
              <NavLink to={GW_PATHS.driver.vehicle} className="gw-sidenav-link">Vehicle</NavLink>
              <NavLink to={GW_PATHS.driver.history} className="gw-sidenav-link">History</NavLink>
            </nav>
          )}

          {role === 'worker' && (
            <nav className="gw-sidenav-links">
              <NavLink to={GW_PATHS.worker.dashboard} className="gw-sidenav-link">Dashboard</NavLink>
              <NavLink to={GW_PATHS.worker.tasks} className="gw-sidenav-link">Tasks</NavLink>
              <NavLink to={GW_PATHS.worker.dispatch} className="gw-sidenav-link">Dispatch</NavLink>
              <NavLink to={GW_PATHS.worker.history} className="gw-sidenav-link">History</NavLink>
              <NavLink to={GW_PATHS.worker.impact} className="gw-sidenav-link">Impact</NavLink>
            </nav>
          )}
        </aside>

        <main className="gw-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

