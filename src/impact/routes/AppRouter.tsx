import React from 'react';
import { createMemoryRouter, RouterProvider, Navigate } from 'react-router-dom';
import { IM_PATHS } from './paths';
import ImpactLayout from '../layouts/ImpactLayout';
import ImpactHubPage from '../pages/ImpactHubPage';
import ProjectsListPage from '../pages/ProjectsListPage';
import ProjectCreatePage from '../pages/ProjectCreatePage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import EvidencePage from '../pages/EvidencePage';
import MonitoringPage from '../pages/MonitoringPage';
import VerificationQueuePage from '../pages/VerificationQueuePage';
import ClaimsPage from '../pages/ClaimsPage';
import LedgerPage from '../pages/LedgerPage';

const router = createMemoryRouter([
  {
    path: '/',
    element: <ImpactLayout />,
    children: [
      { index: true, element: <ImpactHubPage /> },
      { path: 'projects', element: <ProjectsListPage /> },
      { path: 'projects/create', element: <ProjectCreatePage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'evidence', element: <EvidencePage /> },
      { path: 'monitoring', element: <MonitoringPage /> },
      { path: 'verification', element: <VerificationQueuePage /> },
      { path: 'claims', element: <ClaimsPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const ImpactAppRouter: React.FC = () => <RouterProvider router={router} />;

export default ImpactAppRouter;
