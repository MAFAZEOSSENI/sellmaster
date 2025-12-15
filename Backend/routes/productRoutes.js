const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ ROUTES CORRIGÉES (pas de duplication)
router.get('/', authMiddleware, productController.getAllProducts);
router.get('/:id', authMiddleware, productController.getProduct);
router.post('/', authMiddleware, upload.single('image'), productController.createProduct);
router.put('/:id', authMiddleware, upload.single('image'), productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
