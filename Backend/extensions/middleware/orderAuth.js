const User = require('../../models/User');

const orderAuth = async (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // 🆕 VÉRIFIER SI L'UTILISATEUR PEUT CRÉER DES COMMANDES
    const canCreate = await User.canCreateOrder(req.userId);
    
    if (!canCreate) {
      return res.status(403).json({ 
        error: 'Limite de commandes atteinte',
        details: 'Vous avez atteint la limite de votre essai gratuit. Veuillez acheter une licence pour continuer.',
        code: 'TRIAL_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur middleware orderAuth:', error);
    res.status(500).json({ error: 'Erreur de vérification des permissions' });
  }
};

module.exports = orderAuth;