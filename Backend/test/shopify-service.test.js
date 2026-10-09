const assert = require('node:assert/strict');
const {
  extractCustomerPhone,
  extractCustomerIp,
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

const notePhoneOrder = {
  ...shopifyOrder,
  customer: { ...shopifyOrder.customer, phone: null },
  note_attributes: [
    { name: 'Téléphone', value: '+22990000000' },
    { name: 'IP', value: '203.0.113.7' },
  ],
};
assert.equal(
  extractCustomerPhone(notePhoneOrder),
  '+22990000000',
  'Le téléphone doit être lu depuis les attributs Shopify alternatifs',
);
assert.equal(
  extractCustomerIp(notePhoneOrder),
  '203.0.113.7',
  'L’IP doit être lue depuis les attributs Shopify alternatifs',
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

const flexibleAddressOrder = {
  ...shopifyOrder,
  shipping_address: null,
  billing_address: null,
  note_attributes: [
    { name: 'Address', value: 'Rue de test' },
    { name: 'City', value: 'Cotonou' },
  ],
};
assert.equal(
  extractCustomerAddress(flexibleAddressOrder),
  'Rue de test, Cotonou',
  'L’adresse et la ville doivent aussi être reconnues avec des libellés Shopify alternatifs',
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
