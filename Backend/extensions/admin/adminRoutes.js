const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { requireRole } = require('../../middleware/rbacMiddleware');
const adminController = require('./adminController');
const router = express.Router();

router.get('/', authMiddleware, requireRole('owner', 'manager'), adminController.get);
router.get('/users', authMiddleware, requireRole('owner', 'manager'), adminController.getUsers);
router.get('/users/search', authMiddleware, requireRole('owner', 'manager'), adminController.searchUsers);
router.get('/team', authMiddleware, requireRole('owner', 'manager', 'closer'), adminController.getTeamMembers);
router.get('/my-teams', authMiddleware, adminController.getMyTeams);
router.patch('/my-teams/:membershipId', authMiddleware, adminController.updateMyTeam);
router.patch('/my-teams/:membershipId/commission', authMiddleware, requireRole('owner', 'manager'), adminController.updateCloserCommission);
router.get('/members/pending', authMiddleware, adminController.getPendingMemberships);
router.post('/members/create', authMiddleware, requireRole('owner', 'manager'), adminController.createMember);
router.post('/members/invite', authMiddleware, requireRole('owner', 'manager'), adminController.inviteMember);
router.patch('/members/:id/approve', authMiddleware, requireRole('owner', 'manager'), adminController.approveMember);
router.patch('/members/confirm', authMiddleware, adminController.confirmMember);

module.exports = router;