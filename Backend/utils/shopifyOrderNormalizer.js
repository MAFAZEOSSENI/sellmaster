function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesAddressLabel(label) {
  const normalized = normalizeLabel(label);
  return /(?:^|[^a-z])(adresse|address|livraison|delivery)(?:$|[^a-z])/.test(normalized);
}

function matchesCityLabel(label) {
  const normalized = normalizeLabel(label);
  return /(?:^|[^a-z])(ville|city)(?:$|[^a-z])/.test(normalized);
}

function matchesPhoneLabel(label) {
  const normalized = normalizeLabel(label);
  return /(telephone|phone|tel|whatsapp|numero|numéro)/.test(normalized);
}

function matchesIpLabel(label) {
  const normalized = normalizeLabel(label);
  return /(ip|adresse ip|address ip|client ip)/.test(normalized);
}

function extractCustomerPhone(shopifyOrder) {
  const customerPhone = shopifyOrder?.customer?.phone;
  if (customerPhone) return String(customerPhone).trim();

  const notePhone = shopifyOrder?.note_attributes?.find(
    (attribute) => matchesPhoneLabel(attribute?.name),
  );
  if (notePhone?.value) return String(notePhone.value).trim();

  const addressPhone = shopifyOrder?.shipping_address?.phone
    || shopifyOrder?.billing_address?.phone;
  return addressPhone ? String(addressPhone).trim() : '';
}

function extractCustomerIp(shopifyOrder) {
  const directIp = shopifyOrder?.browser_ip
    || shopifyOrder?.customer?.last_order_ip
    || shopifyOrder?.client_details?.browser_ip
    || shopifyOrder?.customer_ip;
  if (directIp) return String(directIp).trim();

  const noteIp = shopifyOrder?.note_attributes?.find(
    (attribute) => matchesIpLabel(attribute?.name),
  );
  if (noteIp?.value) return String(noteIp.value).trim();

  return '';
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

  const attributes = Array.isArray(shopifyOrder?.note_attributes)
    ? shopifyOrder.note_attributes
    : [];
  const addressAttribute = attributes.find(
    (attribute) => matchesAddressLabel(attribute?.name),
  );
  const cityAttribute = attributes.find(
    (attribute) => matchesCityLabel(attribute?.name),
  );
  const parts = [
    addressAttribute?.value,
    cityAttribute?.value,
  ].filter((value) => value && String(value).trim());

  return parts.length > 0
    ? parts.map((value) => String(value).trim()).join(', ')
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
  extractCustomerIp,
  extractCustomerAddress,
  extractShippingMethod,
  formatNotes,
};
