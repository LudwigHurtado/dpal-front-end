import React, { useMemo } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './guards/ProtectedRoute';
import RoleSelectPage from '../pages/auth/RoleSelectPage';
import SignInPage from '../pages/auth/SignInPage';
import HomePage from '../pages/public/HomePage';
import PassengerDashboardPage from '../pages/passenger/PassengerDashboardPage';
import RequestRidePage from '../pages/passenger/RequestRidePage';
import NotFoundPage from '../pages/shared/NotFoundPage';
import RoleProtectedRoute from './guards/RoleProtectedRoute';
import { GW_PATHS } from './paths';

/**
 * Foundation router:
 * - Uses MemoryRouter so it can be embedded inside the existing DPAL app without requiring DPAL to adopt RR today.
 * - When Good Wheels becomes standalone, swap to createBrowserRouter + RouterProvider with the same route objects.
 */
export default function AppRouter(): React.ReactElement {
  const router = useMemo(() => {
    const routes = [
      {
        element: <PublicLayout />,
        children: [
          { path: GW_PATHS.public.home, element: <HomePage /> },
          { path: GW_PATHS.auth.signIn, element: <SignInPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: GW_PATHS.auth.roleSelect, element: <RoleSelectPage /> },
          {
            element: <AppLayout />,
            children: [
              { path: '/app', element: <Navigate to={GW_PATHS.auth.roleSelect} replace /> },
              {
                element: <RoleProtectedRoute role="passenger" />,
                children: [
                  { path: GW_PATHS.passenger.dashboard, element: <PassengerDashboardPage /> },
                  { path: GW_PATHS.passenger.request, element: <RequestRidePage /> },
                ],
              },
            ],
          },
        ],
      },
    ];
    return createMemoryRouter(routes, { initialEntries: [GW_PATHS.public.home] });
  }, []);

  return <RouterProvider router={router} />;
}

