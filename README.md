# GeezVTT v1 (static, no build needed)

Upload **all files inside `geezvtt-deploy/`** to the root of a GitHub Pages repository named `geezvtt` and enable Pages. Then add `https://YOUR_USERNAME.github.io/geezvtt/manifest.json` as an Owlbear extension. Replace YOUR_USERNAME and repository spelling as needed (GitHub URLs are case-sensitive).

Choose a `.dd2vtt`, `.uvtt`, or `.df2vtt` file and click **Create Owlbear scene**. After the Owlbear folder picker, open the scene from the Atlas. The extension extracts the embedded base64 image into Owlbear's own storage; no separate hosting is needed for maps. Wall and light records persist in hidden scene items. The background page reconstructs local vision items on each client's scene.

**v1 limitations:** closed portals are immovable vision-blocking walls, not switchable doors; colors aren't used by the light engine; each participant must enable the extension for vision. Native `WALL` and `LIGHT` items are local-only by Owlbear SDK design. Image offsets from unusual cropped UVTT exports may need later adjustment.

The extension has not yet been tested inside a live Owlbear room. SDK v3.1.0 is loaded from esm.sh at runtime.
