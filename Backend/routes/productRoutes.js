const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const cache = require('../middleware/cache');

 
router.get('/', cache(30), productController.getAllProducts);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/', cache(30), productController.getAllProducts);

module.exports = router; 
