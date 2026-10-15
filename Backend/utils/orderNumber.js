function formatCustomOrderNumber(year, sequenceValue) {
  const numericYear = Number(year);
  const numericSequence = Number(sequenceValue);
  if (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 9999) {
    throw new Error('Année invalide pour la génération du numéro de commande');
  }
  if (!Number.isSafeInteger(numericSequence) || numericSequence < 1) {
    throw new Error('Séquence invalide pour la génération du numéro de commande');
  }

  return `SM-${numericYear}-${String(numericSequence).padStart(6, '0')}`;
}

module.exports = { formatCustomOrderNumber };
