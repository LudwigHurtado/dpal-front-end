import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../../routes/paths';

export default function PassengerRideSearchSheet({
  onSearchRide,
  onDonate,
}: {
  onSearchRide?: () => void;
  onDonate?: () => void;
}) {
  const navigate = useNavigate();
  const charities = useMemo(
    () => [
      { id: 'hope', name: 'Hope Shelter', miles: 0.5 },
      { id: 'kids', name: 'Kids Outreach', miles: 0.8 },
    ],
    []
  );

  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="gw-sheet-title">
        <div className="gw-sheet-brand">
          <div className="gw-mobile-logo" aria-hidden />
          <div>
            <div className="gw-mobile-title">Good Wheels</div>
            <div className="gw-mobile-sub">by DPAL</div>
          </div>
        </div>
      </div>

      <div className="gw-card p-5 gw-ride-search">
        <div className="gw-card-title">Book a ride</div>
        <div className="gw-form mt-3">
          <label className="gw-label">
            Where from?
            <input className="gw-input" placeholder="Enter pickup location" />
          </label>
          <label className="gw-label">
            Where to?
            <input className="gw-input" placeholder="Enter destination" />
          </label>
          <button
            type="button"
            className="gw-button gw-button-primary w-full"
            onClick={() => (onSearchRide ? onSearchRide() : navigate(GW_PATHS.passenger.request))}
          >
            Search Ride
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-lg font-extrabold text-slate-900">Nearby Charities</div>
        <div className="gw-charity-row">
          {charities.map((c) => (
            <div key={c.id} className="gw-charity-card">
              <div className="gw-charity-img" aria-hidden />
              <div className="gw-charity-name">{c.name}</div>
              <div className="gw-charity-sub">{c.miles} miles away</div>
            </div>
          ))}
        </div>
        <button type="button" className="gw-button gw-button-donate w-full" onClick={onDonate}>
          Donate Now
        </button>
      </div>
    </>
  );
}

