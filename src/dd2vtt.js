const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const point = (value) => {
  if (!value || typeof value !== "object") return null;
  const x = asNumber(value.x);
  const y = asNumber(value.y);
  if (x === null || y === null) return null;
  return { x, y };
};

const pointPath = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(point).filter(Boolean);
};

const pathList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(pointPath).filter((path) => path.length >= 2);
};

export function parseDd2vtt(data) {
  if (!data || typeof data !== "object") {
    throw new Error("DD2VTT JSON root must be an object.");
  }

  const resolution = data.resolution || {};
  const pixelsPerGrid = asNumber(resolution.pixels_per_grid);
  const mapSize = point(resolution.map_size);
  const mapOrigin = point(resolution.map_origin) || { x: 0, y: 0 };

  if (!pixelsPerGrid || pixelsPerGrid <= 0) {
    throw new Error("Missing valid resolution.pixels_per_grid");
  }
  if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) {
    throw new Error("Missing valid resolution.map_size");
  }

  const image = normalizeImage(data.image);
  const walls = pathList(data.line_of_sight);
  const objectWalls = pathList(data.objects_line_of_sight);
  const doors = Array.isArray(data.portals)
    ? data.portals
        .map((p) => ({
          closed: p?.closed !== false,
          points: pointPath(p?.bounds),
        }))
        .filter((door) => door.closed && door.points.length >= 2)
    : [];
  const lights = Array.isArray(data.lights)
    ? data.lights
        .map((light) => ({
          position: point(light?.position),
          range: asNumber(light?.range),
          intensity: asNumber(light?.intensity) ?? 1,
          color: typeof light?.color === "string" ? light.color : null,
        }))
        .filter((light) => light.position && light.range && light.range > 0)
    : [];

  return {
    format: data.format,
    dpi: pixelsPerGrid,
    mapSize,
    mapOrigin,
    widthPixels: Math.round(mapSize.x * pixelsPerGrid),
    heightPixels: Math.round(mapSize.y * pixelsPerGrid),
    image,
    walls,
    objectWalls,
    doors,
    lights,
  };
}

function normalizeImage(rawImage) {
  if (typeof rawImage !== "string" || !rawImage.trim()) {
    throw new Error("Missing embedded image data.");
  }
  const compact = rawImage.replace(/\s+/g, "");
  if (compact.startsWith("data:image/")) return compact;

  const mime = compact.startsWith("/9j/")
    ? "image/jpeg"
    : compact.startsWith("UklGR")
      ? "image/webp"
      : "image/png";
  return `data:${mime};base64,${compact}`;
}

function mimeToExtension(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

export async function imageDataUrlToFile(imageDataUrl, baseName) {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const mime = blob.type || "image/png";
  const ext = mimeToExtension(mime);
  return new File([blob], `${baseName}.${ext}`, { type: mime });
}

export function worldPoint(ddPoint, parsed) {
  return {
    x: (ddPoint.x - parsed.mapOrigin.x) * parsed.dpi,
    y: (ddPoint.y - parsed.mapOrigin.y) * parsed.dpi,
  };
}
