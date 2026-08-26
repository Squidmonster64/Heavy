import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const js = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

test('Lift Log home and compact topbars keep a Bloody Dave’s Control link', () => {
  assert.match(js, /FAMILY_CONTROL_HREF = 'https:\/\/control\.bloodydaves\.com'/);
  assert.match(js, /class="family-control"/);
  const compact = js.match(/\$\{compactControlLink\}/g) || [];
  assert.ok(compact.length >= 6, `expected compact Control on sub-views, found ${compact.length}`);
});
