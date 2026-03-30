import React from 'react';
import type { Role, Trip, UserProfile } from '../tripTypes';

function roleLabel(role: Role): string {
  if (role === 'passenger') return 'Passenger';
  if (role === 'driver') return 'Driver';
  return 'Worker';
}

const TripParticipantCard: React.FC<{
  trip: Trip;
  role: Role;
  passenger?: UserProfile | null;
  driver?: UserProfile | null;
  worker?: UserProfile | null;
}> = ({ trip, role, passenger, driver, worker }) => {
  const person =
    role === 'passenger' ? passenger :
    role === 'driver' ? driver :
    worker;

  const name = person?.fullName ?? (role === 'passenger' ? 'Passenger' : role === 'driver' ? 'Driver' : 'Worker');
  const phone = person?.phoneMasked ?? '—';
  const trust = person?.trust?.trustScore ?? 0;

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{roleLabel(role)}</div>
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.20), rgba(22,163,74,0.18))',
            border: '1px solid rgba(15,23,42,0.10)',
          }}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="font-extrabold text-slate-800 truncate">{name}</div>
          <div className="text-sm text-slate-600">{phone}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500 font-bold">Trust</div>
          <div className="text-sm font-extrabold text-slate-800">{trust}</div>
        </div>
      </div>

      <div className="text-sm text-slate-600">
        Trip ID: <span className="font-mono text-slate-500">{trip.id}</span>
      </div>
    </div>
  );
};

export default TripParticipantCard;

