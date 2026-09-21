const License = require('../../models/License');
const User = require('../../models/User');

class LicenseController {
  // Obtenir les licences de l'utilisateur
  static async getUserLicenses(req, res) {
    try {
      const licenses = await License.findByUserId(req.userId);
      res.json({ licenses });
    } catch (error) {
      console.error('Erreur récupération licences:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des licences' });
    }
  }

  // Activer une licence manuellement (pour tests)
  static async activateLicense(req, res) {
    try {
      const { licenseKey } = req.body;

      if (!licenseKey) {
        return res.status(400).json({ error: 'Clé de licence requise' });
      }

      const license = await License.activate(licenseKey);
      
      res.json({
        message: 'Licence activée avec succès! 🎉',
        license: {
          key: license.license_key,
          type: license.type,
          expiresAt: license.expires_at
        }
      });
    } catch (error) {
      console.error('Erreur activation licence:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Vérifier le statut de la licence utilisateur
  static async getLicenseStatus(req, res) {
    try {
      const { ownerId } = req.query;
      const effectiveOwnerId = ownerId && Number(ownerId) > 0 ? Number(ownerId) : req.userId;

      if (Number(req.userId) !== effectiveOwnerId) {
        const isActiveMembership = await User.isActiveTeamMemberForOwner(Number(req.userId), effectiveOwnerId);
        if (!isActiveMembership) {
          return res.status(403).json({
            error: 'Vous n’êtes pas autorisé à consulter la licence de cet e-commerçant.',
            code: 'INVALID_OWNER'
          });
        }
      }

      const user = await User.findById(effectiveOwnerId);
      if (!user) {
        return res.status(404).json({ error: 'Propriétaire non trouvé' });
      }
      
      let licenseStatus = 'none';
      let remainingDays = 0;

      if (user.license_key) {
        const license = await License.findByKey(user.license_key);
        if (license && license.status === 'activated') {
          const now = new Date();
          const expiry = new Date(license.expires_at);
          remainingDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          
          if (remainingDays > 0) {
            licenseStatus = 'active';
          } else {
            licenseStatus = 'expired';
          }
        }
      }

      res.json({
        ownerId: effectiveOwnerId,
        licenseStatus,
        remainingDays,
        orderCount: user.order_count,
        maxOrders: user.max_orders,
        remainingOrders: user.max_orders - user.order_count
      });
    } catch (error) {
      console.error('Erreur statut licence:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification du statut' });
    }
  }

  // Générer une licence de test (pour développement)
  static async generateTestLicense(req, res) {
  try {
    console.log('🔑 Génération licence test pour user:', req.userId, req.body);
    
    const { type = '3months' } = req.body;
    const price = type === '3months' ? 5000 : 15000;

    console.log('📝 Données licence:', { type, price });

    const license = await License.create({
      userId: req.userId,
      type,
      price,
      paymentMethod: 'test',
      monerooPaymentId: 'test_' + Date.now()
    });

    console.log('✅ Licence créée:', license);

    // Activer automatiquement pour les tests
    await License.activate(license.licenseKey);
    console.log('🎯 Licence activée');

    res.json({
      message: 'Licence de test générée et activée! 🎉',
      license: {
        key: license.licenseKey,
        type: license.type,
        price: license.price,
        expiresAt: license.expiresAt
      }
    });
  } catch (error) {
    console.error('❌ Erreur détaillée génération licence test:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la génération de la licence',
      details: error.message 
    });
  }
}
}

module.exports = LicenseController;