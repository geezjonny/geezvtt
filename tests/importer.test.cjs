const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8')
  .replace(/^import[\s\S]*?from ".*?";\r?\n/gm, '');

function setup({ mapOnly = false, upload, ready = true } = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      checked: id === 'mapOnly' ? mapOnly : true,
      addEventListener() {}, textContent: '', disabled: false,
    });
    return elements.get(id);
  };
  const uploads = [];
  let wallBuilds = 0;
  function chain(target = {}) {
    return new Proxy(target, { get: (_, key) => key === 'build' ? () => target :
      (value) => { target[key] = value; return chain(target); } });
  }
  const context = vm.createContext({
    document: { getElementById: element }, console: { error() {} },
    OBR: {
      onReady: (callback) => callback(),
      assets: { uploadScenes: async (scenes) => {
        uploads.push(...scenes);
        if (upload) await upload();
      } },
      scene: { isReady: async () => ready, items: { addItems: async () => {} } },
    },
    imageDataUrlToFile: async () => ({}),
    buildImageUpload: () => chain(), buildSceneUpload: () => chain(),
    buildWall: () => { wallBuilds++; throw Error('bad wall'); },
  });
  vm.runInContext(source, context);
  vm.runInContext('parsed = {image: "data:image/png;base64,AA", dpi: 100, walls: [[{}, {}]], objectWalls: [], doors: [], lights: []}; refreshButtons();', context);
  return { context, element, uploads, wallBuilds: () => wallBuilds };
}

test('map-only bypasses geometry and blocks overlapping uploads', async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const app = setup({ mapOnly: true, upload: () => pending });
  const first = vm.runInContext('createScene()', app.context);
  await new Promise(setImmediate);
  assert.equal(app.element('createScene').disabled, true);
  assert.equal(app.element('file').disabled, true);
  await vm.runInContext('createScene()', app.context);
  assert.equal(app.uploads.length, 1);
  assert.equal(app.uploads[0].items.length, 0);
  assert.equal(app.wallBuilds(), 0);
  finish();
  await first;
  assert.equal(app.element('createScene').disabled, false);
  assert.equal(app.element('file').disabled, false);
});

test('geometry failures report the stage and restore controls', async () => {
  const app = setup();
  await vm.runInContext('createScene()', app.context);
  assert.match(app.element('status').textContent, /Building scene items/);
  assert.match(app.element('status').textContent, /bad wall/);
  assert.equal(app.element('createScene').disabled, false);
  assert.equal(app.uploads.length, 0);
});

test('upload failures retain structured error details', async () => {
  const app = setup({ mapOnly: true, upload: () => {
    throw { message: 'Denied', code: 403, details: { reason: 'storage' } };
  } });
  await vm.runInContext('createScene()', app.context);
  assert.match(app.element('status').textContent, /Uploading scene to Owlbear/);
  assert.match(app.element('status').textContent, /403/);
  assert.match(app.element('status').textContent, /storage/);
  assert.equal(app.element('createScene').disabled, false);
});

test('adding geometry requires an open scene and restores controls', async () => {
  const app = setup({ ready: false });
  await vm.runInContext('addGeometryToCurrentScene()', app.context);
  assert.match(app.element('status').textContent, /Open a scene/);
  assert.equal(app.wallBuilds(), 0);
  assert.equal(app.element('addGeometry').disabled, false);
});
