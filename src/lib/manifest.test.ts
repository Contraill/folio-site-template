import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestFile } from './manifest.ts';

test('the manifest is site.yaml, or the old folio.yaml; both at once stops the build', () => {
  assert.equal(manifestFile((p) => p === 'site.yaml'), 'site.yaml');
  assert.equal(manifestFile((p) => p === 'folio.yaml'), 'folio.yaml');
  assert.equal(manifestFile(() => false), 'site.yaml');
  assert.throws(() => manifestFile(() => true), /keep only site.yaml/);
});
