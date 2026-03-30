/**
 * vehicleMapMarker.ts
 *
 * Generates Google Maps marker SVG data-URLs for any vehicle type + body color.
 * Every driver's real vehicle color (as set in their profile) is rendered here —
 * so if the driver has a yellow car, a yellow car appears on the map.
 *
 * Uses a top-down bird's-eye perspective (matches map orientation).
 */

import type { VehicleMapType } from '../features/driver/driverTypes';

/* ── Color utilities ─────────────────────────────────────────────────────── */

/** Lighten a hex color by mixing with white */
function lighten(hex: string, amount = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

/** Darken a hex color by mixing with black */
function darken(hex: string, amount = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `rgb(${dr},${dg},${db})`;
}

/* ── SVG builders — top-down view ────────────────────────────────────────── */

/**
 * Car (sedan) — top-down bird's eye view
 * The body is filled with `bodyColor`, roof slightly lighter, windows tinted.
 */
function carTopDown(bodyColor: string): string {
  const roof   = lighten(bodyColor, 0.22);
  const dark   = darken(bodyColor, 0.35);
  const glass  = 'rgba(147,210,240,0.75)';
  const wheel  = '#1f2937';
  return `
    <!-- Shadow -->
    <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.18)"/>
    <!-- Body (main) -->
    <rect x="12" y="14" width="40" height="46" rx="9" fill="${bodyColor}" stroke="${dark}" stroke-width="1.2"/>
    <!-- Roof (slightly lighter panel in center) -->
    <rect x="17" y="22" width="30" height="24" rx="6" fill="${roof}"/>
    <!-- Front windshield -->
    <rect x="18" y="14" width="28" height="11" rx="4" fill="${glass}"/>
    <!-- Rear windshield -->
    <rect x="18" y="49" width="28" height="10" rx="4" fill="${glass}" opacity="0.7"/>
    <!-- Left side mirror -->
    <rect x="8" y="26" width="5" height="7" rx="2" fill="${bodyColor}" stroke="${dark}" stroke-width="0.8"/>
    <!-- Right side mirror -->
    <rect x="51" y="26" width="5" height="7" rx="2" fill="${bodyColor}" stroke="${dark}" stroke-width="0.8"/>
    <!-- Front-left wheel -->
    <circle cx="14" cy="20" r="5" fill="${wheel}"/>
    <circle cx="14" cy="20" r="2.2" fill="#4b5563"/>
    <!-- Front-right wheel -->
    <circle cx="50" cy="20" r="5" fill="${wheel}"/>
    <circle cx="50" cy="20" r="2.2" fill="#4b5563"/>
    <!-- Rear-left wheel -->
    <circle cx="14" cy="54" r="5" fill="${wheel}"/>
    <circle cx="14" cy="54" r="2.2" fill="#4b5563"/>
    <!-- Rear-right wheel -->
    <circle cx="50" cy="54" r="5" fill="${wheel}"/>
    <circle cx="50" cy="54" r="2.2" fill="#4b5563"/>
    <!-- Headlights -->
    <rect x="20" y="10" width="8" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <rect x="36" y="10" width="8" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <!-- Taillights -->
    <rect x="20" y="59" width="8" height="4" rx="2" fill="#f87171" opacity="0.9"/>
    <rect x="36" y="59" width="8" height="4" rx="2" fill="#f87171" opacity="0.9"/>
  `;
}

/**
 * Motorcycle — top-down bird's eye view
 */
function motoTopDown(bodyColor: string): string {
  const dark  = darken(bodyColor, 0.3);
  const wheel = '#1f2937';
  return `
    <!-- Shadow -->
    <ellipse cx="32" cy="56" rx="10" ry="6" fill="rgba(0,0,0,0.18)"/>
    <!-- Frame/body -->
    <rect x="26" y="16" width="12" height="34" rx="5" fill="${bodyColor}" stroke="${dark}" stroke-width="1.2"/>
    <!-- Tank -->
    <ellipse cx="32" cy="26" rx="7" ry="9" fill="${dark}"/>
    <!-- Handlebars -->
    <rect x="20" y="18" width="24" height="4" rx="2" fill="${dark}"/>
    <!-- Seat -->
    <rect x="27" y="34" width="10" height="10" rx="3" fill="${dark}" opacity="0.8"/>
    <!-- Front wheel -->
    <ellipse cx="32" cy="12" rx="8" ry="5" fill="${wheel}"/>
    <ellipse cx="32" cy="12" rx="3.5" ry="2.2" fill="#4b5563"/>
    <!-- Rear wheel -->
    <ellipse cx="32" cy="58" rx="8" ry="5" fill="${wheel}"/>
    <ellipse cx="32" cy="58" rx="3.5" ry="2.2" fill="#4b5563"/>
    <!-- Headlight -->
    <circle cx="32" cy="7" r="3" fill="#fde68a" opacity="0.9"/>
  `;
}

/**
 * Truck / SUV — top-down bird's eye view (wider + taller than car)
 */
function truckTopDown(bodyColor: string): string {
  const roof  = lighten(bodyColor, 0.2);
  const dark  = darken(bodyColor, 0.35);
  const glass = 'rgba(147,210,240,0.75)';
  const wheel = '#1f2937';
  return `
    <!-- Shadow -->
    <ellipse cx="32" cy="57" rx="24" ry="6" fill="rgba(0,0,0,0.18)"/>
    <!-- Body -->
    <rect x="8" y="12" width="48" height="50" rx="8" fill="${bodyColor}" stroke="${dark}" stroke-width="1.2"/>
    <!-- Roof panel -->
    <rect x="14" y="20" width="36" height="26" rx="5" fill="${roof}"/>
    <!-- Front windshield -->
    <rect x="14" y="12" width="36" height="11" rx="4" fill="${glass}"/>
    <!-- Rear windshield -->
    <rect x="14" y="51" width="36" height="10" rx="4" fill="${glass}" opacity="0.7"/>
    <!-- Roof rack bars -->
    <rect x="16" y="22" width="32" height="2" rx="1" fill="${dark}" opacity="0.4"/>
    <rect x="16" y="30" width="32" height="2" rx="1" fill="${dark}" opacity="0.4"/>
    <rect x="16" y="38" width="32" height="2" rx="1" fill="${dark}" opacity="0.4"/>
    <!-- Left mirror -->
    <rect x="4" y="24" width="5" height="8" rx="2" fill="${bodyColor}" stroke="${dark}" stroke-width="0.8"/>
    <!-- Right mirror -->
    <rect x="55" y="24" width="5" height="8" rx="2" fill="${bodyColor}" stroke="${dark}" stroke-width="0.8"/>
    <!-- Front-left wheel -->
    <circle cx="11" cy="18" r="5.5" fill="${wheel}"/>
    <circle cx="11" cy="18" r="2.5" fill="#4b5563"/>
    <!-- Front-right wheel -->
    <circle cx="53" cy="18" r="5.5" fill="${wheel}"/>
    <circle cx="53" cy="18" r="2.5" fill="#4b5563"/>
    <!-- Rear-left wheel -->
    <circle cx="11" cy="55" r="5.5" fill="${wheel}"/>
    <circle cx="11" cy="55" r="2.5" fill="#4b5563"/>
    <!-- Rear-right wheel -->
    <circle cx="53" cy="55" r="5.5" fill="${wheel}"/>
    <circle cx="53" cy="55" r="2.5" fill="#4b5563"/>
    <!-- Headlights -->
    <rect x="18" y="8" width="10" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <rect x="36" y="8" width="10" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <!-- Taillights -->
    <rect x="18" y="59" width="10" height="4" rx="2" fill="#f87171" opacity="0.9"/>
    <rect x="36" y="59" width="10" height="4" rx="2" fill="#f87171" opacity="0.9"/>
  `;
}

/**
 * Van / minivan — top-down bird's eye view (box-shaped)
 */
function vanTopDown(bodyColor: string): string {
  const roof  = lighten(bodyColor, 0.18);
  const dark  = darken(bodyColor, 0.3);
  const glass = 'rgba(147,210,240,0.75)';
  const wheel = '#1f2937';
  return `
    <!-- Shadow -->
    <ellipse cx="32" cy="57" rx="24" ry="6" fill="rgba(0,0,0,0.18)"/>
    <!-- Box body -->
    <rect x="7" y="10" width="50" height="52" rx="6" fill="${bodyColor}" stroke="${dark}" stroke-width="1.2"/>
    <!-- Roof -->
    <rect x="13" y="16" width="38" height="34" rx="4" fill="${roof}"/>
    <!-- Front windshield (wider) -->
    <rect x="13" y="10" width="38" height="9" rx="3" fill="${glass}"/>
    <!-- Rear windshield -->
    <rect x="13" y="53" width="38" height="9" rx="3" fill="${glass}" opacity="0.6"/>
    <!-- Side windows (left) -->
    <rect x="7" y="22" width="7" height="10" rx="2" fill="${glass}" opacity="0.7"/>
    <rect x="7" y="36" width="7" height="10" rx="2" fill="${glass}" opacity="0.7"/>
    <!-- Side windows (right) -->
    <rect x="50" y="22" width="7" height="10" rx="2" fill="${glass}" opacity="0.7"/>
    <rect x="50" y="36" width="7" height="10" rx="2" fill="${glass}" opacity="0.7"/>
    <!-- Front-left wheel -->
    <circle cx="11" cy="16" r="5.5" fill="${wheel}"/>
    <circle cx="11" cy="16" r="2.5" fill="#4b5563"/>
    <!-- Front-right wheel -->
    <circle cx="53" cy="16" r="5.5" fill="${wheel}"/>
    <circle cx="53" cy="16" r="2.5" fill="#4b5563"/>
    <!-- Rear-left wheel -->
    <circle cx="11" cy="56" r="5.5" fill="${wheel}"/>
    <circle cx="11" cy="56" r="2.5" fill="#4b5563"/>
    <!-- Rear-right wheel -->
    <circle cx="53" cy="56" r="5.5" fill="${wheel}"/>
    <circle cx="53" cy="56" r="2.5" fill="#4b5563"/>
    <!-- Headlights -->
    <rect x="17" y="6" width="12" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <rect x="35" y="6" width="12" height="5" rx="2" fill="#fde68a" opacity="0.9"/>
    <!-- Taillights -->
    <rect x="17" y="61" width="12" height="4" rx="2" fill="#f87171" opacity="0.9"/>
    <rect x="35" y="61" width="12" height="4" rx="2" fill="#f87171" opacity="0.9"/>
  `;
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Generate a Google Maps marker SVG data URL for a vehicle.
 *
 * @param vehicleType  - 'car' | 'moto' | 'truck' | 'van'
 * @param bodyColor    - Hex color string of the driver's vehicle, e.g. '#EAB308'
 * @param size         - Pixel size of the square SVG (default 64)
 * @param bearingDeg   - Compass bearing (0 = north/up, 90 = east, 180 = south, 270 = west).
 *                       The SVG vehicle is drawn facing up (north), so the rotation is applied
 *                       around the centre of the viewBox to align it with the road direction.
 * @returns            - data:image/svg+xml URL ready for use as marker icon
 */
export function makeVehicleMarkerUrl(
  vehicleType: VehicleMapType,
  bodyColor: string,
  size = 64,
  bearingDeg = 0,
): string {
  // Normalise colour — default to white if invalid
  const color = /^#[0-9A-Fa-f]{6}$/.test(bodyColor) ? bodyColor : '#FFFFFF';

  const inner =
    vehicleType === 'moto'  ? motoTopDown(color)  :
    vehicleType === 'truck' ? truckTopDown(color) :
    vehicleType === 'van'   ? vanTopDown(color)   :
    carTopDown(color);

  // Rotate the whole drawing around the SVG centre (32, 32) to match road bearing
  const rot = ((bearingDeg % 360) + 360) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
    <defs>
      <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
    </defs>
    <g transform="rotate(${rot},32,32)" filter="url(#ds)">${inner}</g>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Google Maps MarkerOptions.icon value — ready to pass directly.
 */
export function makeVehicleMarkerIcon(
  vehicleType: VehicleMapType,
  bodyColor: string,
  size = 64,
): { url: string; scaledSize: { width: number; height: number }; anchor: { x: number; y: number } } {
  return {
    url: makeVehicleMarkerUrl(vehicleType, bodyColor, size),
    scaledSize: { width: size, height: size },
    anchor: { x: size / 2, y: size / 2 },
  };
}

/* ── Vehicle color palette ─────────────────────────────────────────────── */

export interface VehicleColor {
  hex:  string;
  name: string;
}

export const VEHICLE_COLOR_PALETTE: VehicleColor[] = [
  { hex: '#FFFFFF', name: 'White'      },
  { hex: '#F5F5F5', name: 'Pearl White' },
  { hex: '#C0C0C0', name: 'Silver'     },
  { hex: '#808080', name: 'Gray'       },
  { hex: '#374151', name: 'Dark Gray'  },
  { hex: '#111827', name: 'Black'      },
  { hex: '#DC2626', name: 'Red'        },
  { hex: '#F97316', name: 'Orange'     },
  { hex: '#EAB308', name: 'Yellow'     },
  { hex: '#D97706', name: 'Gold'       },
  { hex: '#16A34A', name: 'Green'      },
  { hex: '#0D9488', name: 'Teal'       },
  { hex: '#0077C8', name: 'Blue'       },
  { hex: '#1E3A5F', name: 'Navy Blue'  },
  { hex: '#7C3AED', name: 'Purple'     },
  { hex: '#92400E', name: 'Brown'      },
  { hex: '#BE185D', name: 'Maroon'     },
  { hex: '#D4A96A', name: 'Beige'      },
];
