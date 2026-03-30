import type { SupportCategory } from '../../types/support';

export const MOCK_SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'medical_transport',
    label: 'Medical Transport',
    description: 'Rides for appointments, clinics, pharmacies, and recovery support.',
    tone: 'trust',
  },
  {
    id: 'elder_help',
    label: 'Elder Help',
    description: 'Assistance rides and support tasks for seniors and caregivers.',
    tone: 'safe',
  },
  {
    id: 'school_ride',
    label: 'School / Education Ride',
    description: 'School drop-off/pickup, tutoring travel, and safe youth transport.',
    tone: 'safe',
  },
  {
    id: 'shelter_support',
    label: 'Shelter / Housing Support',
    description: 'Transport connected to housing transitions, shelters, or services.',
    tone: 'pending',
  },
  {
    id: 'accessibility_support',
    label: 'Accessibility Support',
    description: 'Mobility assistance, disability accommodations, and accessible routing.',
    tone: 'trust',
  },
  {
    id: 'community_errand',
    label: 'Community Errand',
    description: 'Grocery pickup, essential supplies, and neighbor-to-neighbor help.',
    tone: 'safe',
  },
  {
    id: 'child_family_safety',
    label: 'Child / Family Safety',
    description: 'Family-safe pickup flows and verified handoff options.',
    tone: 'trust',
  },
  {
    id: 'emergency_support',
    label: 'Emergency Support',
    description: 'Urgent transport coordination and escalation tools when needed.',
    tone: 'urgent',
  },
];

