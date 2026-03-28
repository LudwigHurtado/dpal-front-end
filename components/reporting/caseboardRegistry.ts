/**
 * Caseboard report configuration per category.
 *
 * Categories in CASEBOARD_EXCLUDED_CATEGORIES keep the legacy SubmissionPanel (special flows:
 * allergy deck, escrow/biometric verification). To add a tailored caseboard for a category,
 * add a branch in getCaseboardConfig() or extend the default builder below.
 */
import { Category, EducationRole } from '../../types';
import { categoryToGatewayId, getCategoryDefinition } from '../sectors/categoryGatewayRegistry';
import { CATEGORIES_WITH_ICONS } from '../../constants';

export type CaseboardPath = { label: string; code: string };

export type EducationCaseboardRoleRow = {
  kind: 'education';
  ui: string;
  subtitle: string;
  edu03: string;
  badge: string;
  educationRole: EducationRole;
};

export type GenericCaseboardRoleRow = {
  kind: 'generic';
  ui: string;
  subtitle: string;
  badge: string;
  code: string;
};

export type CaseboardRoleRow = EducationCaseboardRoleRow | GenericCaseboardRoleRow;

export type ExtraSection = 'school' | 'none';

export type CaseboardCategoryConfig = {
  slug: string;
  paths: CaseboardPath[];
  roles: CaseboardRoleRow[];
  chips: readonly string[];
  extraSection: ExtraSection;
  whereHint: string;
  whoHint: string;
  missionSubtitle: string;
};

/** Categories that must stay on SubmissionPanel until those flows are migrated. */
export const CASEBOARD_EXCLUDED_CATEGORIES: readonly Category[] = [
  Category.Allergies,
  Category.P2PEscrowVerification,
  Category.ProofOfLifeBiometric,
];

const EDUCATION_PATHS: CaseboardPath[] = [
  { label: 'Bullying', code: 'Bullying' },
  { label: 'Teacher misconduct', code: 'Staff misconduct' },
  { label: 'Unsafe food', code: 'Food/health' },
  { label: 'Missing resources', code: 'Underfunding' },
  { label: 'Administrative abuse', code: 'Other' },
  { label: 'Unsafe facilities', code: 'Safety hazard' },
];

const EDUCATION_ROLE_ROWS: CaseboardRoleRow[] = [
  { kind: 'education', ui: 'Student', subtitle: 'Learner perspective', edu03: 'Student', badge: 'Student report', educationRole: EducationRole.Student },
  { kind: 'education', ui: 'Parent', subtitle: 'Guardian perspective', edu03: 'Parent', badge: 'Parent report', educationRole: EducationRole.Observer },
  { kind: 'education', ui: 'Teacher', subtitle: 'Instructional staff', edu03: 'Staff', badge: 'Teacher alert', educationRole: EducationRole.Teacher },
  { kind: 'education', ui: 'Staff', subtitle: 'Non-teaching school staff', edu03: 'Staff', badge: 'Staff report', educationRole: EducationRole.Employee },
  { kind: 'education', ui: 'Witness', subtitle: 'Observer / community', edu03: 'Community', badge: 'Witness context', educationRole: EducationRole.Observer },
];

const EDUCATION_CHIPS = [
  'urgent',
  'repeat problem',
  'child involved',
  'health risk',
  'public safety risk',
  'happened today',
  'has proof',
] as const;

const POLICE_PATHS: CaseboardPath[] = [
  { label: 'Use of force', code: 'use-of-force' },
  { label: 'Search or arrest', code: 'search-arrest' },
  { label: 'Bias or profiling', code: 'bias' },
  { label: 'Wrongful detention', code: 'detention' },
  { label: 'Failure to assist', code: 'failure-to-assist' },
  { label: 'Other', code: 'other' },
];

const POLICE_CHIPS = [
  'bodycam mentioned',
  'witnesses',
  'urgent',
  'repeat pattern',
  'has proof',
  'injury involved',
] as const;

const GENERIC_ROLES: CaseboardRoleRow[] = [
  { kind: 'generic', ui: 'Direct witness', subtitle: 'Saw or heard it directly', badge: 'Witness', code: 'witness' },
  { kind: 'generic', ui: 'Involved party', subtitle: 'Personally affected', badge: 'Involved', code: 'involved' },
  { kind: 'generic', ui: 'Reporter', subtitle: 'Third-party report', badge: 'Reporter', code: 'reporter' },
  { kind: 'generic', ui: 'Advocate', subtitle: 'Representing someone else', badge: 'Advocate', code: 'advocate' },
  { kind: 'generic', ui: 'Other', subtitle: 'Other relationship to the incident', badge: 'Other', code: 'other' },
];

const DEFAULT_CHIPS = ['urgent', 'has proof', 'repeat pattern', 'public interest', 'needs follow-up'] as const;

function displayTitle(cat: Category): string {
  return CATEGORIES_WITH_ICONS.find((c) => c.value === cat)?.headline ?? String(cat);
}

function humanizePath(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function defaultPathsForCategory(category: Category): CaseboardPath[] {
  const title = displayTitle(category);
  const def = getCategoryDefinition(category, title);
  const types =
    def.modes.report?.reportTypes?.length && def.modes.report.reportTypes.length > 0
      ? def.modes.report.reportTypes
      : ['general', 'safety', 'service', 'pattern'];
  return types.map((t) => ({
    label: humanizePath(t),
    code: t.replace(/\s+/g, '-').toLowerCase(),
  }));
}

export function shouldUseCaseboard(category: Category): boolean {
  return !CASEBOARD_EXCLUDED_CATEGORIES.includes(category);
}

export function getCaseboardConfig(category: Category): CaseboardCategoryConfig | null {
  if (CASEBOARD_EXCLUDED_CATEGORIES.includes(category)) return null;

  if (category === Category.Education) {
    return {
      slug: 'education',
      paths: EDUCATION_PATHS,
      roles: EDUCATION_ROLE_ROWS,
      chips: EDUCATION_CHIPS,
      extraSection: 'school',
      whereHint: 'School, campus area, or online context',
      whoHint: 'Students, staff, families…',
      missionSubtitle: 'Mission report',
    };
  }

  if (category === Category.PoliceMisconduct) {
    return {
      slug: 'police-misconduct',
      paths: POLICE_PATHS,
      roles: GENERIC_ROLES,
      chips: POLICE_CHIPS,
      extraSection: 'none',
      whereHint: 'Precinct, street, stop location, or online',
      whoHint: 'Officers, civilians, or bystanders affected',
      missionSubtitle: 'Accountability report',
    };
  }

  const slug = categoryToGatewayId(category);
  return {
    slug,
    paths: defaultPathsForCategory(category),
    roles: GENERIC_ROLES,
    chips: DEFAULT_CHIPS,
    extraSection: 'none',
    whereHint: 'Address, place, or online context',
    whoHint: 'People or organizations affected',
    missionSubtitle: 'Case report',
  };
}
