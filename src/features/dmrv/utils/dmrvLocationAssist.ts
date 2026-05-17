import { getMethodologyPresetsForType } from '../dmrvMethodologyPresets';
import { generateDmrvProjectId } from '../services/dmrvProjectContextService';
import type { DmrvMethodologyDomain } from '../services/dmrvProjectContextTypes';

export type DmrvLocationSuggestions = {
  placeLabel: string | null;
  suggestedProjectName: string;
  suggestedProjectId: string;
  suggestedCountryRegion: string;
  suggestedDescription: string;
  suggestedMethodologyName: string;
  suggestedStandardFramework: string;
  suggestedDomain: DmrvMethodologyDomain;
  suggestedEvidenceSources: string;
  areaKm2: number;
  hasPolygon: boolean;
};

/** Short human label from Nominatim display_name (city / region / country). */
export function shortenPlaceLabel(displayName: string | null | undefined): string {
  if (!displayName?.trim()) return '';
  const parts = displayName
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 3) return parts.join(', ');
  const country = parts[parts.length - 1];
  const region = parts[parts.length - 2];
  const locality = parts.find((p) => !/^\d+$/.test(p)) ?? parts[0];
  return [locality, region, country].filter(Boolean).join(', ');
}

export function suggestDmrvProjectName(params: {
  placeLabel?: string | null;
  categoryTitle: string;
  typeTitle: string;
  areaKm2?: number;
  hasPolygon?: boolean;
}): string {
  const place = shortenPlaceLabel(params.placeLabel);
  const typePart = params.typeTitle.replace(/\s*\/\s*/g, ' ').trim();
  let areaPart = '';
  if (params.areaKm2 && params.areaKm2 > 0) {
    areaPart =
      params.areaKm2 < 1
        ? ` · ~${Math.round(params.areaKm2 * 100)} ha`
        : ` · ~${params.areaKm2.toFixed(1)} km²`;
  }
  if (place) {
    return `${place} — ${typePart} MRV${areaPart}`.slice(0, 140);
  }
  return `${params.categoryTitle} — ${typePart} Project${areaPart}`.slice(0, 140);
}

export function suggestDmrvProjectIdFromName(
  name: string,
  categorySlug: string,
  typeId: string,
): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  if (slug.length >= 4) return `dmrv-${slug}`;
  return generateDmrvProjectId(categorySlug, typeId);
}

function domainForCategory(categorySlug: string): DmrvMethodologyDomain {
  if (categorySlug.includes('water')) return 'water';
  if (categorySlug.includes('biodiversity')) return 'biodiversity';
  if (categorySlug.includes('pollution') || categorySlug.includes('air')) return 'pollution';
  if (categorySlug.includes('carbon') || categorySlug.includes('land') || categorySlug.includes('forest')) {
    return 'carbon';
  }
  return 'custom';
}

export function buildDmrvLocationSuggestions(params: {
  placeLabel: string | null;
  categorySlug: string;
  categoryTitle: string;
  typeId: string;
  typeTitle: string;
  areaKm2: number;
  hasPolygon: boolean;
}): DmrvLocationSuggestions {
  const presets = getMethodologyPresetsForType(params.typeId);
  const preset = presets.find((p) => p.id !== 'custom-methodology') ?? presets[0];
  const region = shortenPlaceLabel(params.placeLabel);
  const suggestedProjectName = suggestDmrvProjectName({
    placeLabel: params.placeLabel,
    categoryTitle: params.categoryTitle,
    typeTitle: params.typeTitle,
    areaKm2: params.areaKm2,
    hasPolygon: params.hasPolygon,
  });

  const suggestedDescription = [
    `DPAL screening project for ${params.typeTitle} at ${region || 'the selected map location'}.`,
    params.hasPolygon
      ? `AOI polygon captured on the project map (~${params.areaKm2 > 0 ? `${params.areaKm2.toFixed(2)} km²` : 'area pending'}).`
      : 'Map center point saved — draw a polygon when a boundary is required for satellite MRV.',
    'Configure satellite sources next; evidence packets and blockchain identity anchor use this project context.',
  ].join(' ');

  return {
    placeLabel: params.placeLabel,
    suggestedProjectName,
    suggestedProjectId: suggestDmrvProjectIdFromName(
      suggestedProjectName,
      params.categorySlug,
      params.typeId,
    ),
    suggestedCountryRegion: region,
    suggestedDescription,
    suggestedMethodologyName: preset?.name ?? `${params.typeTitle} screening`,
    suggestedStandardFramework:
      preset?.status === 'external-standard-aligned'
        ? 'Reference-aligned (verify registry rules before claims)'
        : 'DPAL pilot MRV screening',
    suggestedDomain: domainForCategory(params.categorySlug),
    suggestedEvidenceSources: preset?.compatibleEvidenceSources.join(', ') ?? 'Satellite Imagery, Field plots',
    areaKm2: params.areaKm2,
    hasPolygon: params.hasPolygon,
  };
}
