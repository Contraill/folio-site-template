import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leaked, readablePieces } from './leaks.ts';

const page = '---\ntitle: Travel plans\n---\nWe meet at the *north gate* on the second morning.\nBring the blue folder.\n';

test('any readable stretch of a sealed page is caught, whole or in part', () => {
  const pieces = readablePieces('Travel plans', page);
  assert.equal(leaked('<p>We meet at the north gate on the second morning</p>', pieces), 'We meet at the north gate on the second morning');
  assert.ok(leaked('…the north gate on the…', pieces), 'four words in a row are enough');
  assert.ok(leaked('<title>Travel plans</title>', pieces), 'the title too');
  assert.equal(leaked('{"ct":"q83hd9…","iv":"…"} We meet. Bring.', pieces), null, 'ciphertext and common words are not');
});
