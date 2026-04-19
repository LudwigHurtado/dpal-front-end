import { C, TC } from '../constants';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  hexColor: number;
  cssColor: string;
  description: string;
}

export const categories: Category[] = [
  {
    id: 'road_hazards',
    name: 'Road Hazards',
    emoji: '⚠️',
    hexColor: C.CAT_ROAD,
    cssColor: TC.CAT_ROAD,
    description: 'Potholes, broken signs, unsafe road conditions',
  },
  {
    id: 'lost_pets',
    name: 'Lost Pets',
    emoji: '🐾',
    hexColor: C.CAT_PETS,
    cssColor: TC.CAT_PETS,
    description: 'Missing animals, lost-pet flyers, shelter coordination',
  },
  {
    id: 'environmental',
    name: 'Environmental',
    emoji: '🌿',
    hexColor: C.CAT_ENV,
    cssColor: TC.CAT_ENV,
    description: 'Illegal dumping, water contamination, hazardous waste',
  },
  {
    id: 'education',
    name: 'Education',
    emoji: '📚',
    hexColor: C.CAT_EDU,
    cssColor: TC.CAT_EDU,
    description: 'School supply shortages, unsafe facilities, learning gaps',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}
