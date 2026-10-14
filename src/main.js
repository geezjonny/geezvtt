import OBR, {
  buildImageUpload,
  buildSceneUpload,
  buildWall,
  buildLight,
} from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";
import { parseDd2vtt, imageDataUrlToFile, worldPoint } from "./dd2vtt.js";

const $file = document.getElementById("file");
const $details = document.getElementById("details");
const $status = document.getElementById("status");
const $createScene = document.getElementById("createScene");
const $addGeometry = document.getElementById("addGeometry");

let parsed = null;
let mapName = "Imported Map";
let owlbearReady = false;
let busy = false;
let currentStage = "idle";

function describeError(error) {
  const seen = new WeakSet();
  const compact = (value) => JSON.stringify(value, (key, item) => {
    if (typeof item === "bigint") return String(item);
    if (item && typeof item === "object") {
      if (seen.has(item)) return "[circular]";
      seen.add(item);
    }
    return item;
  }, 2);
  try {
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      const fields = {};
      for (const key of ["message", "name", "code", "status", "statusText",
                         "reason", "error", "details", "data", "cause", "stack"]) {
        if (error[key] !== undefined) fields[key] = error[key];
      }
      for (const key of Object.keys(error)) fields[key] ??= error[key];
      const result = compact(fields);
      return result && result !== "{}" ? result : String(error);
    }
    return String(error);
  } catch (_) {
    return String(error);
  }
}
function mark(stage) {
  currentStage = stage;
  setStatus(stage + "…");
}

function setStatus(text) {
  $status.textContent = text;
}

function selectedOptions() {
  return {
    walls: document.getElementById("importWalls").checked,
    objects: document.getElementById("importObjects").checked,
    doors: document.getElementById("importDoors").checked,
    lights: document.getElementById("importLights").checked,
  };
}

function refreshButtons() {
  const enabled = owlbearReady && !!parsed && !busy;
  $createScene.disabled = !enabled;
  $addGeometry.disabled = !enabled;
}

function summarize(parsedMap) {
  return [
    `Format: ${parsedMap.format ?? "unknown"}`,
    `Map: ${parsedMap.widthPixels} × ${parsedMap.heightPixels} px`,
    `Grid: ${parsedMap.dpi} px per cell`,
    `Origin: (${parsedMap.mapOrigin.x}, ${parsedMap.mapOrigin.y})`,
    `line_of_sight: ${parsedMap.walls.length}`,
    `objects_line_of_sight: ${parsedMap.objectWalls.length}`,
    `closed portals: ${parsedMap.doors.length}`,
    `lights: ${parsedMap.lights.length}`,
  ].join("\n");
}

function buildImportedItems(parsedMap, options, sourceName) {
  const items = [];
  const meta = { "com.geezvtt.dd2vtt/import": sourceName };

  const addWallPaths = (paths) => {
    for (const path of paths) {
      items.push(
        buildWall()
          .points(path.map((p) => worldPoint(p, parsedMap)))
          .doubleSided(true)
          .blocking(true)
          .metadata(meta)
          .build()
      );
    }
  };

  if (options.walls) addWallPaths(parsedMap.walls);
  if (options.objects) addWallPaths(parsedMap.objectWalls);
  if (options.doors) addWallPaths(parsedMap.doors.map((door) => door.points));

  if (options.lights) {
    for (const light of parsedMap.lights) {
      items.push(
        buildLight()
          .position(worldPoint(light.position, parsedMap))
          .attenuationRadius(light.range * parsedMap.dpi)
          .sourceRadius(Math.max(2, parsedMap.dpi * 0.05))
          .falloff(0.25)
          .metadata(meta)
          .build()
      );
    }
  }

  return items;
}

async function readSelectedFile() {
  const file = $file.files?.[0];
  parsed = null;
  refreshButtons();

  if (!file) {
    $details.textContent = "No file loaded.";
    return;
  }

  mapName = file.name.replace(/\.(dd2vtt|df2vtt|uvtt|json)$/i, "") || "Imported Map";

  try {
    const text = await file.text();
    parsed = parseDd2vtt(JSON.parse(text));
    $details.textContent = summarize(parsed);
    setStatus(owlbearReady ? "Ready to import." : "Open this extension inside Owlbear Rodeo.");
  } catch (error) {
    parsed = null;
    $details.textContent = `Error: ${error?.message || String(error)}`;
    setStatus("Could not parse file.");
  }

  refreshButtons();
}

async function createScene() {
  if (!parsed) return;
  const options = selectedOptions();

  try {
    setStatus("Preparing embedded image…");
    const imageFile = await imageDataUrlToFile(parsed.image, mapName);
    const mapUpload = buildImageUpload(imageFile)
      .name(mapName)
      .dpi(parsed.dpi)
      .offset({ x: 0, y: 0 })
      .build();

    const items = buildImportedItems(parsed, options, mapName);

    setStatus("Uploading scene to Owlbear…");
    const scene = buildSceneUpload()
      .name(mapName)
      .gridType("SQUARE")
      .gridOpacity(0.18)
      .fogFilled(true)
      .baseMap(mapUpload)
      .items(items)
      .build();

    await OBR.assets.uploadScenes([scene]);
    setStatus(`Created scene "${mapName}" with ${items.length} imported item(s).`);
  } catch (error) {
    console.error(error);
    setStatus(`Create scene failed: ${error?.message || String(error)}`);
  }
}

async function addGeometryToCurrentScene() {
  if (!parsed) return;
  const options = selectedOptions();

  try {
    setStatus("Adding walls and lights to current scene…");
    const items = buildImportedItems(parsed, options, mapName);
    if (!items.length) {
      setStatus("Nothing selected to import.");
      return;
    }
    await OBR.scene.items.addItems(items);
    setStatus(`Added ${items.length} item(s) to the current scene.`);
  } catch (error) {
    console.error(error);
    setStatus(`Current scene import failed: ${error?.message || String(error)}`);
  }
}

$file.addEventListener("change", readSelectedFile);
$createScene.addEventListener("click", createScene);
$addGeometry.addEventListener("click", addGeometryToCurrentScene);

OBR.onReady(() => {
  owlbearReady = true;
  setStatus(parsed ? "Ready to import." : "Choose a DD2VTT file.");
  refreshButtons();
});
