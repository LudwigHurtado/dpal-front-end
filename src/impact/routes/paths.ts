export const IM_PATHS = {
  root: '/',
  hub: '/',
  projects: '/projects',
  projectCreate: '/projects/create',
  projectDetail: (id = ':id') => `/projects/${id}`,
  evidence: '/evidence',
  monitoring: '/monitoring',
  verification: '/verification',
  claims: '/claims',
  ledger: '/ledger',
} as const;
