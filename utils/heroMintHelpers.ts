import { Archetype, Category, NftTheme, type HeroPersona } from "../types";

const ARCH_THEME: Record<Archetype, NftTheme> = {
  [Archetype.Analyst]: NftTheme.Glitch,
  [Archetype.Shepherd]: NftTheme.Solarpunk,
  [Archetype.Seeker]: NftTheme.DeepSea,
  [Archetype.Sentinel]: NftTheme.Cyberpunk,
  [Archetype.Firefighter]: NftTheme.Magma,
  [Archetype.Seraph]: NftTheme.Cosmic,
  [Archetype.Guide]: NftTheme.Renaissance,
};

export function archetypeToNftTheme(a: Archetype): NftTheme {
  return ARCH_THEME[a] ?? NftTheme.Cyberpunk;
}

/** Same base cost as Forge tab (NftMintingStation). */
export const HERO_MINT_BASE_CREDITS = 500;

export function buildHeroMintPrompt(persona: HeroPersona): string {
  const core = `${persona.name}. ${persona.prompt}`.trim();
  const extra = persona.backstory?.trim() ? ` Context: ${persona.backstory.slice(0, 400)}` : "";
  return `${core}${extra}`.slice(0, 4000);
}

export const HERO_MINT_CATEGORY = Category.CivicDuty;
