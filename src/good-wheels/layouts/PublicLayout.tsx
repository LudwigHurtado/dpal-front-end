import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GW_PATHS } from '../routes/paths';
import { GOOD_WHEELS_PRODUCT_NAME, GOOD_WHEELS_TAGLINE } from '../app/appConfig';

const PublicLayout: React.FC = () => {
  return (
    <div className="gw-root min-h-screen">
      <header className="gw-topbar">
        <div className="gw-container gw-topbar-inner">
          <Link to={GW_PATHS.public.home} className="gw-brand">
            <span className="gw-brand-mark" aria-hidden />
            <div className="min-w-0">
              <div className="gw-brand-title">{GOOD_WHEELS_PRODUCT_NAME}</div>
              <div className="gw-brand-sub">{GOOD_WHEELS_TAGLINE}</div>
            </div>
          </Link>
          <nav className="gw-topnav">
            <Link to={GW_PATHS.public.how} className="gw-navlink">How it works</Link>
            <Link to={GW_PATHS.public.safety} className="gw-navlink">Safety</Link>
            <Link to={GW_PATHS.public.help} className="gw-navlink">Help</Link>
            <Link to={GW_PATHS.auth.signIn} className="gw-button gw-button-primary">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="gw-container gw-main">
        <Outlet />
      </main>
      <footer className="gw-footer">
        <div className="gw-container gw-footer-inner">
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} DPAL Good Wheels</div>
          <div className="text-sm text-slate-500">Family-safe transport • Community support</div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;

