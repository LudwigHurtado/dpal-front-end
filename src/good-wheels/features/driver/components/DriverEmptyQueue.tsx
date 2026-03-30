import React from 'react';
import TripEmptyState from '../../trips/components/TripEmptyState';

const DriverEmptyQueue: React.FC = () => {
  return (
    <TripEmptyState
      title="No requests right now"
      message="Stay online and new ride requests will appear here."
      ctaHref="/app/driver/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
};

export default DriverEmptyQueue;

