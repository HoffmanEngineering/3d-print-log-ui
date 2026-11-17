import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// The G-code viewer runs in an iframe the app writes itself, and adapter.js is
// its message endpoint. Any frame that can reach it (an ad, through top.frames)
// could post START_LOAD_GCODE, so it must take messages from its parent only.
const source = readFileSync(
  new URL('../src/assets/js/gcode-viewer/adapter.js', import.meta.url),
  'utf8'
);

function loadAdapter() {
  const listeners = [];
  const loaded = [];
  const parent = { postMessage: () => {} };
  const window = {
    parent,
    addEventListener: (type, listener) => {
      if (type === 'message') listeners.push(listener);
    },
  };
  const GCODE = {
    gCodeReader: { setOption: () => {}, loadFile: (g) => loaded.push(g) },
  };
  runInNewContext(source, { window, GCODE });
  const send = (eventSource, data) =>
    listeners.forEach((listener) => listener({ source: eventSource, data }));
  return { parent, loaded, send };
}

test('the adapter loads G-code its parent sends', () => {
  const { parent, loaded, send } = loadAdapter();

  send(parent, { type: 'START_LOAD_GCODE', gcode: 'G28' });

  assert.deepEqual(loaded, ['G28']);
});

test('the adapter ignores G-code from any other window', () => {
  const { loaded, send } = loadAdapter();

  send({}, { type: 'START_LOAD_GCODE', gcode: 'from a sibling frame' });
  send(null, { type: 'START_LOAD_GCODE', gcode: 'no source' });

  assert.deepEqual(loaded, []);
});

test('the adapter tolerates a message whose data is not an object', () => {
  const { parent, send } = loadAdapter();

  assert.doesNotThrow(() => {
    send(parent, null);
    send(parent, 'text');
  });
});
