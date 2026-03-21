# Main panel image series (home hero carousel)

## Keep Git + online in sync with your dev folder

1. **Only list files that exist** in `public/report-protect/` inside `main-panel-series.json`.  
   If you delete a PNG locally, remove its line from the JSON (or the carousel will show broken images online).

2. **Commit deletions** so GitHub/Vercel drop those files:  
   `git add -u public/report-protect` after you delete images.

3. **Current carousel files** (see `main-panel-series.json` — this list should match your disk):

   - `main-panel-hero-ecosystem.png`
   - `main-panel-beacon-community-guide.png` (“Drop the beacon & warn the community” guide)
   - `main-panel-series-01.png`
   - `main-panel-series-04-ecosystem.png`
   - `main-panel-series-05-report-protect-mobile.png`
   - `main-panel-series-06-silent-observer.png`
   - `main-panel-series-07-mission-grid.png`
   - `main-panel-series-09-accountability-grid.png`
   - `main-panel-series-10-play-need-deed.png`
   - `main-panel-missions-overview-2x2.png` (Locator Hunt, Beacon Drop, Clean Sweep, Memory Bridge)
   - `main-panel-investigation-network-board.png` (“Expose the hidden links” / war-room evidence board)
   - `main-panel-investigate-observe-intelligent.png` (“Investigate, observe & report intelligently” corkboard)

Add a new PNG to the folder, add its path to `images` in `main-panel-series.json`, commit, push.

## Other assets in this folder (not in the carousel)

- `report-protect-bg-reference.png` — used by Report Work Panel, Master Control panel map, Mission Gateway fallback.

The carousel is **not** shown on the Report Main Control Panel dashboard.

Notes:
- Rotation is every **5 seconds**; dots under the image jump to a slide.
- With many slides, consider a longer interval in `MainPanelHeroCarousel.tsx`.
