const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const User = require('../models/User');
const License = require('../models/License');
const OrderForm = require('../models/OrderForm');

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

router.post('/', async (req, res) => {
  try {
    const form = await OrderForm.create(Number(req.userId), req.body?.fields_config);
    return res.status(201).json({ form });
  } catch (error) {
    console.error('[Order forms] Create failed:', error);
    return res.status(400).json({ error: 'Impossible de créer le formulaire.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const form = await OrderForm.update(req.params.id, Number(req.userId), req.body?.fields_config);
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
    return res.json({ form });
  } catch (error) {
    console.error('[Order forms] Publish update failed:', error);
    return res.status(400).json({ error: 'Impossible de modifier la publication.' });
  }
});

module.exports = router;
