import React from 'react';
import { Link } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-10">
      <section className="gw-hero">
        <div className="space-y-4">
          <p className="gw-eyebrow">Premium community rides • Family-safe support</p>
          <h1 className="gw-h1">DPAL Good Wheels</h1>
          <p className="gw-lead">
            Request rides, coordinate assistance, and complete support-linked trips with clarity and trust.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={GW_PATHS.auth.signIn} className="gw-button gw-button-primary">Sign in</Link>
            <Link to={GW_PATHS.public.how} className="gw-button gw-button-secondary">How it works</Link>
          </div>
        </div>
        <div className="gw-hero-card">
          <div className="gw-metric-row">
            <div className="gw-metric">
              <div className="gw-metric-label">Family Safe</div>
              <div className="gw-metric-value">Verified handoffs</div>
            </div>
            <div className="gw-metric">
              <div className="gw-metric-label">Support-ready</div>
              <div className="gw-metric-value">Medical • School • Elder</div>
            </div>
          </div>
          <div className="gw-map-placeholder">
            Map placeholder (routes, pickup & dropoff)
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

