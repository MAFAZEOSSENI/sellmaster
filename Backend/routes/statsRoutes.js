const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/dashboard', statsController.getDashboardStats);
router.get('/weekly', statsController.getWeeklyStats);

module.exports = router;