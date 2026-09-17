const Rbac = require('../models/Rbac');

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }
      const allowed = await Rbac.hasRole(req.userId, allowedRoles);
      if (!allowed) {
        return res.status(403).json({ error: 'Rôle insuffisant' });
      }
      next();
    } catch (error) {
      console.error('[RBAC] Role check error:', error);
      res.status(500).json({ error: 'Erreur de vérification du rôle' });
    }
  };
}

function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }
      const allowed = await Rbac.hasPermission(req.userId, permissionName);
      if (!allowed) {
        return res.status(403).json({ error: 'Permission insuffisante' });
      }
      next();
    } catch (error) {
      console.error('[RBAC] Permission check error:', error);
      res.status(500).json({ error: 'Erreur de vérification de la permission' });
    }
  };
}

module.exports = { requireRole, requirePermission };