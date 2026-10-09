const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const User = require('../models/User');
const License = require('../models/License');
const OrderForm = require('../models/OrderForm');
const FormUpsell = require('../models/FormUpsell');
const ShopifyConfig = require('../models/ShopifyConfig');

const router = express.Router();
router.use(authMiddleware, requireRole('owner'));

async function requireActivePaidLicense(req, res, next) {
  try {
    const owner = await User.findById(Number(req.userId));
    const license = owner?.license_key ? await License.findByKey(owner.license_key) : null;
    const valid = Boolean(
      license &&
      Number(license.user_id) === Number(req.userId) &&
      license.status === 'activated' &&
      ['3months', '1year'].includes(String(license.type)) &&
      license.expires_at &&
      new Date(license.expires_at) > new Date()
    );
    if (!valid) return res.status(403).json({ error: 'Une licence payante active est requise.' });
    return next();
  } catch (error) {
    console.error('[Order forms] License validation error:', error);
    return res.status(500).json({ error: 'Impossible de vérifier la licence.' });
  }
}

router.use(requireActivePaidLicense);

router.get('/', async (req, res) => {
  try {
    return res.json({ forms: await OrderForm.findByOwner(Number(req.userId)) });
  } catch (error) {
    console.error('[Order forms] List failed:', error);
    return res.status(500).json({ error: 'Impossible de charger les formulaires.' });
  }
});

async function findOwnedFormById(req, res) {
  const formId = Number(req.params.id || req.params.formId || req.params.orderFormId);
  const forms = await OrderForm.findByOwner(Number(req.userId));
  const form = forms.find((item) => Number(item.id) === Number(formId));
  if (!form) {
    res.status(404).json({ error: 'Formulaire introuvable.' });
    return null;
  }
  return form;
}

router.get('/:id/upsells', async (req, res) => {
  try {
    const form = await findOwnedFormById(req, res);
    if (!form) return;
    return res.json({ upsells: await FormUpsell.findByFormId(form.id) });
  } catch (error) {
    console.error('[Order forms] Upsells list failed:', error);
    return res.status(500).json({ error: 'Impossible de charger les upsells.' });
  }
});

router.post('/:id/upsells', async (req, res) => {
  try {
    const form = await findOwnedFormById(req, res);
    if (!form) return;

    const payload = req.body || {};
    const upsell = await FormUpsell.create({
      orderFormId: form.id,
      productVariantId: payload.product_variant_id ?? payload.productVariantId,
      title: payload.title,
      discountPercent: payload.discount_percent ?? payload.discountPercent ?? 0,
      position: payload.position ?? 0,
      isActive: payload.is_active !== false,
    });

    return res.status(201).json({ upsell });
  } catch (error) {
    console.error('[Order forms] Upsell create failed:', error);
    return res.status(400).json({ error: error.message || 'Impossible de créer l’upsell.' });
  }
});

router.put('/:id/upsells/:upsellId', async (req, res) => {
  try {
    const form = await findOwnedFormById(req, res);
    if (!form) return;

    const current = await FormUpsell.findById(req.params.upsellId);
    if (!current || Number(current.order_form_id) !== Number(form.id)) {
      return res.status(404).json({ error: 'Upsell introuvable.' });
    }

    const updated = await FormUpsell.update(
      req.params.upsellId,
      form.id,
      {
        title: req.body?.title ?? current.title,
        product_variant_id: req.body?.product_variant_id ?? req.body?.productVariantId ?? current.product_variant_id,
        discount_percent: req.body?.discount_percent ?? req.body?.discountPercent ?? current.discount_percent,
        position: req.body?.position ?? current.position,
        is_active: req.body?.is_active ?? current.is_active,
      }
    );

    return res.json({ upsell: updated });
  } catch (error) {
    console.error('[Order forms] Upsell update failed:', error);
    return res.status(400).json({ error: error.message || 'Impossible de mettre à jour l’upsell.' });
  }
});

router.delete('/:id/upsells/:upsellId', async (req, res) => {
  try {
    const form = await findOwnedFormById(req, res);
    if (!form) return;

    const deleted = await FormUpsell.delete(req.params.upsellId, form.id);
    if (!deleted) return res.status(404).json({ error: 'Upsell introuvable.' });
    return res.json({ upsell: deleted, deleted: true });
  } catch (error) {
    console.error('[Order forms] Upsell delete failed:', error);
    return res.status(400).json({ error: error.message || 'Impossible de supprimer l’upsell.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const form = await OrderForm.create(Number(req.userId), req.body?.fields_config, req.body?.cod_gateway_name, req.body?.display_mode || 'embedded');
    return res.status(201).json({ form });
  } catch (error) {
    console.error('[Order forms] Create failed:', error);
    return res.status(400).json({ error: 'Impossible de créer le formulaire.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const form = await OrderForm.update(
      req.params.id,
      Number(req.userId),
      req.body?.fields_config,
      req.body?.cod_gateway_name,
      req.body?.display_mode || 'embedded'
    );
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable.' });
    return res.json({ form });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Configuration invalide.' });
  }
});

router.patch('/:id/publish', async (req, res) => {
  try {
    if (typeof req.body?.is_published !== 'boolean') {
      return res.status(400).json({ error: 'is_published doit être un booléen.' });
    }
    const action = req.body.is_published ? OrderForm.publish : OrderForm.unpublish;
    const form = await action.call(OrderForm, req.params.id, Number(req.userId));
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable.' });
    if (!req.body.is_published) return res.json({ form });

    const stores = await ShopifyConfig.findActiveByOwner(Number(req.userId));
    const warning = stores.length
      ? `Vérification Shopify impossible : l’API ne publie pas la liste des moyens de paiement manuels. Confirmez que « ${form.cod_gateway_name} » correspond EXACTEMENT au moyen créé dans Shopify (Réglages > Paiements), sinon la création de commande échouera ou son statut pourra être incorrect.`
      : 'Aucune boutique Shopify active n’est connectée. Connectez une boutique et vérifiez son moyen de paiement manuel avant de recevoir des commandes.';
    return res.json({ form, gateway_verified: false, warning });
  } catch (error) {
    console.error('[Order forms] Publish update failed:', error);
    return res.status(400).json({ error: 'Impossible de modifier la publication.' });
  }
});

module.exports = router;
