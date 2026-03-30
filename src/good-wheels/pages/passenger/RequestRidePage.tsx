import React, { useEffect, useMemo, useState } from 'react';
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
  const [pinMode, setPinMode] = useState<'pickup' | 'dropoff' | null>(null);

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

  useEffect(() => {
    if (draft.pickup?.point) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraft({
          pickup: {
            label: 'Current Location',
            addressLine: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            point: { lat, lng },
          },
        });
      },
      () => {
        // Ignore denial; user can pin manually.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [draft.pickup?.point, setDraft]);

  return (
    <div className="space-y-8 gw-request-page">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Request a Ride</h1>
          <p className="gw-muted">Choose pickup, destination, and an optional assistance category.</p>
        </div>
      </div>

      <div className="gw-grid-2 gw-request-grid">
        <div className="gw-card p-5 space-y-4 gw-request-estimate">
          <div className="gw-card-title">Live map</div>
          <div className="gw-muted">
            Your location, nearby cars, and route to destination.
          </div>
          <TripMapPanel
            trip={{
              id: 'draft',
              passengerId: 'draft',
              pickup: draft.pickup ?? { label: 'Pickup', addressLine: '—' },
              dropoff: draft.dropoff ?? { label: 'Destination', addressLine: '—' },
              purpose: draft.purpose,
              supportCategoryId: draft.supportCategoryId,
              status: 'requested',
              createdAtIso: new Date().toISOString(),
              updatedAtIso: new Date().toISOString(),
              estimate: { etaMinutes: 12, distanceKm: 4.6 },
              timeline: [],
              safetyStatus: draft.familySafe ? 'family_safe' : 'standard',
            }}
            variant="passenger"
            pinMode={pinMode}
            onPinSelect={({ lat, lng, addressLine, mode }) => {
              if (mode === 'pickup') {
                setDraft({ pickup: { label: 'Pickup Pin', addressLine, point: { lat, lng } } });
              } else {
                setDraft({ dropoff: { label: 'Dropoff Pin', addressLine, point: { lat, lng } } });
              }
              setPinMode(null);
            }}
          />
        </div>

        <div className="gw-card p-5 space-y-4 gw-request-form">
          <div className="gw-card-title">Trip details</div>

          <label className="gw-label">
            Pickup
            <input
              className="gw-input"
              placeholder="Enter pickup location"
              value={draft.pickup?.addressLine ?? ''}
              onChange={(e) =>
                setDraft({ pickup: { label: 'Pickup', addressLine: e.target.value, point: draft.pickup?.point } })
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
                setDraft({ dropoff: { label: 'Destination', addressLine: e.target.value, point: draft.dropoff?.point } })
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={pinMode === 'pickup' ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
              onClick={() => setPinMode((p) => (p === 'pickup' ? null : 'pickup'))}
            >
              {pinMode === 'pickup' ? 'Stop pin pickup' : 'Pin pickup on map'}
            </button>
            <button
              type="button"
              className={pinMode === 'dropoff' ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
              onClick={() => setPinMode((p) => (p === 'dropoff' ? null : 'dropoff'))}
            >
              {pinMode === 'dropoff' ? 'Stop pin dropoff' : 'Pin dropoff on map'}
            </button>
          </div>

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
      </div>
    </div>
  );
};

export default RequestRidePage;

