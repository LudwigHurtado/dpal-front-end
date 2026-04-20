export type MonitoringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'custom';

export type CheckStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface MonitoringCheck {
  id: string;
  projectId: string;
  projectTitle: string;
  scheduledDate: string;
  completedDate?: string;
  status: CheckStatus;
  assignedTo?: string;
  notes?: string;
  evidenceIds: string[];
  findings?: string;
}

export interface MonitoringSchedule {
  id: string;
  projectId: string;
  frequency: MonitoringFrequency;
  nextCheckDate: string;
  lastCheckDate?: string;
  totalChecks: number;
  completedChecks: number;
}

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
};
