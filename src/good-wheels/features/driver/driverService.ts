import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import type { DriverPerformanceSummary, DriverProfile, DriverQueueItem, DriverVehicleInfo } from './driverTypes';
import type { Trip } from '../trips/tripTypes';
import { MOCK_USERS } from '../../data/mock/mockUsers';

const nowIso = () => new Date().toISOString();

function makeQueueTrips(): Trip[] {
  return [
    {
      id: 'trip-q-2001',
      passengerId: 'usr-passenger-001',
      pickup: { label: 'Home', addressLine: '88 Willow Ln' },
      dropoff: { label: 'School', addressLine: 'Ridgeview Elementary' },
      purpose: 'school_transport',
      supportCategoryId: 'school_ride',
      status: 'matched',
      safetyStatus: 'family_safe',
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
      estimate: { etaMinutes: 9, distanceKm: 5.1 },
      timeline: [{ id: 'q1', atIso: nowIso(), label: 'Request available', detail: 'Family-safe pickup requested.' }],
      routeSummary: { distanceKm: 5.1, durationMinutes: 14, previewSteps: ['Head east', 'Arrive at school entrance'] },
    },
    {
      id: 'trip-q-2002',
      passengerId: 'usr-passenger-001',
      pickup: { label: 'Clinic', addressLine: 'Central Park Medical, 4th Ave' },
      dropoff: { label: 'Pharmacy', addressLine: 'Sunrise Pharmacy' },
      purpose: 'medical_visit',
      supportCategoryId: 'medical_transport',
      status: 'matched',
      safetyStatus: 'standard',
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
      estimate: { etaMinutes: 6, distanceKm: 3.0 },
      timeline: [{ id: 'q2', atIso: nowIso(), label: 'Request available', detail: 'Medical transport category selected.' }],
      routeSummary: { distanceKm: 3.0, durationMinutes: 10, previewSteps: ['Merge onto 4th Ave', 'Arrive at pharmacy'] },
    },
    {
      id: 'trip-q-2003',
      passengerId: 'usr-passenger-001',
      pickup: { label: 'Shelter', addressLine: 'Community Shelter, Pine St' },
      dropoff: { label: 'Housing Office', addressLine: 'City Housing Services' },
      purpose: 'shelter_support',
      supportCategoryId: 'shelter_support',
      status: 'matched',
      safetyStatus: 'needs_attention',
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
      estimate: { etaMinutes: 12, distanceKm: 7.2 },
      timeline: [{ id: 'q3', atIso: nowIso(), label: 'Request available', detail: 'Worker may attach after acceptance.' }],
      routeSummary: { distanceKm: 7.2, durationMinutes: 18, previewSteps: ['Head south', 'Arrive at housing office'] },
    },
  ];
}

export const driverService = {
  async fetchDriverProfile(): Promise<DriverProfile> {
    // demo-only for now
    void GOOD_WHEELS_DEMO_MODE;
    const u = MOCK_USERS.driver;
    return {
      id: u.id,
      fullName: u.fullName,
      isVerifiedDriver: u.trust.verifiedDriver === 'verified',
      isVerifiedVehicle: u.trust.verifiedVehicle === 'verified',
    };
  },
  async fetchDriverQueue(): Promise<DriverQueueItem[]> {
    void GOOD_WHEELS_DEMO_MODE;
    return makeQueueTrips();
  },
  async fetchDriverHistory(): Promise<DriverQueueItem[]> {
    void GOOD_WHEELS_DEMO_MODE;
    return [];
  },
  async updateDriverAvailability(): Promise<void> {
    void GOOD_WHEELS_DEMO_MODE;
  },
  async fetchVehicleInfo(): Promise<DriverVehicleInfo> {
    void GOOD_WHEELS_DEMO_MODE;
    return {
      id: 'veh-001',
      makeModel: 'Toyota Camry (2018)',
      plateMasked: '•••-1842',
      seats: 4,
      accessibilityReady: false,
      verification: 'verified',
    };
  },
  async fetchPerformanceSummary(): Promise<DriverPerformanceSummary> {
    void GOOD_WHEELS_DEMO_MODE;
    return {
      rating: 4.9,
      completedTrips: 18,
      responseTimeSeconds: 42,
      trustScore: 95,
      safetyCompliance: 'good',
    };
  },
};

