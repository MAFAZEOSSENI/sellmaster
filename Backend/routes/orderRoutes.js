const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getDashboardStats);
router.get('/:id', orderController.getOrder);
router.post('/', orderController.createOrder);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router; 
