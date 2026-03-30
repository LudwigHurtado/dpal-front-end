import React from 'react';
import { Link } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

const NotFoundPage: React.FC = () => {
  return (
    <div className="gw-card p-8">
      <h2 className="gw-h2">Page not found</h2>
      <p className="gw-muted">That link doesn’t exist in Good Wheels.</p>
      <div className="mt-4">
        <Link className="gw-link" to={GW_PATHS.public.home}>Go to home</Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

