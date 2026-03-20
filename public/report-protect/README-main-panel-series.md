# Main panel image series

The manifest drives the **home main menu** hero only — the **original neon panel** (blue/white title, then this image strip, then GOVERNANCE_PROTOCOL, tagline). It is **not** shown on the Report Main Control Panel dashboard.

To show **only** one slide with no rotation, set `images` to a single path.

To update the series:

1. Upload new image files into `public/report-protect/`.
2. Open `public/report-protect/main-panel-series.json`.
3. Add the new image paths under the `images` array in the order you want.

Bundled slides (reorder or remove in JSON as you like):

| File | Purpose (approx.) |
|------|-------------------|
| `main-panel-series-05-report-protect-mobile.png` | Report & Protect mobile mockups (carousel starts here) |
| `main-panel-series-06-silent-observer.png` | Silent Observer feature |
| `main-panel-series-07-mission-grid.png` | Mission cards grid |
| `main-panel-series-08-locator-hunt.png` | Locator Hunt |
| `main-panel-series-09-accountability-grid.png` | Accountability / category grid |
| `main-panel-series-10-play-need-deed.png` | Play Need & Deed |
| `main-panel-series-11-save-environment.png` | Environment mission |
| `main-panel-series-12-signal-hunters.png` | Signal Hunters quest |
| `main-panel-series-13-dig-evidence.png` | Dig up evidence / investigation |
| Plus older refs: `main-panel-series-01.png`, `main-panel-hero-alt.png` |

**Not** in the carousel (kept on disk only if you need them elsewhere): `main-panel-hero-ecosystem.png`, `main-panel-series-03-hub-composite.png`, `main-panel-series-04-ecosystem.png`, `main-command-central-reference.png`, `main-panel-series-02-home-hero.png`.

Notes:
- Rotation advances automatically every 5 seconds.
- Dot controls under the image let users jump to any slide.
- With many slides, consider a longer interval in `MainPanelHeroCarousel.tsx` if you want.
