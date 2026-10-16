import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridTransform } from '../src/dd2vtt.js';

const parsed = { dpi: 100, mapOrigin: { x: 1, y: 2 }, widthPixels: 1000 };
const close = (actual, expected) => {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9,
    `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};

test('without an image, grid cells map to scene cells from the map origin', () => {
  const t = gridTransform(parsed, 150);
  close(t.point({ x: 3, y: 2 }), { x: 300, y: 0 });
  assert.equal(t.radius(4), 600);
});

test('an unmoved image at the file DPI matches the default placement', () => {
  const image = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 },
    grid: { dpi: 100, offset: { x: 0, y: 0 } }, image: { width: 1000 } };
  const t = gridTransform(parsed, 150, image);
  close(t.point({ x: 3, y: 2 }), gridTransform(parsed, 150).point({ x: 3, y: 2 }));
  assert.equal(t.radius(4), 600);
});

test('moved, scaled, rotated and resized images carry the geometry with them', () => {
  const image = { position: { x: 500, y: 200 }, rotation: 90, scale: { x: 2, y: 2 },
    grid: { dpi: 50, offset: { x: 10, y: 0 } }, image: { width: 500 } };
  const t = gridTransform(parsed, 150, image);
  // One cell right of the origin is 50 image pixels; minus the 10 px offset is 40 px,
  // 40 px * (150 / 50) * 2 = 240 scene units, then rotated 90 degrees onto +y.
  close(t.point({ x: 2, y: 2 }), { x: 500, y: 440 });
  assert.equal(t.radius(1), 300);
});
