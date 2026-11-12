import test from 'node:test';
import assert from 'node:assert/strict';
import { displayZoom } from '../../src/game/displayScaling.ts';

test('sharp zoom keeps integer physical pixels when that does not waste the viewport', () => {
  assert.equal(displayZoom(1920, 1080, 'pixel-perfect'), 4);
  assert.equal(displayZoom(1366, 768, 'pixel-perfect'), 768 / 270);
  assert.equal(displayZoom(1536, 730, 'pixel-perfect', 1.25), 730 / 270);
  assert.equal(displayZoom(1536, 730, 'pixel-perfect', 1.5), 8 / 3);
  assert.equal(displayZoom(1600, 900, 'pixel-perfect'), 3);
});

test('fit mode and undersized windows preserve the available fractional fit', () => {
  assert.equal(displayZoom(1440, 810, 'fit', 1.25), 3);
  assert.equal(displayZoom(400, 225, 'pixel-perfect', 1.25), 400 / 480);
});

test('invalid device scale falls back safely', () => {
  assert.equal(displayZoom(1440, 810, 'pixel-perfect', Number.NaN), 3);
});
