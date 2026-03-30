import React from 'react';
import { Link } from 'react-router-dom';
import { GW_PATHS } from '../../../routes/paths';

const TripEmptyState: React.FC<{ title?: string; message?: string; ctaHref?: string; ctaLabel?: string }> = ({
  title = 'No trips yet',
  message = 'When you request a ride or accept a trip, it will appear here with timeline, status, and safety context.',
  ctaHref = GW_PATHS.passenger.request,
  ctaLabel = 'Request a Ride',
}) => {
  return (
    <div className="gw-card p-8">
      <div className="gw-card-title">{title}</div>
      <p className="gw-muted mt-2">{message}</p>
      <div className="mt-4">
        <Link to={ctaHref} className="gw-button gw-button-primary">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
};

export default TripEmptyState;

