const User = require('../../models/User');

const orderAuth = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const requestedOwnerId = req.body && req.body.ownerId !== undefined && req.body.ownerId !== null && String(req.body.ownerId).trim() !== ''
      ? Number(req.body.ownerId)
      : Number(req.userId);

    const canCreate = await User.canCreateOrder(req.userId, requestedOwnerId);
    if (!canCreate) {
      const validMembership = requestedOwnerId !== Number(req.userId)
        ? await User.isActiveTeamMemberForOwner(req.userId, requestedOwnerId)
        : true;

      return res.status(403).json({
        error: validMembership
          ? 'Limite de commandes atteinte pour cet e-commerçant.'
          : 'Vous n’êtes pas autorisé à créer une commande pour cet e-commerçant.',
        details: validMembership
          ? 'L’e-commerçant cible a atteint sa limite de commandes / licence.'
          : 'Le propriétaire cible doit être un owner actif dans votre équipe.',
        code: validMembership ? 'TRIAL_EXPIRED' : 'INVALID_OWNER'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur middleware orderAuth:', error);
    res.status(500).json({ error: 'Erreur de vérification des permissions' });
  }
};

module.exports = orderAuth;