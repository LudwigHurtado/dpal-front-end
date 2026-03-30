import React from 'react';
import { Link } from 'react-router-dom';
import { GW_PATHS } from '../../../routes/paths';

const TripEmptyState: React.FC = () => {
  return (
    <div className="gw-card p-8">
      <div className="gw-card-title">No trips yet</div>
      <p className="gw-muted mt-2">
        When you request a ride or accept a trip, it will appear here with timeline, status, and safety context.
      </p>
      <div className="mt-4">
        <Link to={GW_PATHS.passenger.request} className="gw-button gw-button-primary">
          Request a Ride
        </Link>
      </div>
    </div>
  );
};

export default TripEmptyState;

