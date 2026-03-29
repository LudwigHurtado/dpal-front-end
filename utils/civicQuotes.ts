/** Rotating inspirational lines for report filing — replaces generic “standard citizen” copy. */
export const CIVIC_INSPIRATION_QUOTES: readonly string[] = [
  'Small acts of courage build safer communities.',
  'Truth shared clearly helps everyone who comes after you.',
  'Your voice is a bridge between harm and healing.',
  'Documentation today can prevent harm tomorrow.',
  'Hope grows when neighbors stand up for one another.',
  'Every careful report strengthens public trust.',
  'You are not alone — your record can connect helpers to those who need them.',
  'Speaking up with facts is an act of care.',
  'Transparency is how communities learn and improve together.',
  'One honest account can change a system for the better.',
];

export function pickCivicQuote(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % CIVIC_INSPIRATION_QUOTES.length;
  return CIVIC_INSPIRATION_QUOTES[idx];
}
