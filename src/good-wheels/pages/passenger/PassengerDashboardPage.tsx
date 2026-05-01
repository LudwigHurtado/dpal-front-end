import React from 'react';
import PassengerLocationPicker from '../../features/passenger/components/PassengerLocationPicker';

/**
 * Passenger first screen after sign-in.
 *
 * Per product direction: ONLY the map + pickup/drop-off inputs.
 * Active trip details, ride history, support categories, charity discovery, etc.
 * are all reachable from the three-line menu (`AppLayout.tsx`) — they must NOT
 * appear on the dashboard.
 *
 * Hydrating the trip store / polling lives on the active-trip page now, not here.
 * Removing it from this page stops the 6-second `loading` flicker that briefly
 * flashed a "Loading…" card under the map on every poll.
 */
const PassengerDashboardPage: React.FC = () => <PassengerLocationPicker />;

export default PassengerDashboardPage;
