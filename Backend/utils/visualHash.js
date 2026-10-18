function isValidVisualHash(value) {
  return /^[a-f0-9]{16}$/i.test(String(value || ''));
}

function hammingDistance(left, right) {
  if (!isValidVisualHash(left) || !isValidVisualHash(right)) {
    throw new Error('Empreinte visuelle invalide.');
  }
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += 1;
    value &= value - 1n;
  }
  return distance;
}

function similarityPercent(distance) {
  return Math.max(0, Math.round((1 - distance / 64) * 100));
}

module.exports = { isValidVisualHash, hammingDistance, similarityPercent };