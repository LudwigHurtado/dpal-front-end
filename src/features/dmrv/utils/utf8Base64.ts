/**
 * `btoa()` only accepts Latin-1. DMRV reports and project context often include
 * Unicode (geocoded place names, descriptions). Encode UTF-8 bytes first.
 */
export function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
