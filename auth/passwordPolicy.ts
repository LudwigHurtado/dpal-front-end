/** Mirrors server `passwordSchema` (zod) so client errors match API validation. */
export function validatePlatformPassword(p: string): string | null {
  if (p.length < 10) return "Password must be at least 10 characters.";
  if (p.length > 128) return "Password is too long.";
  if (!/[a-z]/.test(p)) return "Include a lowercase letter.";
  if (!/[A-Z]/.test(p)) return "Include an uppercase letter.";
  if (!/[0-9]/.test(p)) return "Include a number.";
  return null;
}

export function validateUsername(u: string): string | null {
  const s = u.trim();
  if (s.length < 3) return "Username must be at least 3 characters.";
  if (s.length > 32) return "Username is too long.";
  if (!/^[a-zA-Z0-9_]+$/.test(s)) return "Username: letters, numbers, and underscore only.";
  return null;
}
