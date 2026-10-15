# GeezVTT DD2VTT Importer

This Owlbear Rodeo extension imports `.dd2vtt` files.

## What it does

- Reads the embedded base64 image from the DD2VTT file.
- Creates Owlbear wall items from `line_of_sight`.
- Creates wall items from `objects_line_of_sight`.
- Treats closed `portals` as walls.
- Creates Owlbear light items from `lights`.

## Hosting and installation

The manifest is configured for `https://geezjonny.github.io/geezvtt/`.
Enable GitHub Pages for this repository, then install the extension in Owlbear
using `https://geezjonny.github.io/geezvtt/manifest.json`.
If hosting elsewhere, update the icon and popover URLs in `manifest.json`.

## Files

- `manifest.json` - Owlbear extension manifest
- `index.html` - UI popover
- `src/main.js` - Owlbear logic
- `src/dd2vtt.js` - DD2VTT parser helpers
- `src/style.css` - styling

`background.html`, `src/background.js`, `src/vision.js`, and `src/uvtt.js`
are an alternate metadata-based vision implementation. They are not connected
to the manifest or the active importer; imports currently create wall and light
items directly through `src/main.js`.

## Diagnosing an import failure

In v1.2 the extension displays the failure stage and Owlbear's structured error response.
First try regular **Create new scene**. If it fails, enable
**Diagnostic test: create map image only** and retry. If map-only works,
the failure is likely caused by a wall or light item; if both fail, the
scene/image upload or Owlbear storage permission is more likely responsible.
Copy the complete new error message to the developer.

## Verification

Run `node --test tests/importer.test.cjs` for local importer regression checks.
Before release, test inside Owlbear with real DD2VTT files: scene creation,
geometry added to an open scene, nonzero map origins, lights, large maps, and
the map-only diagnostic. Local checks do not verify Owlbear uploads or rendering.
