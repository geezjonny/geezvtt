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
let fileReadVersion = 0;

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
  $file.disabled = busy;
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
  const version = ++fileReadVersion;
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
    if (version !== fileReadVersion) return;
    parsed = parseDd2vtt(JSON.parse(text));
    $details.textContent = summarize(parsed);
    setStatus(owlbearReady ? "Ready to import." : "Open this extension inside Owlbear Rodeo.");
  } catch (error) {
    if (version !== fileReadVersion) return;
    parsed = null;
    $details.textContent = `Error: ${error?.message || String(error)}`;
    setStatus("Could not parse file.");
  }

  refreshButtons();
}

async function createScene() {
  if (!parsed || busy || !owlbearReady) return;
  const options = selectedOptions();
  const mapOnly = document.getElementById("mapOnly").checked;
  busy = true;
  refreshButtons();

  try {
    mark("Preparing embedded image");
    const imageFile = await imageDataUrlToFile(parsed.image, mapName);
    const mapUpload = buildImageUpload(imageFile)
      .name(mapName)
      .dpi(parsed.dpi)
      .offset({ x: 0, y: 0 })
      .build();

    mark("Building scene items");
    const items = mapOnly ? [] : buildImportedItems(parsed, options, mapName);

    mark("Building scene upload");
    const scene = buildSceneUpload()
      .name(mapName)
      .gridType("SQUARE")
      .gridOpacity(0.18)
      .fogFilled(true)
      .baseMap(mapUpload)
      .items(items)
      .build();

    mark("Uploading scene to Owlbear");
    await OBR.assets.uploadScenes([scene]);
    setStatus(`Created scene "${mapName}" with ${items.length} imported item(s).`);
  } catch (error) {
    console.error(error);
    setStatus(`Create scene failed during ${currentStage}:\n${describeError(error)}`);
  } finally {
    busy = false;
    refreshButtons();
  }
}

async function addGeometryToCurrentScene() {
  if (!parsed || busy || !owlbearReady) return;
  const options = selectedOptions();
  busy = true;
  refreshButtons();

  try {
    mark("Checking current scene");
    if (!(await OBR.scene.isReady())) {
      setStatus("Open a scene before adding walls and lights.");
      return;
    }
    mark("Building walls and lights");
    const items = buildImportedItems(parsed, options, mapName);
    if (!items.length) {
      setStatus("Nothing selected to import.");
      return;
    }
    mark("Adding walls and lights to current scene");
    await OBR.scene.items.addItems(items);
    setStatus(`Added ${items.length} item(s) to the current scene.`);
  } catch (error) {
    console.error(error);
    setStatus(`Current scene import failed during ${currentStage}:\n${describeError(error)}`);
  } finally {
    busy = false;
    refreshButtons();
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
