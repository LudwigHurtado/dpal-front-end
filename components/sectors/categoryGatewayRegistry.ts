import { Category } from '../../types';
import { educationConfig } from '../categories/education/educationConfig';
import type { CategoryDefinition, CategoryMode, ModeCardCopy } from '../../types/categoryGateway';
import { getCategoryCardImageSrc } from '../../categoryCardAssets';

/** Stable slug for URLs and config lookup (matches Category enum roughly). */
export function categoryToGatewayId(category: Category): string {
  const raw = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return raw || 'other';
}

const defaultModeCards: Record<CategoryMode, ModeCardCopy> = {
  report: {
    title: 'Report',
    explanation: 'Document incidents, evidence, and patterns.',
    examples: ['incidents', 'evidence', 'repeat issues'],
    cta: 'Start report',
  },
  help: {
    title: 'Help',
    explanation: 'Get support or respond to needs.',
    examples: ['resources', 'guidance', 'community care'],
    cta: 'Find help',
  },
  work: {
    title: 'Work',
    explanation: 'Complete missions and earn DPAL coins.',
    examples: ['verify reports', 'collect evidence', 'map issues'],
    cta: 'View missions',
  },
  play: {
    title: 'Play',
    explanation: 'Learn, explore, collect, and engage through missions.',
    examples: ['challenges', 'badges', 'discovery'],
    cta: 'Start play',
  },
};

function buildDefaultDefinition(category: Category, id: string, title: string): CategoryDefinition {
  const heroImage = getCategoryCardImageSrc(category);
  return {
    id,
    title,
    subtitle: `Accountability and transparency for ${title.toLowerCase()}. Choose a mode to continue.`,
    accentColor: '#0F766E',
    heroImage,
    supportedModes: ['report', 'help', 'work', 'play'],
    subcategories: [],
    stats: [
      { label: 'Sector', value: title.slice(0, 18) },
      { label: 'Modes', value: '4' },
      { label: 'Status', value: 'Live' },
    ],
    modes: {
      report: {
        intro: 'File a verified report with evidence.',
        reportTypes: ['general', 'safety', 'service', 'pattern'],
        card: defaultModeCards.report,
      },
      help: {
        intro: 'Request help or offer support in this domain.',
        card: defaultModeCards.help,
      },
      work: {
        intro: 'Take missions to verify and improve community data.',
        card: defaultModeCards.work,
      },
      play: {
        intro: 'Engage with challenges, quizzes, and badge trails.',
        card: defaultModeCards.play,
      },
    },
  };
}

const OVERRIDES: Partial<Record<string, CategoryDefinition>> = {
  education: educationConfig,
};

export function getCategoryDefinition(category: Category, displayTitle: string): CategoryDefinition {
  const id = categoryToGatewayId(category);
  const override = OVERRIDES[id];
  if (override) return { ...override, id };
  return buildDefaultDefinition(category, id, displayTitle);
}
