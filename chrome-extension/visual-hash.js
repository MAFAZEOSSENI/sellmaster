(function exposeVisualHash(root) {
  'use strict';

  const SIZE = 32;
  const HASH_SIZE = 8;
  const cosine = Array.from({ length: HASH_SIZE }, (_, frequency) =>
    Array.from({ length: SIZE }, (_, position) => Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * SIZE)))
  );

  function hashGrayscalePixels(pixels, width, height) {
    if (!pixels || pixels.length !== SIZE * SIZE || width !== SIZE || height !== SIZE) {
      throw new Error('Image invalide pour la comparaison visuelle.');
    }

    const coefficients = [];
    for (let vertical = 0; vertical < HASH_SIZE; vertical += 1) {
      for (let horizontal = 0; horizontal < HASH_SIZE; horizontal += 1) {
        let coefficient = 0;
        for (let y = 0; y < SIZE; y += 1) {
          const verticalWeight = cosine[vertical][y];
          for (let x = 0; x < SIZE; x += 1) {
            coefficient += pixels[y * SIZE + x] * verticalWeight * cosine[horizontal][x];
          }
        }
        coefficients.push(coefficient);
      }
    }

    const medianValues = coefficients.slice(1).sort((left, right) => left - right);
    const median = medianValues[Math.floor(medianValues.length / 2)];
    let hash = 0n;
    coefficients.forEach((coefficient, index) => {
      if (coefficient > median) hash |= 1n << BigInt(63 - index);
    });
    return hash.toString(16).padStart(16, '0');
  }

  async function hashBlob(blob) {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      throw new Error('La comparaison visuelle nécessite une version récente de Chrome.');
    }
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = new OffscreenCanvas(SIZE, SIZE);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Impossible de préparer l’image pour la comparaison.');
      context.drawImage(bitmap, 0, 0, SIZE, SIZE);
      const image = context.getImageData(0, 0, SIZE, SIZE);
      const grayscale = new Uint8Array(SIZE * SIZE);
      for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
        const offset = pixel * 4;
        grayscale[pixel] = Math.round(image.data[offset] * 0.299 + image.data[offset + 1] * 0.587 + image.data[offset + 2] * 0.114);
      }
      return hashGrayscalePixels(grayscale, SIZE, SIZE);
    } finally {
      bitmap.close();
    }
  }

  function hammingDistance(left, right) {
    if (!/^[a-f0-9]{16}$/i.test(String(left)) || !/^[a-f0-9]{16}$/i.test(String(right))) {
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

  root.SellmasterVisualHash = { hashBlob, hashGrayscalePixels, hammingDistance };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SellmasterVisualHash;
})(globalThis);