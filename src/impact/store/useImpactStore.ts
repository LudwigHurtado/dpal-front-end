import { create } from 'zustand';
import type { ImpactProject } from '../types/project';
import type { ImpactEvidence } from '../types/evidence';
import type { VerificationReview } from '../types/verification';
import type { ImpactClaim } from '../types/claim';
import type { MonitoringCheck } from '../types/monitoring';
import * as projectSvc from '../services/impactProjectService';
import * as evidenceSvc from '../services/impactEvidenceService';
import * as verifSvc from '../services/impactVerificationService';
import * as claimsSvc from '../services/impactClaimsService';
import * as monitorSvc from '../services/impactMonitoringService';

interface ImpactState {
  projects: ImpactProject[];
  evidence: ImpactEvidence[];
  reviews: VerificationReview[];
  claims: ImpactClaim[];
  checks: MonitoringCheck[];
  selectedProjectId: string | null;
  loading: boolean;
  error: string | null;

  hydrate(): Promise<void>;
  selectProject(id: string | null): void;
  refreshProject(id: string): Promise<void>;
  loadEvidenceForProject(projectId: string): Promise<void>;
  loadChecksForProject(projectId: string): Promise<void>;
  loadClaimsForProject(projectId: string): Promise<void>;
}

export const useImpactStore = create<ImpactState>((set, get) => ({
  projects: [],
  evidence: [],
  reviews: [],
  claims: [],
  checks: [],
  selectedProjectId: null,
  loading: false,
  error: null,

  async hydrate() {
    set({ loading: true, error: null });
    try {
      const [projects, reviews] = await Promise.all([
        projectSvc.listProjects(),
        verifSvc.listReviews(),
      ]);
      set({ projects, reviews, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  selectProject(id) {
    set({ selectedProjectId: id });
  },

  async refreshProject(id) {
    const p = await projectSvc.getProject(id);
    if (!p) return;
    set((s) => ({
      projects: s.projects.map((x) => (x.id === id ? p : x)),
    }));
  },

  async loadEvidenceForProject(projectId) {
    const evidence = await evidenceSvc.listEvidence(projectId);
    set((s) => {
      const other = s.evidence.filter((e) => e.projectId !== projectId);
      return { evidence: [...other, ...evidence] };
    });
  },

  async loadChecksForProject(projectId) {
    const checks = await monitorSvc.listChecks(projectId);
    set((s) => {
      const other = s.checks.filter((c) => c.projectId !== projectId);
      return { checks: [...other, ...checks] };
    });
  },

  async loadClaimsForProject(projectId) {
    const claims = await claimsSvc.listClaims(projectId);
    set((s) => {
      const other = s.claims.filter((c) => c.projectId !== projectId);
      return { claims: [...other, ...claims] };
    });
  },
}));
