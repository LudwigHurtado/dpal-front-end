/**
 * DPAL Navigator — coordinate parser
 * ----------------------------------------------------------------------------
 * Detects latitude/longitude from free-form text. Phase 1 is intentionally
 * rule-based (no external services / AI calls) so it works offline and during
 * provider outages.
 *
 * Supported patterns (case-insensitive):
 *   - `-17.7833, -63.1821`
 *   - `40.7128 N, 74.0060 W`         → converted to signed decimals
 *   - `lat: -17.7833 lng: -63.1821`
 *   - `latitude -17.7833 longitude -63.1821`
 *   - `-17.7833 -63.1821` (whitespace separated)
 *
 * Rejects values out of ±90 latitude / ±180 longitude.
 */
import type { CoordinateParseResult } from "./types";

const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";
const HEMI = "([NSEW])";

/**
 * The order matters — we try the most specific patterns first so a labelled
 * `lat:`/`lng:` block wins over a bare two-number sequence.
 */
const PATTERNS: Array<{ regex: RegExp; kind: "labeled" | "hemi" | "bare" }> = [
  {
    /** "lat: -17.78 lng: -63.18" or "latitude -17.78 longitude -63.18" */
    regex: new RegExp(
      `(?:lat|latitude)\\s*[:=]?\\s*${NUMBER}[^\\d-]{1,40}?(?:lng|lon|long|longitude)\\s*[:=]?\\s*${NUMBER}`,
      "i",
    ),
    kind: "labeled",
  },
  {
    /** "40.71N 74.00W" — hemisphere suffix form */
    regex: new RegExp(`${NUMBER}\\s*${HEMI}\\s*[, ]\\s*${NUMBER}\\s*${HEMI}`, "i"),
    kind: "hemi",
  },
  {
    /** "-17.7833, -63.1821" or "-17.7833 -63.1821" */
    regex: new RegExp(`${NUMBER}\\s*[, ]\\s*${NUMBER}`),
    kind: "bare",
  },
];

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Apply N/S/E/W hemisphere markers to absolute decimal values. */
function applyHemisphere(value: number, hemi: string): number {
  const flag = hemi.toUpperCase();
  const abs = Math.abs(value);
  if (flag === "S" || flag === "W") return -abs;
  return abs;
}

/**
 * Parse a free-form string for latitude/longitude.
 * Returns `{ hasCoordinates: false }` instead of throwing when nothing matches.
 */
export function parseCoordinates(raw: string | null | undefined): CoordinateParseResult {
  if (!raw || typeof raw !== "string") {
    return { hasCoordinates: false, lat: null, lng: null };
  }

  const text = raw.trim();
  if (!text) return { hasCoordinates: false, lat: null, lng: null };

  for (const { regex, kind } of PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;

    let lat = Number.NaN;
    let lng = Number.NaN;

    if (kind === "labeled" || kind === "bare") {
      lat = Number(match[1]);
      lng = Number(match[2]);
    } else if (kind === "hemi") {
      const v1 = Number(match[1]);
      const h1 = match[2];
      const v2 = Number(match[3]);
      const h2 = match[4];
      const h1U = h1.toUpperCase();
      const h2U = h2.toUpperCase();
      if ((h1U === "N" || h1U === "S") && (h2U === "E" || h2U === "W")) {
        lat = applyHemisphere(v1, h1);
        lng = applyHemisphere(v2, h2);
      } else if ((h1U === "E" || h1U === "W") && (h2U === "N" || h2U === "S")) {
        /** Swap if author wrote longitude first. */
        lat = applyHemisphere(v2, h2);
        lng = applyHemisphere(v1, h1);
      }
    }

    if (isValidLatLng(lat, lng)) {
      return {
        hasCoordinates: true,
        lat,
        lng,
        matchedText: match[0],
      };
    }

    /**
     * Numbers found but invalid range → return the parse error instead of
     * silently failing so the UI can explain what is wrong.
     */
    return {
      hasCoordinates: false,
      lat: null,
      lng: null,
      matchedText: match[0],
      error: "Latitude must be -90..90 and longitude must be -180..180.",
    };
  }

  return { hasCoordinates: false, lat: null, lng: null };
}

/** Best-effort heuristic — extracts an address-like phrase, no geocoding. */
export function extractAddressHint(raw: string): string | undefined {
  if (!raw) return undefined;
  /** Detect typical street tokens (avenue, street, road, etc.). */
  const m = raw.match(
    /(?:\d+\s+)?[\w\s.,'-]{4,80}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|highway|hwy\.?|drive|dr\.?|lane|ln\.?|way|parkway|pkwy\.?)\b[^.\n,]{0,60}/i,
  );
  return m ? m[0].trim() : undefined;
}
