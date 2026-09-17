const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/rbacMiddleware');
const router = express.Router();

router.get('/', authMiddleware, requireRole('owner', 'manager'), (req, res) => {
  res.json({
    message: 'API Admin - base RBAC active',
    userId: req.userId,
    allowedRoles: ['owner', 'manager']
  });
});

module.exports = router;