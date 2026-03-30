import type { Trip } from '../../types/ride';

const nowIso = () => new Date().toISOString();

export const MOCK_TRIPS: { active: Trip; history: Trip[] } = {
  active: {
    id: 'trip-1001',
    passengerId: 'usr-passenger-001',
    driverId: 'usr-driver-001',
    pickup: { label: 'Home', addressLine: '123 Oak St' },
    dropoff: { label: 'Clinic', addressLine: 'Central Park Medical, 4th Ave' },
    purpose: 'medical_visit',
    supportCategoryId: 'medical_transport',
    status: 'driver_en_route',
    createdAtIso: nowIso(),
    updatedAtIso: nowIso(),
    estimate: { etaMinutes: 6, distanceKm: 3.2 },
    timeline: [
      { id: 'e1', atIso: nowIso(), label: 'Ride requested', detail: 'Looking for a verified driver' },
      { id: 'e2', atIso: nowIso(), label: 'Driver matched', detail: 'Jordan is on the way' },
    ],
  },
  history: [
    {
      id: 'trip-0990',
      passengerId: 'usr-passenger-001',
      driverId: 'usr-driver-001',
      pickup: { label: 'School', addressLine: 'Ridgeview Elementary' },
      dropoff: { label: 'Home', addressLine: '123 Oak St' },
      purpose: 'school_transport',
      status: 'completed',
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
      estimate: { etaMinutes: 14, distanceKm: 7.8 },
      timeline: [{ id: 'h1', atIso: nowIso(), label: 'Trip completed', detail: 'Family-safe handoff confirmed' }],
    },
  ],
};

