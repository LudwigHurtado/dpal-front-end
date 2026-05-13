# Emissions Integrity Audit System (EIAS) — User Manual

**Route:** [https://dpal-front-end.vercel.app/emissions-integrity-audit](https://dpal-front-end.vercel.app/emissions-integrity-audit)

EIAS helps you structure an emissions integrity review: facility context, reporting periods, reported emissions vs satellite-style indicators, production intensity, confidence inputs, and an Audit Discrepancy Index (ADI). It can pull live methane / NO₂ / CO₂ context from the same host as `VITE_API_BASE` when `/api/carbon/*` is available. Saving audits to a server requires `/api/emissions-audit/*` (often the Prisma backend in this repo), not only the default Railway filing API.

---

## 1. What you need before you start

- **Browser location (optional):** For “Use device GPS,” allow location when prompted. Use **HTTPS** (production URL above is fine).
- **Coordinates or a map pin:** You need a facility point (or a polygon). Wrong signs on longitude (e.g. `115` instead of `-115`) used to misplace the pin; the app now normalizes common western-US mistakes when possible.
- **Account (optional):** Local workspace auto-saves in the browser. **Saving** an audit to the API needs sign-in and a backend that implements emissions-audit routes.

---

## 2. Location and “state” — how it works now

Two different ideas are shown on purpose:

| UI label | Meaning |
|----------|---------|
| **US state / region** | From **OpenStreetMap Nominatim** reverse geocoding of your pin (e.g. Nevada, Oregon). This is the real map region. |
| **EIAS regulatory preset** | One of **California**, **Arizona**, **New Mexico**, or **Federal**. Only these four drive the built-in legal framing in the tool. Nevada, Oregon, Utah, etc. correctly show as their **state name** but the preset is **Federal** unless you pick a specific jurisdiction in the facility form. |

If the geocoder is slow or blocked, a **rough offline bbox** may fill in the state label for the western US; the regulatory line still follows the preset rules above.

**Tips for accurate placement**

1. Click **Use device GPS (high accuracy)** outdoors if you can, then zoom the map and **click again** to nudge the pin onto the facility.
2. Or type **latitude** and **longitude** in decimal degrees; **longitude in the US must be negative** (west of the prime meridian).
3. If the amber warning appears, open **Jurisdiction** in the facility section and align it with your permit context (e.g. Nevada site → often **Federal** + EPA GHGRP framing).

---

## 3. Step-by-step workflow

1. **Facility** — Company, facility name, industry, **jurisdiction** (CA / AZ / NM / Federal), and legal framework.
2. **Periods** — Baseline and current reporting windows (presets or custom dates).
3. **Location** — Choose *GPS coordinate input*, *map click*, *drawn polygon*, or *facility search* (demo list). Ensure the summary shows the expected **US state / region**.
4. **Reported emissions** — Baseline and current totals plus metadata (sources, QA).
5. **Satellite / activity layer toggles** — Informational; live pull uses **Refresh source** / automatic load when the point and dates change.
6. **Production / activity** — Optional intensity context (`outputUnit` matters for normalization).
7. **Confidence** — Slider-style inputs for data, satellite, regulatory, and weather QA confidence.
8. **Run audit** — Builds ADI, risk band, and narrative in the results panel.
9. **Save / export / links** — When the API is available, save and attach links to reports, missions, MRV, etc.

---

## 4. Troubleshooting

| Issue | What to do |
|-------|------------|
| Pin in the wrong state | Fix longitude sign; use map click; try device GPS outdoors; confirm Nominatim is not blocked by network/adblock. |
| “Federal” in Oregon/Nevada | Expected for **regulatory preset**; pick **Federal** in jurisdiction or keep your permit-appropriate choice. |
| Saved audits fail (401/404) | Point `VITE_API_BASE` at a host that implements `/api/emissions-audit/*` and sign in; local draft still works. |
| Satellite shows placeholder | Backend `/api/carbon/air-quality` or minerals route missing or no data for that window — adjust dates or location. |

---

## 5. Third-party data

Map tiles: Esri. Region names: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) (usage policy applies; app sends an identifying `User-Agent`).

---

*This manual describes the SPA behavior in `dpal-front-end`. Regulatory interpretation remains your responsibility; EIAS is a structured workspace, not a permit decision.*
