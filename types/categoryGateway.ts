/** Config-driven category gateway + four modes (report / help / work / play). */

export type CategoryMode = 'report' | 'help' | 'work' | 'play';

export type CategorySubcategory = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
};

export type ModeCardExample = { text: string };

export type ModeCardCopy = {
  title: string;
  explanation: string;
  examples: [string, string, string];
  cta: string;
};

export type ReportModeConfig = {
  intro: string;
  reportTypes: string[];
  card?: ModeCardCopy;
};

export type HelpModeConfig = {
  intro: string;
  card?: ModeCardCopy;
};

export type WorkModeConfig = {
  intro: string;
  card?: ModeCardCopy;
};

export type PlayModeConfig = {
  intro: string;
  card?: ModeCardCopy;
};

export type CategoryDefinition = {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  heroImage: string;
  icon?: string;
  supportedModes: CategoryMode[];
  subcategories: CategorySubcategory[];
  modes: {
    report?: ReportModeConfig;
    help?: HelpModeConfig;
    work?: WorkModeConfig;
    play?: PlayModeConfig;
  };
  /** Optional stats for gateway strip */
  stats?: { label: string; value: string }[];
};

/** Evidence / case-building draft (card-based builder). */
export type ReportDraft = {
  categoryId: string;
  reportTypeId: string;
  roleId?: string;
  title?: string;
  summary?: string;
  location?: LocationData;
  time?: TimeData;
  evidence: EvidenceItem[];
  tags: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affectedParties?: string[];
  repeated?: boolean;
  patternNotes?: string;
  status: 'draft' | 'submitted';
};

export type LocationData = { label?: string; lat?: number; lng?: number; address?: string };
export type TimeData = { iso?: string; approximate?: string };
export type EvidenceItem = { id: string; kind: 'image' | 'video' | 'audio' | 'document' | 'note'; ref?: string; note?: string };

export type HelpDraft = {
  categoryId: string;
  helpDirection: 'request' | 'offer';
  helpTypeId: string;
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  summary?: string;
  location?: LocationData;
  availability?: string;
  requestedItems?: string[];
  supportNotes?: string;
  status: 'draft' | 'submitted' | 'matched';
};

export type WorkMission = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  missionType: 'verify' | 'collect' | 'classify' | 'update' | 'assist';
  rewardCoins: number;
  rewardXp?: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  requirements: string[];
  status: 'open' | 'accepted' | 'submitted' | 'verified' | 'closed';
};

export type PlayActivity = {
  id: string;
  categoryId: string;
  title: string;
  activityType: 'quiz' | 'hunt' | 'collection' | 'challenge' | 'streak';
  rewardCoins?: number;
  rewardXp?: number;
  badgeId?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
};

export type DPALFlowState = {
  categoryId?: string;
  activeMode?: CategoryMode;
  activeSubcategoryId?: string;
  reportDraft?: ReportDraft;
  helpDraft?: HelpDraft;
  activeMissionId?: string;
  activePlayId?: string;
};
