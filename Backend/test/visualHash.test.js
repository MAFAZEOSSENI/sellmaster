const test = require('node:test');
const assert = require('node:assert/strict');
const { hashGrayscalePixels, hammingDistance } = require('../../chrome-extension/visual-hash');
const { isValidVisualHash, similarityPercent } = require('../utils/visualHash');

function samplePixels(offset = 0) {
  return Uint8Array.from({ length: 32 * 32 }, (_, index) => 60 + ((index * 37 + Math.floor(index / 32) * 19) % 120) + offset);
}

test('visual hash is stable across a uniform brightness shift', () => {
  const original = hashGrayscalePixels(samplePixels(), 32, 32);
  const brighter = hashGrayscalePixels(samplePixels(20), 32, 32);

  assert.match(original, /^[a-f0-9]{16}$/);
  assert.equal(brighter, original);
  assert.equal(hammingDistance(original, brighter), 0);
});

test('visual hash separates structurally different images', () => {
  const original = hashGrayscalePixels(samplePixels(), 32, 32);
  const inverted = hashGrayscalePixels(Uint8Array.from(samplePixels(), value => 255 - value), 32, 32);

  assert.ok(hammingDistance(original, inverted) > 0);
});

test('visual match score is derived from 64-bit Hamming distance', () => {
  assert.equal(isValidVisualHash('0123456789abcdef'), true);
  assert.equal(isValidVisualHash('not-a-hash'), false);
  assert.equal(similarityPercent(0), 100);
  assert.equal(similarityPercent(16), 75);
  assert.equal(similarityPercent(64), 0);
});