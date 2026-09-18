const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/rbacMiddleware');
const adminController = require('./adminController');
const router = express.Router();

router.get('/', authMiddleware, requireRole('owner', 'manager'), adminController.get);
router.get('/users', authMiddleware, requireRole('owner', 'manager'), adminController.getUsers);
router.patch('/users/:id/roles', authMiddleware, requireRole('owner'), adminController.updateUserRoles);

module.exports = router;