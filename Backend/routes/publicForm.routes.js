const express = require('express');
const { rateLimit } = require('express-rate-limit');
const OrderForm = require('../models/OrderForm');
const ShopifyConfig = require('../models/ShopifyConfig');
const ShopifyService = require('../services/ShopifyService');
const License = require('../models/License');
const User = require('../models/User');
const { getConnection } = require('../config/database');

const router = express.Router();
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
});

function publicFieldsConfig(config) {
  return OrderForm.normalizeFieldsConfig(config);
}

function getFormData(body, fieldsConfig) {
  const customerName = String(body.customer_name || '').trim();
  const email = String(body.email || '').trim();
  const phone = fieldsConfig.phone ? String(body.phone || '').trim() : '';
  const city = fieldsConfig.city ? String(body.city || '').trim() : '';
  const address = fieldsConfig.address ? String(body.address || '').trim() : '';
  const deliveryNote = fieldsConfig.delivery_note ? String(body.delivery_note || '').trim().slice(0, 1000) : '';
  const countryOptions = Array.isArray(fieldsConfig.country) ? fieldsConfig.country : [];
  const requestedCountry = String(body.country || '').trim();
  const country = countryOptions.find(option => option.value === requestedCountry || option.label === requestedCountry) || null;
  const shippingOptions = Array.isArray(fieldsConfig.shipping_options) ? fieldsConfig.shipping_options : [];
  const requestedShipping = body.shipping_option;
  const shippingIndex = Number.isInteger(Number(requestedShipping)) && String(requestedShipping).trim() !== ''
    ? Number(requestedShipping)
    : shippingOptions.findIndex(option => option.label === String(requestedShipping || '').trim());
  const shippingOption = shippingOptions.length ? shippingOptions[shippingIndex] || null : null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName) throw new Error('Nom du client requis');
  if (fieldsConfig.product_variant !== true) throw new Error('La sélection de produit doit être activée pour créer une commande');
  if (fieldsConfig.phone && !phone) throw new Error('Téléphone requis');
  if (fieldsConfig.city && !city) throw new Error('Ville requise');
  if (fieldsConfig.address && !address) throw new Error('Adresse requise');
  if (fieldsConfig.delivery_note && !deliveryNote) throw new Error('Heure de livraison souhaitée requise');
  if (countryOptions.length && !country) throw new Error('Sélectionnez un pays valide');
  if (shippingOptions.length && !shippingOption) throw new Error('Sélectionnez une option de livraison valide');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide');
  if (!items.length) throw new Error('Sélectionnez au moins un produit');

  const normalizedItems = items.map(item => {
    const productId = Number(item?.product_id);
    const quantity = fieldsConfig.quantity ? Number(item?.quantity) : 1;
    if (!Number.isInteger(productId) || productId <= 0) throw new Error('Produit invalide');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Quantité invalide');
    return { productId, quantity };
  });

  return {
    customerName,
    email: email || null,
    phone,
    city,
    address,
    deliveryNote,
    country,
    shippingOption: shippingOption ? { label: shippingOption.label, price: Number(shippingOption.price) } : null,
    items: normalizedItems,
  };
}

async function hasActivePaidLicense(ownerId) {
  const owner = await User.findById(ownerId);
  if (!owner?.license_key) return false;
  const license = await License.findByKey(owner.license_key);
  return Boolean(
    license &&
    Number(license.user_id) === Number(ownerId) &&
    license.status === 'activated' &&
    ['3months', '1year'].includes(String(license.type)) &&
    license.expires_at &&
    new Date(license.expires_at) > new Date()
  );
}

async function resolvePublishedForm(token) {
  const form = await OrderForm.findByToken(token);
  if (!form || form.is_published !== true) return null;
  return form;
}

router.get('/:token', async (req, res) => {
  const form = await resolvePublishedForm(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });
  if (!await hasActivePaidLicense(form.owner_user_id)) {
    return res.status(403).json({ error: 'Formulaire indisponible' });
  }

  const configs = await ShopifyConfig.findActiveByOwner(form.owner_user_id);
  if (!configs.length) return res.status(200).json({ fields_config: publicFieldsConfig(form.fields_config), display_mode: form.display_mode === 'popup' ? 'popup' : 'embedded', products: [] });

  const conn = await getConnection();
  try {
    const storeIds = configs.map(config => Number(config.id));
    const [products] = await conn.query(
      `SELECT id AS product_id, name, price
       FROM products
       WHERE user_id = $1
         AND shopify_store_id = ANY($2::int[])
         AND shopify_variant_id IS NOT NULL
       ORDER BY name ASC`,
      [form.owner_user_id, storeIds]
    );
    return res.json({
      fields_config: publicFieldsConfig(form.fields_config),
      display_mode: form.display_mode === 'popup' ? 'popup' : 'embedded',
      products: products.map(product => ({
        product_id: Number(product.product_id),
        name: product.name,
        price: Number(product.price || 0),
      })),
    });
  } finally {
    conn.release();
  }
});

router.post('/:token/submit', submitLimiter, async (req, res) => {
  const form = await resolvePublishedForm(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });
  if (!await hasActivePaidLicense(form.owner_user_id)) {
    return res.status(403).json({ error: 'Formulaire indisponible' });
  }

  let formData;
  try {
    formData = getFormData(req.body || {}, form.fields_config || {});
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const configs = await ShopifyConfig.findActiveByOwner(form.owner_user_id);
  if (!configs.length) return res.status(503).json({ error: 'Boutique Shopify indisponible' });

  const conn = await getConnection();
  let products;
  try {
    const productIds = [...new Set(formData.items.map(item => item.productId))];
    const [rows] = await conn.query(
      `SELECT id, name, price, shopify_variant_id, shopify_store_id
       FROM products
       WHERE user_id = $1
         AND id = ANY($2::int[])
         AND shopify_store_id = ANY($3::int[])
         AND shopify_variant_id IS NOT NULL`,
      [form.owner_user_id, productIds, configs.map(config => Number(config.id))]
    );
    products = rows;
  } finally {
    conn.release();
  }

  const productsById = new Map(products.map(product => [Number(product.id), product]));
  if (productsById.size !== new Set(formData.items.map(item => item.productId)).size) {
    return res.status(400).json({ error: 'Un ou plusieurs produits ne sont pas disponibles' });
  }

  const storeIds = new Set(formData.items.map(item => Number(productsById.get(item.productId).shopify_store_id)));
  if (storeIds.size !== 1) return res.status(400).json({ error: 'Les produits doivent provenir de la même boutique Shopify' });

  const config = configs.find(item => Number(item.id) === [...storeIds][0]);
  if (!config) return res.status(503).json({ error: 'Boutique Shopify indisponible' });

  const service = new ShopifyService(form.owner_user_id);
  try {
    const createdOrder = await service.createOrderFromForm({ ...config, cod_gateway_name: form.cod_gateway_name }, {
      customer_name: formData.customerName,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      address: formData.address,
      delivery_note: formData.deliveryNote,
      country: formData.country,
      shipping_option: formData.shippingOption,
      items: formData.items.map(item => ({
        variantId: productsById.get(item.productId).shopify_variant_id,
        quantity: item.quantity,
        unitPrice: Number(productsById.get(item.productId).price || 0),
      })),
    });
    return res.status(201).json({ success: true, order: createdOrder });
  } catch (error) {
    console.error('[Public order form] Shopify order creation failed:', {
      status: error.response?.status || null,
      message: error.response?.data?.errors || error.message,
    });
    return res.status(502).json({ error: 'Impossible de créer la commande auprès de Shopify' });
  }
});

module.exports = router;
