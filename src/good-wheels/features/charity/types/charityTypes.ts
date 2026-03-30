export type CharityCategory = 'animals' | 'seniors' | 'homeless' | 'children' | 'environment';

export interface Charity {
  id: string;
  name: string;
  category: CharityCategory;
  distanceMiles: number;
  verified: boolean;
  imageUrl?: string;
  description?: string;
}

