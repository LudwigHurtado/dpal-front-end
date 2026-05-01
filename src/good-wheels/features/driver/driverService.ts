import type {
  DriverDashboardPayload,
  DriverPerformanceSummary,
  DriverProfile,
  DriverQueueItem,
  DriverVehicleInfo,
} from './driverTypes';
import { mapApiTripToTrip } from '../trips/apiTripMapper';
import { goodWheelsDriverApi } from '../../services/adapters/goodWheelsApi';

type RawDashboard = Awaited<ReturnType<typeof goodWheelsDriverApi.fetchDriverDashboard>>;

function mapDriverDashboard(raw: RawDashboard): DriverDashboardPayload {
  const availableRequests = (raw.availableRequests ?? []).map(mapApiTripToTrip);
  const pendingDeals = (raw.pendingDeals ?? []).map(mapApiTripToTrip);
  const counteredDeals = (raw.counteredDeals ?? []).map(mapApiTripToTrip);
  const activeTrip = raw.activeTrip ? mapApiTripToTrip(raw.activeTrip) : null;
  const recentCompletedTrips = (raw.recentCompletedTrips ?? []).map(mapApiTripToTrip);
  return {
    driver: {
      id: raw.driver.id,
      fullName: raw.driver.fullName,
      isVerifiedDriver: raw.driver.isVerifiedDriver,
      isVerifiedVehicle: raw.driver.isVerifiedVehicle,
      availability: raw.driver.availability as DriverProfile['availability'],
    },
    availability: raw.availability,
    activeTrip,
    pendingDeals,
    counteredDeals,
    availableRequests,
    recentCompletedTrips,
    summary: {
      ...raw.summary,
      availableCount: availableRequests.length,
      pendingDealCount: pendingDeals.length,
      activeTripStatus: activeTrip ? raw.summary.activeTripStatus : null,
    },
  };
}

function requireDriverId(driverId?: string): string {
  if (!driverId) throw new Error('Driver ID is required.');
  return driverId;
}

export const driverService = {
  async fetchDriverProfile(driverId?: string): Promise<DriverProfile> {
    return goodWheelsDriverApi.fetchProfile(requireDriverId(driverId));
  },

  async fetchDriverDashboard(driverId?: string): Promise<DriverDashboardPayload> {
    const raw = await goodWheelsDriverApi.fetchDriverDashboard(requireDriverId(driverId));
    return mapDriverDashboard(raw);
  },

  async fetchDriverQueue(driverId?: string): Promise<DriverQueueItem[]> {
    const id = requireDriverId(driverId);
    const queue = await goodWheelsDriverApi.fetchQueue(id);
    return queue.sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''));
  },

  async fetchDriverHistory(driverId?: string): Promise<DriverQueueItem[]> {
    return goodWheelsDriverApi.fetchHistory(requireDriverId(driverId));
  },

  async updateDriverAvailability(status: 'online' | 'paused' | 'offline' | 'busy' = 'online', driverId?: string): Promise<void> {
    await goodWheelsDriverApi.updateAvailability(requireDriverId(driverId), status);
  },

  async fetchVehicleInfo(driverId?: string): Promise<DriverVehicleInfo> {
    return goodWheelsDriverApi.fetchVehicle(requireDriverId(driverId));
  },

  async fetchPerformanceSummary(driverId?: string): Promise<DriverPerformanceSummary> {
    return goodWheelsDriverApi.fetchPerformance(requireDriverId(driverId));
  },
};
