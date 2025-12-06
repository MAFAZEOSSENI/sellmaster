const express = require('express');
const router = express.Router();
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const statsRoutes = require('./statsRoutes');

router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/stats', statsRoutes);

module.exports = router;