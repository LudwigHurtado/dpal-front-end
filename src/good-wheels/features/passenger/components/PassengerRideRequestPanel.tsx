import React from 'react';
import type { RideDraftInput, RidePurposeOption } from '../../../types/rideConnection';

const PURPOSES: Array<{ id: RidePurposeOption; label: string }> = [
  { id: 'personal_ride', label: 'Personal ride' },
  { id: 'medical_appointment', label: 'Medical appointment' },
  { id: 'school_pickup_dropoff', label: 'School pickup/dropoff' },
  { id: 'senior_assistance', label: 'Senior assistance' },
  { id: 'charity_supported_ride', label: 'Charity-supported ride' },
  { id: 'emergency_support_non_emergency_assistance', label: 'Emergency support/non-emergency assistance' },
  { id: 'delivery_help_mission', label: 'Delivery/help mission' },
];

const PassengerRideRequestPanel: React.FC<{
  draft: RideDraftInput;
  onChange: (patch: Partial<RideDraftInput>) => void;
  onSubmit: () => void;
  loading?: boolean;
}> = ({ draft, onChange, onSubmit, loading = false }) => (
  <div className="gw-card p-5 space-y-3">
    <div className="gw-card-title">Passenger ride request</div>
    <label className="gw-label">
      Pickup location
      <input className="gw-input" value={draft.pickupAddress} onChange={(e) => onChange({ pickupAddress: e.target.value })} />
    </label>
    <label className="gw-label">
      Destination
      <input className="gw-input" value={draft.destinationAddress} onChange={(e) => onChange({ destinationAddress: e.target.value })} />
    </label>
    <label className="gw-label">
      Ride purpose
      <select className="gw-input" value={draft.ridePurpose} onChange={(e) => onChange({ ridePurpose: e.target.value as RidePurposeOption })}>
        {PURPOSES.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </label>
    <label className="gw-label">
      Charity/nonprofit (optional)
      <input className="gw-input" placeholder="Example: Hope Community Transit" value={draft.charityName ?? ''} onChange={(e) => onChange({ charityName: e.target.value, charityId: e.target.value ? 'charity-local' : undefined })} />
    </label>
    <button type="button" className="gw-button gw-button-primary w-full" disabled={loading} onClick={onSubmit}>
      Request ride
    </button>
  </div>
);

export default PassengerRideRequestPanel;

