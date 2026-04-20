import type { ImpactProject } from '../types/project';
import { MOCK_PROJECTS } from '../data/mock/mockProjects';
import { IMPACT_DEMO_MODE } from '../app/appConfig';

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listProjects(): Promise<ImpactProject[]> {
  await delay();
  return [...MOCK_PROJECTS];
}

export async function getProject(id: string): Promise<ImpactProject | null> {
  await delay(200);
  return MOCK_PROJECTS.find((p) => p.id === id) ?? null;
}

export async function createProject(
  data: Omit<ImpactProject, 'id' | 'createdAt' | 'updatedAt' | 'evidenceCount' | 'monitoringCheckCount' | 'claimsCount'>
): Promise<ImpactProject> {
  await delay(600);
  const project: ImpactProject = {
    ...data,
    id: `proj-${Date.now()}`,
    evidenceCount: 0,
    monitoringCheckCount: 0,
    claimsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (IMPACT_DEMO_MODE) {
    MOCK_PROJECTS.unshift(project);
  }
  return project;
}

export async function updateProjectStatus(id: string, status: ImpactProject['status']): Promise<void> {
  await delay(300);
  if (IMPACT_DEMO_MODE) {
    const p = MOCK_PROJECTS.find((x) => x.id === id);
    if (p) {
      p.status = status;
      p.updatedAt = new Date().toISOString();
    }
  }
}
