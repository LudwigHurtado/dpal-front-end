# Main panel image series

To quickly update rotating images in the Main Control Panel:

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
