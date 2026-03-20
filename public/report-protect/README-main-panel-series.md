# Main panel image series

The same manifest drives rotating images in **two places**:

- **Home (Main Menu)** — hero is **image-only** (no large headline); the first image in `images` is what users see first.
- **Report → Main Control Panel** — full-width panel under the breadcrumb

To show **only** the ecosystem hero with no rotation, set `images` to a single path (e.g. only `main-panel-hero-ecosystem.png`).

To update the series:

1. Upload new image files into `public/report-protect/`.
2. Open `public/report-protect/main-panel-series.json`.
3. Add the new image paths under the `images` array in the order you want.

Example:

```json
{
  "images": [
    "/report-protect/main-command-central-reference.png",
    "/report-protect/main-panel-series-01.png",
    "/report-protect/main-panel-series-02.png"
  ]
}
```

Notes:
- Rotation advances automatically every 5 seconds.
- Dot controls under the image let users jump to any slide.
