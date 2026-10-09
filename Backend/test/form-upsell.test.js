const assert = require('node:assert/strict');
const FormUpsell = require('../models/FormUpsell');

assert.equal(
  FormUpsell.calculateDiscountedPrice(2500, 10),
  2250,
  'Le prix d’un upsell doit appliquer le pourcentage de réduction sans dépasser la base.'
);
assert.equal(
  FormUpsell.calculateDiscountedPrice(2500, 0),
  2500,
  'Un pourcentage nul ne doit pas modifier le prix de base.'
);

console.log('PASS: upsell discount calculation');
