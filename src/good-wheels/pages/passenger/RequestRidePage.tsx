import React, { useMemo } from 'react';
import { MOCK_SUPPORT_CATEGORIES } from '../../data/mock/mockSupportCategories';
import { useTripStore } from '../../features/trips/tripStore';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripSupportCategoryChip from '../../features/trips/components/TripSupportCategoryChip';

const RequestRidePage: React.FC = () => {
  const draft = useTripStore((s) => s.draft);
  const setDraft = useTripStore((s) => s.setDraft);
  const requestRide = useTripStore((s) => s.requestRide);
  const loading = useTripStore((s) => s.loading);
  const error = useTripStore((s) => s.error);

  const purposes = useMemo(
    () => [
      { id: 'normal_ride', label: 'Normal ride' },
      { id: 'school_transport', label: 'School transport' },
      { id: 'medical_visit', label: 'Medical visit' },
      { id: 'family_pickup', label: 'Family pickup' },
      { id: 'shelter_support', label: 'Shelter support' },
      { id: 'elder_assistance', label: 'Elder assistance' },
      { id: 'emergency_support', label: 'Emergency support' },
      { id: 'community_help_errand', label: 'Community help errand' },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Request a Ride</h1>
          <p className="gw-muted">Choose pickup, destination, and an optional assistance category.</p>
        </div>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-5 space-y-4">
          <div className="gw-card-title">Trip details</div>

          <label className="gw-label">
            Pickup
            <input
              className="gw-input"
              placeholder="Enter pickup location"
              value={draft.pickup?.addressLine ?? ''}
              onChange={(e) =>
                setDraft({ pickup: { label: 'Pickup', addressLine: e.target.value } })
              }
            />
          </label>

          <label className="gw-label">
            Destination
            <input
              className="gw-input"
              placeholder="Enter destination"
              value={draft.dropoff?.addressLine ?? ''}
              onChange={(e) =>
                setDraft({ dropoff: { label: 'Destination', addressLine: e.target.value } })
              }
            />
          </label>

          <label className="gw-label">
            Ride purpose
            <select
              className="gw-input"
              value={draft.purpose}
              onChange={(e) => setDraft({ purpose: e.target.value as any })}
            >
              {purposes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="gw-label">
            Assistance category (optional)
            <select
              className="gw-input"
              value={draft.supportCategoryId ?? ''}
              onChange={(e) => setDraft({ supportCategoryId: (e.target.value || undefined) as any })}
            >
              <option value="">None</option>
              {MOCK_SUPPORT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {draft.supportCategoryId && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">Selected category</div>
              {(() => {
                const c = MOCK_SUPPORT_CATEGORIES.find((x) => x.id === draft.supportCategoryId);
                return c ? <TripSupportCategoryChip category={c} /> : null;
              })()}
            </div>
          )}

          {error && <div className="gw-error">{error}</div>}

          <button
            type="button"
            className="gw-button gw-button-primary w-full"
            disabled={loading}
            onClick={() => void requestRide()}
          >
            Confirm request
          </button>
        </div>

        <div className="gw-card p-5 space-y-4">
          <div className="gw-card-title">Estimate</div>
          <div className="gw-muted">
            Real pricing isn’t part of the DPAL Good Wheels foundation yet. This panel is structured for ETA,
            distance, match preview, and safety flags.
          </div>
          <TripMapPanel
            trip={{
              id: 'draft',
              passengerId: 'draft',
              pickup: draft.pickup ?? { label: 'Pickup', addressLine: '—' },
              dropoff: draft.dropoff ?? { label: 'Destination', addressLine: '—' },
              purpose: draft.purpose,
              supportCategoryId: draft.supportCategoryId,
              status: 'draft',
              createdAtIso: new Date().toISOString(),
              updatedAtIso: new Date().toISOString(),
              estimate: { etaMinutes: 12, distanceKm: 4.6 },
              timeline: [],
              safetyStatus: draft.familySafe ? 'family_safe' : 'standard',
            }}
            variant="passenger"
          />
        </div>
      </div>
    </div>
  );
};

export default RequestRidePage;

