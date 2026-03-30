import React, { useEffect, useMemo, useState } from 'react';
import { MOCK_SUPPORT_CATEGORIES } from '../../data/mock/mockSupportCategories';
import { useTripStore } from '../../features/trips/tripStore';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripSupportCategoryChip from '../../features/trips/components/TripSupportCategoryChip';
import { useGoogleMaps } from '../../features/map/useGoogleMaps';

const RequestRidePage: React.FC = () => {
  const draft = useTripStore((s) => s.draft);
  const setDraft = useTripStore((s) => s.setDraft);
  const requestRide = useTripStore((s) => s.requestRide);
  const loading = useTripStore((s) => s.loading);
  const error = useTripStore((s) => s.error);
  const [pinMode, setPinMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [pickupLocationNote, setPickupLocationNote] = useState<string | null>(null);
  const { google: g } = useGoogleMaps();
  const [pickupPredictions, setPickupPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [dropoffPredictions, setDropoffPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  const setPickupFromGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocatingPickup(true);
    setPickupLocationNote('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (!g) {
          setDraft({
            pickup: {
              label: 'My Location',
              addressLine: fallbackAddress,
              point: { lat, lng },
            },
          });
          setPickupLocationNote(`Using GPS coordinates: ${fallbackAddress}`);
          setLocatingPickup(false);
          return;
        }

        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const resolvedAddress =
            status === 'OK' && results && results[0]?.formatted_address
              ? results[0].formatted_address
              : fallbackAddress;
          setDraft({
            pickup: {
              label: 'My Location',
              addressLine: resolvedAddress,
              point: { lat, lng },
            },
          });
          setPickupLocationNote(`GPS location set: ${resolvedAddress}`);
          setLocatingPickup(false);
        });
      },
      () => {
        setPickupLocationNote('Could not get your GPS location. You can still type your address.');
        setLocatingPickup(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

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

  const fetchPredictions = (
    input: string,
    cb: (items: google.maps.places.AutocompletePrediction[]) => void
  ) => {
    if (!g || !input.trim()) {
      cb([]);
      return;
    }
    const svc = new g.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      {
        input,
        componentRestrictions: undefined,
      },
      (preds, status) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !preds) {
          cb([]);
          return;
        }
        cb(preds.slice(0, 5));
      }
    );
  };

  const applyPrediction = (
    prediction: google.maps.places.AutocompletePrediction,
    mode: 'pickup' | 'dropoff'
  ) => {
    if (!g) return;
    const placeSvc = new g.maps.places.PlacesService(document.createElement('div'));
    placeSvc.getDetails({ placeId: prediction.place_id }, (place, status) => {
      const loc = place?.geometry?.location;
      const lat = loc?.lat();
      const lng = loc?.lng();
      const addressLine = place?.formatted_address || prediction.description;
      if (mode === 'pickup') {
        setDraft({
          pickup: {
            label: 'Pickup',
            addressLine,
            point: typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : draft.pickup?.point,
          },
        });
        setPickupPredictions([]);
      } else {
        setDraft({
          dropoff: {
            label: 'Dropoff',
            addressLine,
            point: typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : draft.dropoff?.point,
          },
        });
        setDropoffPredictions([]);
      }
    });
  };

  useEffect(() => {
    if (draft.pickup?.point) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setPickupFromGeolocation();
  }, [draft.pickup?.point, setDraft, g]);

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
          <div className="gw-card p-4 space-y-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.65)' }}>
            <label className="gw-label">
              Pickup address
              <input
                className="gw-input"
                placeholder="Enter pickup location"
                value={draft.pickup?.addressLine ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ pickup: { label: 'Pickup', addressLine: v, point: draft.pickup?.point } });
                  fetchPredictions(v, setPickupPredictions);
                }}
              />
            </label>
            {pickupPredictions.length > 0 && (
              <div className="gw-card p-2" style={{ boxShadow: 'none' }}>
                <div className="space-y-1">
                  {pickupPredictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-100 text-sm"
                      onClick={() => applyPrediction(p, 'pickup')}
                    >
                      {p.description}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="gw-button gw-button-secondary"
                disabled={locatingPickup}
                onClick={setPickupFromGeolocation}
              >
                {locatingPickup ? 'Getting GPS…' : 'Use my GPS location'}
              </button>
              <button
                type="button"
                className={pinMode === 'pickup' ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
                onClick={() => setPinMode((p) => (p === 'pickup' ? null : 'pickup'))}
              >
                {pinMode === 'pickup' ? 'Tap map for pickup…' : 'Pick pickup on map'}
              </button>
            </div>

            <label className="gw-label">
              Dropoff address
              <input
                className="gw-input"
                placeholder="Enter dropoff location"
                value={draft.dropoff?.addressLine ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ dropoff: { label: 'Destination', addressLine: v, point: draft.dropoff?.point } });
                  fetchPredictions(v, setDropoffPredictions);
                }}
              />
            </label>
            {dropoffPredictions.length > 0 && (
              <div className="gw-card p-2" style={{ boxShadow: 'none' }}>
                <div className="space-y-1">
                  {dropoffPredictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-100 text-sm"
                      onClick={() => applyPrediction(p, 'dropoff')}
                    >
                      {p.description}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={pinMode === 'dropoff' ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
                onClick={() => setPinMode((p) => (p === 'dropoff' ? null : 'dropoff'))}
              >
                {pinMode === 'dropoff' ? 'Tap map for dropoff…' : 'Pick dropoff on map'}
              </button>
            </div>
            {pickupLocationNote && <div className="text-xs font-bold text-slate-500">{pickupLocationNote}</div>}
            <div className="text-xs font-bold text-slate-600">
              Red marker = pickup (A), Green marker = dropoff (B), Yellow line = route.
            </div>
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

