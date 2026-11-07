import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ITERATIONS, open, seal, siteKey, unb64, weakness } from './seal.ts';

const PASSWORD = 'correct horse battery staple';
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await siteKey(PASSWORD, salt);

test('a sealed page opens with the site password, at its own address only', async () => {
  const sealed = await seal(key, salt, '<p>the plan</p>', '/plan');
  assert.equal(sealed.iter, ITERATIONS);
  assert.ok(!JSON.stringify(sealed).includes('plan</p>'));
  const again = await siteKey(PASSWORD, unb64(sealed.salt), sealed.iter);
  assert.equal(await open(again, sealed, '/plan'), '<p>the plan</p>');
  await assert.rejects(async () => open(await siteKey('correct horse battery stapler', salt), sealed, '/plan'), 'a wrong password fails');
  await assert.rejects(open(again, sealed, '/other'), 'moved to another address, it no longer opens');
});

test('a damaged or doctored page never opens', async () => {
  const sealed = await seal(key, salt, 'secret', '/a');
  const flip = (text: string) => (text[0] === 'A' ? 'B' : 'A') + text.slice(1);
  await assert.rejects(open(key, { ...sealed, ct: flip(sealed.ct) }, '/a'));
  await assert.rejects(open(key, { ...sealed, iv: flip(sealed.iv) }, '/a'));
  await assert.rejects(siteKey(PASSWORD, salt, 1000), /unsupported/, 'cheaper guessing is refused');
  await assert.rejects(siteKey(PASSWORD, salt, 1e9), /unsupported/, 'so is a page that would hang the browser');
});

test('two pages share the key, never an IV', async () => {
  const [a, b] = await Promise.all([seal(key, salt, 'same', '/a'), seal(key, salt, 'same', '/a')]);
  assert.equal(a.salt, b.salt);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ct, b.ct);
});

test('weak passwords are refused at build', () => {
  assert.match(weakness(undefined)!, /shorter/);
  assert.match(weakness('short')!, /shorter/);
  assert.match(weakness('aaaaaaaaaaaaaaaaaaaa')!, /different/);
  assert.equal(weakness(PASSWORD), null);
});
