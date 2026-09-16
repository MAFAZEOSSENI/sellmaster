const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, orderController.getAllOrders);
router.get('/stats', authMiddleware, orderController.getDashboardStats);
router.get('/:id', authMiddleware, orderController.getOrder);
router.post('/', authMiddleware, orderController.createOrder);
router.patch('/:id/status', authMiddleware, orderController.updateOrderStatus);

module.exports = router; 
