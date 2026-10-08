const assert = require('node:assert/strict');
const {
  extractCustomerPhone,
  extractCustomerAddress,
  extractShippingMethod,
  formatNotes,
} = require('../utils/shopifyOrderNormalizer');

const shopifyOrder = {
  id: 18928349741150,
  order_number: 1127,
  customer: {
    first_name: 'djelile',
    last_name: 'djelile',
    phone: '+2290156633525',
    email: null,
  },
  shipping_address: null,
  billing_address: {
    phone: '+2290156633525',
    address1: 'Rue de test',
    city: 'Cotonou',
    country: 'Bénin',
  },
  note_attributes: [
    { name: 'Heure de livraison souhaitée', value: '10' },
  ],
  note: 'Commande créée via le formulaire public Sellmaster',
  tags: 'COD, SELLMASTER_FORM',
};

assert.equal(
  extractCustomerPhone(shopifyOrder),
  '+2290156633525',
  'Le téléphone doit être lu depuis customer.phone',
);
assert.equal(
  extractCustomerAddress(shopifyOrder),
  'Rue de test, Cotonou, Bénin',
  'L’adresse doit être construite depuis billing_address',
);

const addressOnlyOrder = {
  ...shopifyOrder,
  shipping_address: null,
  billing_address: null,
  note_attributes: [
    { name: 'Ville', value: 'Cotonou' },
    { name: 'Adresse de livraison', value: 'Rue de test' },
    { name: 'Heure de livraison souhaitée', value: '10' },
  ],
};
assert.equal(
  extractCustomerAddress(addressOnlyOrder),
  'Rue de test, Cotonou',
  'La ville et l’adresse doivent être reconstruites depuis les attributs Shopify',
);
assert.equal(
  extractShippingMethod(shopifyOrder),
  'Standard',
  'La méthode de livraison doit être disponible avec une valeur par défaut',
);
assert.equal(
  formatNotes(shopifyOrder),
  'Heure de livraison souhaitée: 10 | Note: Commande créée via le formulaire public Sellmaster | Tags: COD, SELLMASTER_FORM',
  'Les détails supplémentaires doivent être conservés dans notes',
);

console.log('PASS: normalisation Shopify command #1127');
