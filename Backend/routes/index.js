const express = require('express');
const router = express.Router();
const statsRoutes = require('./statsRoutes');

router.use('/stats', statsRoutes);

module.exports = router;