# GeezVTT DD2VTT Importer

This Owlbear Rodeo extension imports `.dd2vtt` files.

**v1.3:** Walls and lights now land on Owlbear's grid (150 DPI per cell) for new scenes, instead of at the file's own pixels-per-grid, so they line up for maps exported at any resolution. **Add walls/lights to current scene** lines up with the selected map image, even if it was moved, resized or rotated. Clearer option labels, and the unused vision prototype was removed.

## What it does

- Reads the embedded base64 image from the DD2VTT file.
- Creates Owlbear wall items from `line_of_sight`.
- Creates wall items from `objects_line_of_sight`.
- Treats closed `portals` as walls.
- Creates Owlbear light items from `lights`.
- To add geometry to a map already on the scene, select the map image first. With nothing selected, the map is assumed to be at its original size at the scene origin.

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

## Diagnosing an import failure

In v1.2 the extension displays the failure stage and Owlbear's structured error response.
First try regular **Create new scene**. If it fails, enable
**Diagnostic test: create map image only** and retry. If map-only works,
the failure is likely caused by a wall or light item; if both fail, the
scene/image upload or Owlbear storage permission is more likely responsible.
Copy the complete new error message to the developer.

## Verification

Run `node --test tests/*.test.*` for local importer and coordinate-mapping checks.
Before release, test inside Owlbear with real DD2VTT files: scene creation,
geometry added to an open scene (with the map selected after moving, resizing and rotating it), files exported at a pixels-per-grid other than 150, nonzero map origins, lights, large maps, and
the map-only diagnostic. Local checks do not verify Owlbear uploads or rendering.
