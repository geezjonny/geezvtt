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

/**
 * Maps DD2VTT grid-cell coordinates to Owlbear scene coordinates.
 *
 * Owlbear scales every image so one image grid cell (image.grid.dpi pixels)
 * covers one scene cell (sceneDpi units), then applies the item's position,
 * rotation and scale around its grid offset. Without an image, the map is
 * assumed to sit unscaled at the scene origin, as "Create new scene" places it.
 */
export function gridTransform(parsed, sceneDpi, image = null) {
  const origin = parsed.mapOrigin;
  if (!image) {
    return {
      point: (p) => ({ x: (p.x - origin.x) * sceneDpi, y: (p.y - origin.y) * sceneDpi }),
      radius: (cells) => cells * sceneDpi,
    };
  }

  // Image pixels per DD2VTT cell, in case the uploaded image was resized.
  const resized = image.image?.width > 0 ? image.image.width / parsed.widthPixels : 1;
  const pixelsPerCell = parsed.dpi * resized;
  const toScene = sceneDpi / image.grid.dpi;
  const offset = image.grid.offset ?? { x: 0, y: 0 };
  const scaleX = image.scale.x * toScene;
  const scaleY = image.scale.y * toScene;
  const angle = (image.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    point: (p) => {
      const x = ((p.x - origin.x) * pixelsPerCell - offset.x) * scaleX;
      const y = ((p.y - origin.y) * pixelsPerCell - offset.y) * scaleY;
      return { x: image.position.x + x * cos - y * sin, y: image.position.y + x * sin + y * cos };
    },
    radius: (cells) => cells * pixelsPerCell * toScene * (Math.abs(image.scale.x) + Math.abs(image.scale.y)) / 2,
  };
}
