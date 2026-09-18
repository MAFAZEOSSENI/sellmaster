const authMiddleware = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/rbacMiddleware');
const Rbac = require('../../models/Rbac');

const adminController = {
  async get(req, res) {
    res.json({
      message: 'API Admin active',
      userId: req.userId,
      allowedRoles: ['owner', 'manager']
    });
  },

  async getUsers(req, res) {
    try {
      const users = await Rbac.getUsersWithRoles();
      res.json({ users });
    } catch (error) {
      console.error('[ADMIN] Fetch users error:', error);
      res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs' });
    }
  },

  async updateUserRoles(req, res) {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: 'Le champ roles doit être un tableau' });
      }

      const normalizedRoles = [...new Set(roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean))];
      await Rbac.setRolesForUser(Number(id), normalizedRoles);

      const updatedUser = (await Rbac.getUsersWithRoles()).find((user) => Number(user.id) === Number(id));

      res.json({
        message: 'Rôles mis à jour',
        user: updatedUser || { id: Number(id), roles: normalizedRoles }
      });
    } catch (error) {
      console.error('[ADMIN] Update roles error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour des rôles' });
    }
  }
};

module.exports = adminController;