function extractCustomerPhone(shopifyOrder) {
  const customerPhone = shopifyOrder?.customer?.phone;
  if (customerPhone) return String(customerPhone).trim();

  const notePhone = shopifyOrder?.note_attributes?.find(
    (attribute) => String(attribute?.name || '').toLowerCase().includes('phone'),
  );
  if (notePhone?.value) return String(notePhone.value).trim();

  const addressPhone = shopifyOrder?.shipping_address?.phone
    || shopifyOrder?.billing_address?.phone;
  return addressPhone ? String(addressPhone).trim() : '';
}

function extractCustomerAddress(shopifyOrder) {
  const address = shopifyOrder?.shipping_address || shopifyOrder?.billing_address;
  if (address) {
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.province,
      address.country,
      address.zip,
    ].filter((value) => value && String(value).trim());
    if (parts.length > 0) return parts.map((value) => String(value).trim()).join(', ');
  }

  const noteAddress = shopifyOrder?.note_attributes?.find(
    (attribute) => String(attribute?.name || '').toLowerCase().includes('address'),
  );
  return noteAddress?.value
    ? String(noteAddress.value).trim()
    : 'Adresse de livraison non renseignée';
}

function extractShippingMethod(shopifyOrder) {
  const shippingLine = shopifyOrder?.shipping_lines?.[0];
  return shippingLine?.title || 'Standard';
}

function formatNotes(shopifyOrder) {
  const notes = [];
  for (const attribute of shopifyOrder?.note_attributes || []) {
    if (attribute?.name && attribute?.value) {
      notes.push(`${attribute.name}: ${attribute.value}`);
    }
  }
  if (shopifyOrder?.note) notes.push(`Note: ${shopifyOrder.note}`);
  if (shopifyOrder?.tags) notes.push(`Tags: ${shopifyOrder.tags}`);
  return notes.join(' | ');
}

module.exports = {
  extractCustomerPhone,
  extractCustomerAddress,
  extractShippingMethod,
  formatNotes,
};
