import type { CategoryDefinition } from '../../../types/categoryGateway';

export const educationConfig: CategoryDefinition = {
  id: 'education',
  title: 'Education Watch',
  subtitle: 'Protect students, improve schools, and build trusted education records.',
  accentColor: '#3B82F6',
  heroImage: '/category-cards/education.png',
  icon: '🎓',
  supportedModes: ['report', 'help', 'work', 'play'],
  stats: [
    { label: 'Subcategories', value: '6' },
    { label: 'Modes', value: '4' },
    { label: 'Focus', value: 'Safety & equity' },
  ],
  subcategories: [
    { id: 'bullying', label: 'Bullying' },
    { id: 'teacher-misconduct', label: 'Teacher Misconduct' },
    { id: 'unsafe-food', label: 'Unsafe Food' },
    { id: 'unsafe-facilities', label: 'Unsafe Facilities' },
    { id: 'missing-resources', label: 'Missing Resources' },
    { id: 'admin-abuse', label: 'Administrative Abuse' },
  ],
  modes: {
    report: {
      intro: 'Document school-related issues with evidence and context.',
      reportTypes: [
        'bullying',
        'teacher-misconduct',
        'unsafe-food',
        'unsafe-facilities',
        'missing-resources',
        'admin-abuse',
      ],
      card: {
        title: 'Report',
        explanation: 'Document incidents, evidence, and patterns.',
        examples: ['bullying', 'food safety', 'teacher misconduct'],
        cta: 'Start report',
      },
    },
    help: {
      intro: 'Request or provide support for students and families.',
      card: {
        title: 'Help',
        explanation: 'Get support or respond to needs.',
        examples: ['school supplies', 'tutoring', 'student safety'],
        cta: 'Find help',
      },
    },
    work: {
      intro: 'Complete school missions and earn DPAL coins.',
      card: {
        title: 'Work',
        explanation: 'Complete missions and earn DPAL coins.',
        examples: ['verify reports', 'collect evidence', 'map issues'],
        cta: 'View missions',
      },
    },
    play: {
      intro: 'Explore school missions, unlock badges, and learn through challenge play.',
      card: {
        title: 'Play',
        explanation: 'Learn, explore, collect, and engage through game missions.',
        examples: ['challenge mode', 'category creature hunt', 'badge path'],
        cta: 'Start play',
      },
    },
  },
};
