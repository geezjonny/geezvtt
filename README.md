# GeezVTT DD2VTT Importer

This Owlbear Rodeo extension imports `.dd2vtt` files.

## What it does

- Reads the embedded base64 image from the DD2VTT file.
- Creates Owlbear wall items from `line_of_sight`.
- Creates wall items from `objects_line_of_sight`.
- Treats closed `portals` as walls.
- Creates Owlbear light items from `lights`.

## Important hosting step

Before installing the extension, edit `manifest.json` and replace:

- `https://YOUR-USER.github.io/YOUR-REPO/icon.svg`
- `https://YOUR-USER.github.io/YOUR-REPO/index.html`

with your actual hosted URLs.

Example if your repo is `geezvtt` and your GitHub username is `geezjonny`:

- `https://geezjonny.github.io/geezvtt/icon.svg`
- `https://geezjonny.github.io/geezvtt/index.html`

Then the manifest URL will be:

- `https://geezjonny.github.io/geezvtt/manifest.json`

## Files

- `manifest.json` - Owlbear extension manifest
- `index.html` - UI popover
- `src/main.js` - Owlbear logic
- `src/dd2vtt.js` - DD2VTT parser helpers
- `src/style.css` - styling

## Diagnosing an import failure

In v1.2 the extension displays the failure stage and Owlbear's structured error response.
First try regular **Create new scene**. If it fails, enable
**Diagnostic test: create map image only** and retry. If map-only works,
the failure is likely caused by a wall or light item; if both fail, the
scene/image upload or Owlbear storage permission is more likely responsible.
Copy the complete new error message to the developer.
