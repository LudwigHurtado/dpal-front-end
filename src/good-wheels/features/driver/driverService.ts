import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import type {
  DriverDashboardPayload,
  DriverPerformanceSummary,
  DriverProfile,
  DriverQueueItem,
  DriverVehicleInfo,
} from './driverTypes';
import type { Trip } from '../trips/tripTypes';
import { mapMockTripToTrip } from '../trips/tripMockMapper';
import { MOCK_USERS } from '../../data/mock/mockUsers';
import { goodWheelsDriverApi } from '../../services/adapters/goodWheelsApi';

const nowIso = () => new Date().toISOString();
const isLikelyDemoQueueTrip = (trip: Trip) => /(^trip-q-|^mock|^demo|^local)/i.test(trip.id);

function makeQueueTrips(): Trip[] {
  const rows: Trip[] = [
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
      estimate: { etaMinutes: 9, distanceKm: 5.1, totalFareCents: 820, currency: 'USD' },
      timeline: [{ id: 'q1', atIso: nowIso(), label: 'Request available', detail: 'Family-safe pickup requested.' }],
      routeSummary: { distanceKm: 5.1, durationMinutes: 14, previewSteps: ['Head east', 'Arrive at school entrance'] },
      offerState: {
        passengerOfferCents: 820,
        recommendedFareCents: 820,
        status: 'passenger_offered',
        updatedAtIso: nowIso(),
      },
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
      estimate: { etaMinutes: 6, distanceKm: 3.0, totalFareCents: 640, currency: 'USD' },
      timeline: [{ id: 'q2', atIso: nowIso(), label: 'Request available', detail: 'Medical transport category selected.' }],
      routeSummary: { distanceKm: 3.0, durationMinutes: 10, previewSteps: ['Merge onto 4th Ave', 'Arrive at pharmacy'] },
      offerState: {
        passengerOfferCents: 640,
        recommendedFareCents: 640,
        status: 'passenger_offered',
        updatedAtIso: nowIso(),
      },
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
      estimate: { etaMinutes: 12, distanceKm: 7.2, totalFareCents: 1050, currency: 'USD' },
      timeline: [{ id: 'q3', atIso: nowIso(), label: 'Request available', detail: 'Worker may attach after acceptance.' }],
      routeSummary: { distanceKm: 7.2, durationMinutes: 18, previewSteps: ['Head south', 'Arrive at housing office'] },
      offerState: {
        passengerOfferCents: 1050,
        recommendedFareCents: 1050,
        status: 'passenger_offered',
        updatedAtIso: nowIso(),
      },
    },
  ];
  return [...rows].sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''));
}

type RawDashboard = Awaited<ReturnType<typeof goodWheelsDriverApi.fetchDriverDashboard>>;

function mapDriverDashboard(raw: RawDashboard): DriverDashboardPayload {
  return {
    driver: {
      id: raw.driver.id,
      fullName: raw.driver.fullName,
      isVerifiedDriver: raw.driver.isVerifiedDriver,
      isVerifiedVehicle: raw.driver.isVerifiedVehicle,
      availability: raw.driver.availability as DriverProfile['availability'],
    },
    availability: raw.availability,
    activeTrip: raw.activeTrip ? mapMockTripToTrip(raw.activeTrip) : null,
    pendingDeals: (raw.pendingDeals ?? []).map(mapMockTripToTrip),
    counteredDeals: (raw.counteredDeals ?? []).map(mapMockTripToTrip),
    availableRequests: (raw.availableRequests ?? []).map(mapMockTripToTrip),
    recentCompletedTrips: (raw.recentCompletedTrips ?? []).map(mapMockTripToTrip),
    summary: raw.summary,
  };
}

export const driverService = {
  async fetchDriverProfile(driverId?: string): Promise<DriverProfile> {
    if (!GOOD_WHEELS_DEMO_MODE) return goodWheelsDriverApi.fetchProfile(driverId || MOCK_USERS.driver.id);
    const u = MOCK_USERS.driver;
    return {
      id: u.id,
      fullName: u.fullName,
      isVerifiedDriver: u.trust.verifiedDriver === 'verified',
      isVerifiedVehicle: u.trust.verifiedVehicle === 'verified',
    };
  },

  async fetchDriverDashboard(driverId?: string): Promise<DriverDashboardPayload> {
    const id = driverId || MOCK_USERS.driver.id;
    if (GOOD_WHEELS_DEMO_MODE) {
      const available = makeQueueTrips();
      const u = MOCK_USERS.driver;
      return {
        driver: {
          id: u.id,
          fullName: u.fullName,
          isVerifiedDriver: u.trust.verifiedDriver === 'verified',
          isVerifiedVehicle: u.trust.verifiedVehicle === 'verified',
          availability: 'online',
        },
        availability: 'online',
        activeTrip: null,
        pendingDeals: [],
        counteredDeals: [],
        availableRequests: available,
        recentCompletedTrips: [],
        summary: {
          availableCount: available.length,
          pendingDealCount: 0,
          activeTripStatus: null,
          completedToday: 0,
          completedTrips: 0,
        },
      };
    }
    const raw = await goodWheelsDriverApi.fetchDriverDashboard(id);
    return mapDriverDashboard(raw);
  },

  async fetchDriverQueue(driverId?: string): Promise<DriverQueueItem[]> {
    if (GOOD_WHEELS_DEMO_MODE) return makeQueueTrips();
    const id = driverId || MOCK_USERS.driver.id;
    const queue = await goodWheelsDriverApi.fetchQueue(id);
    return queue
      .filter((trip) => !isLikelyDemoQueueTrip(trip))
      .sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''));
  },

  async fetchDriverHistory(driverId?: string): Promise<DriverQueueItem[]> {
    if (!GOOD_WHEELS_DEMO_MODE) return goodWheelsDriverApi.fetchHistory(driverId || MOCK_USERS.driver.id);
    return [];
  },

  async updateDriverAvailability(status: 'online' | 'paused' | 'offline' | 'busy' = 'online', driverId?: string): Promise<void> {
    if (!GOOD_WHEELS_DEMO_MODE) {
      await goodWheelsDriverApi.updateAvailability(driverId || MOCK_USERS.driver.id, status);
    }
  },

  async fetchVehicleInfo(driverId?: string): Promise<DriverVehicleInfo> {
    if (!GOOD_WHEELS_DEMO_MODE) return goodWheelsDriverApi.fetchVehicle(driverId || MOCK_USERS.driver.id);
    return {
      id: 'veh-001',
      makeModel: 'Toyota Camry (2018)',
      plateMasked: '•••-1842',
      seats: 4,
      accessibilityReady: false,
      verification: 'verified',
      color: '#EAB308',
      colorName: 'Yellow',
      vehicleType: 'car',
    };
  },

  async fetchPerformanceSummary(driverId?: string): Promise<DriverPerformanceSummary> {
    if (!GOOD_WHEELS_DEMO_MODE) return goodWheelsDriverApi.fetchPerformance(driverId || MOCK_USERS.driver.id);
    return {
      rating: 4.9,
      completedTrips: 18,
      responseTimeSeconds: 42,
      trustScore: 95,
      safetyCompliance: 'good',
    };
  },
};
