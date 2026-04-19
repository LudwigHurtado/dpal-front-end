export type ItemType = 'tool' | 'evidence' | 'contact' | 'supply';

export interface RelatedItem {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  emoji: string;
  categoryId: string;
}

export const relatedItems: RelatedItem[] = [
  // Road Hazards
  { id: 'ri_cone',        name: 'Safety Cone',     type: 'tool',     emoji: '🚧', description: 'Orange traffic cone for temporary hazard marking', categoryId: 'road_hazards' },
  { id: 'ri_caution',     name: 'Caution Sign',    type: 'tool',     emoji: '⚠️', description: 'Standard warning sign to alert drivers', categoryId: 'road_hazards' },
  { id: 'ri_pin',         name: 'Location Pin',    type: 'evidence', emoji: '📍', description: 'GPS-confirmed coordinate marker', categoryId: 'road_hazards' },
  { id: 'ri_damage_photo',name: 'Damage Photo',    type: 'evidence', emoji: '📸', description: 'Timestamped photo of road damage', categoryId: 'road_hazards' },
  // Lost Pets
  { id: 'ri_flyer',       name: 'Pet Flyer',       type: 'evidence', emoji: '📋', description: 'Missing pet poster with owner contact info', categoryId: 'lost_pets' },
  { id: 'ri_collar',      name: 'Pet Collar',      type: 'evidence', emoji: '🏷️', description: 'Collar description for identification', categoryId: 'lost_pets' },
  { id: 'ri_witness',     name: 'Witness Note',    type: 'evidence', emoji: '📝', description: 'Statement from someone who saw the pet', categoryId: 'lost_pets' },
  { id: 'ri_shelter',     name: 'Shelter Contact', type: 'contact',  emoji: '🏠', description: 'Local animal shelter information', categoryId: 'lost_pets' },
  // Environmental
  { id: 'ri_trash',       name: 'Waste Pile',      type: 'evidence', emoji: '🗑️', description: 'Documented illegal waste accumulation', categoryId: 'environmental' },
  { id: 'ri_water_warn',  name: 'Water Warning',   type: 'evidence', emoji: '💧', description: 'Contamination risk indicator', categoryId: 'environmental' },
  { id: 'ri_bag',         name: 'Cleanup Bag',     type: 'tool',     emoji: '🛍️', description: 'Heavy-duty bag for safe waste collection', categoryId: 'environmental' },
  { id: 'ri_hazard_tag',  name: 'Hazard Tag',      type: 'tool',     emoji: '🔴', description: 'Official marker for hazardous area', categoryId: 'environmental' },
  // Education
  { id: 'ri_backpack',    name: 'Backpack',        type: 'supply',   emoji: '🎒', description: 'Student backpack with basic supplies', categoryId: 'education' },
  { id: 'ri_desk',        name: 'Student Desk',    type: 'supply',   emoji: '🪑', description: 'Learning workspace condition indicator', categoryId: 'education' },
  { id: 'ri_broken_sign', name: 'Broken Fixture',  type: 'evidence', emoji: '🚫', description: 'Documenting an unsafe facility condition', categoryId: 'education' },
  { id: 'ri_supply_box',  name: 'Supply Box',      type: 'supply',   emoji: '📦', description: 'Container for donated school materials', categoryId: 'education' },
];

export function getRelatedItemById(id: string): RelatedItem | undefined {
  return relatedItems.find(r => r.id === id);
}

export function getRelatedItemsByIds(ids: string[]): RelatedItem[] {
  return ids.flatMap(id => {
    const item = getRelatedItemById(id);
    return item ? [item] : [];
  });
}
