export type PlasticEnvironmentType =
  | 'river'
  | 'lake'
  | 'coast'
  | 'ocean'
  | 'landfill_dumping'
  | 'flood_debris';

export function normalizePlasticEnvironmentType(raw: string): PlasticEnvironmentType {
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (v === 'river') return 'river';
  if (v === 'lake') return 'lake';
  if (v === 'coast') return 'coast';
  if (v === 'ocean') return 'ocean';
  if (v === 'landfill_dumping' || v === 'landfill' || v === 'dumping_area') return 'landfill_dumping';
  if (v === 'flood_debris' || v === 'flood_debris_zone') return 'flood_debris';
  return 'river';
}
