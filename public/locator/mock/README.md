# DPAL Locator mock assets

This folder is used by `LocatorPage` to display mock “seed” listings on the locator map and in AI Similar Matches.

Expected filenames (one per continent + type):
- `mock/<continentSlug>/person.svg`
- `mock/<continentSlug>/pet.svg`
- `mock/<continentSlug>/item.svg`

If any of these files are missing, the UI will fall back to the existing icons:
- `public/locator/icon-person.png`
- `public/locator/icon-pet.png`
- `public/locator/icon-item.png`

