const express = require('express');
const axios = require('axios');
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

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const remote = String(req.socket?.remoteAddress || req.ip || '').trim();
  const ip = forwarded || remote || '';
  if (!ip) return '';
  return ip.replace(/^::ffff:/, '');
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').trim();
}

async function sendTwilioOtp(phone, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[OTP] Twilio non configuré. Code généré mais non envoyé:', { phone, code });
    return true;
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Votre code Sellmaster est: ${code}`,
  });

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    body.toString(),
    {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 20000,
    }
  );

  return true;
}

async function hasVerifiedPhoneInLastMinutes(publicToken, phone, minutes) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id
       FROM form_otp_codes
       WHERE public_token = $1
         AND phone = $2
         AND verified = TRUE
         AND created_at > NOW() - ($3::int * INTERVAL '1 minute')
       ORDER BY created_at DESC
       LIMIT 1`,
      [publicToken, phone, Number(minutes)]
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

function matchesAllowedCity(city, allowedCities) {
  const haystack = `${String(city || '')} ${String(city || '')}`.toLowerCase();
  const normalized = (allowedCities || [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
  if (!normalized.length) return true;
  return normalized.some((allowedCity) => haystack.includes(allowedCity));
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
      `SELECT id AS product_id, name, price, shopify_product_id, shopify_variant_id
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
        shopify_product_id: product.shopify_product_id == null ? null : String(product.shopify_product_id),
        shopify_variant_id: product.shopify_variant_id == null ? null : String(product.shopify_variant_id),
      })),
    });
  } finally {
    conn.release();
  }
});

router.post('/:token/send-otp', submitLimiter, async (req, res) => {
  const form = await resolvePublishedForm(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });

  const phone = sanitizePhone(req.body?.phone || '');
  if (!phone) return res.status(400).json({ error: 'Téléphone requis' });

  const conn = await getConnection();
  try {
    const [rateLimitRows] = await conn.query(
      `SELECT COUNT(*) AS sends
       FROM form_otp_codes
       WHERE public_token = $1
         AND phone = $2
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [form.public_token, phone]
    );

    if (Number(rateLimitRows?.sends || 0) >= 3) {
      return res.status(429).json({ error: 'Trop de demandes de code. Réessayez plus tard.' });
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await conn.query(
      `INSERT INTO form_otp_codes (public_token, phone, code, expires_at, verified, created_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW())`,
      [form.public_token, phone, code, expiresAt]
    );

    await sendTwilioOtp(phone, code);

    return res.status(200).json({ success: true, message: 'Code envoyé' });
  } catch (error) {
    console.error('[Public order form] OTP send failed:', error.message);
    return res.status(500).json({ error: 'Impossible d’envoyer le code OTP.' });
  } finally {
    conn.release();
  }
});

router.post('/:token/verify-otp', submitLimiter, async (req, res) => {
  const form = await resolvePublishedForm(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formulaire introuvable' });

  const phone = sanitizePhone(req.body?.phone || '');
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) return res.status(400).json({ error: 'Téléphone et code requis' });

  const conn = await getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id, code, expires_at, verified
       FROM form_otp_codes
       WHERE public_token = $1
         AND phone = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [form.public_token, phone]
    );

    const validEntry = rows.find((entry) => {
      const expiresAt = new Date(entry.expires_at);
      return String(entry.code) === code && expiresAt > new Date();
    });

    if (!validEntry) {
      return res.status(400).json({ error: 'Code OTP invalide ou expiré' });
    }

    await conn.query(
      `UPDATE form_otp_codes SET verified = TRUE WHERE id = $1`,
      [validEntry.id]
    );

    return res.status(200).json({ success: true, message: 'Numéro vérifié' });
  } catch (error) {
    console.error('[Public order form] OTP validation failed:', error.message);
    return res.status(500).json({ error: 'Impossible de vérifier le code OTP.' });
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

  const formConfig = publicFieldsConfig(form.fields_config || {});
  if (formConfig.otp_enabled === true) {
    const normalizedPhone = sanitizePhone(formData.phone);
    const isVerified = await hasVerifiedPhoneInLastMinutes(form.public_token, normalizedPhone, 15);
    if (!isVerified) {
      return res.status(403).json({ error: 'Numéro non vérifié' });
    }
  }

  if (Array.isArray(formConfig.allowed_cities) && formConfig.allowed_cities.length > 0) {
    const allowedCities = formConfig.allowed_cities.map((city) => String(city || '').trim().toLowerCase()).filter(Boolean);
    const zoneText = `${String(formData.city || '')} ${String(formData.address || '')}`.toLowerCase();
    const matchesZone = allowedCities.some((allowedCity) => zoneText.includes(allowedCity));
    if (!matchesZone) {
      return res.status(422).json({ error: 'Livraison non disponible dans cette zone' });
    }
  }

  const clientIp = getClientIp(req);

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
      ip: clientIp,
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
