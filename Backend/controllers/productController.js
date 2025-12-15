// controllers/productController.js - VERSION CORRIGÉE
const Product = require('../models/Product');

const productController = {
  // ✅ GET /api/products - CORRIGÉ
  async getProducts(req, res) {
    try {
      console.log('🛍️ [Controller] Récupération produits pour user:', req.userId);
      
      const products = await Product.findAll(req.userId);
      
      console.log('📦 [Controller] Résultat brut:', {
        type: typeof products,
        isArray: Array.isArray(products),
        length: products ? products.length : 0
      });
      
      // ✅ CORRECTION : Gérer le format [data, metadata]
      let cleanProducts;
      
      if (Array.isArray(products)) {
        if (products.length >= 2) {
          // Vérifier si c'est le format [[data], [metadata]]
          const firstItem = products[0];
          const secondItem = products[1];
          
          if (Array.isArray(firstItem) && Array.isArray(secondItem)) {
            // Format [[data], [metadata]] de Render
            console.log('⚠️  Format [data, metadata] détecté (Render)');
            cleanProducts = firstItem;
          } else if (secondItem && secondItem.name === 'id') {
            // Format [data, metadata] avec metadata comme objet
            console.log('⚠️  Métadonnées dans le résultat');
            cleanProducts = firstItem || [];
          } else {
            // Format normal [data]
            console.log('✅ Format normal [data] (Local)');
            cleanProducts = products;
          }
        } else {
          // Format normal [data]
          cleanProducts = products;
        }
      } else {
        console.log('❌ products n\'est pas un tableau');
        cleanProducts = [];
      }
      
      // Convertir les prix string en number
      if (Array.isArray(cleanProducts)) {
        cleanProducts = cleanProducts.map(product => {
          if (product && typeof product.price === 'string') {
            return { ...product, price: parseFloat(product.price) };
          }
          return product;
        });
      }
      
      console.log(`✅ [Controller] ${cleanProducts.length} produits envoyés`);
      res.json(cleanProducts);
      
    } catch (error) {
      console.error('❌ [Controller] Erreur:', error);
      res.status(500).json({ error: error.message });
    }
  },
  
  // ✅ POST /api/products
  async createProduct(req, res) {
    try {
      const { name, description, price, stock } = req.body;
      const product = await Product.create(req.body, req.userId);
      res.status(201).json(product);
    } catch (error) {
      console.error('❌ Erreur création:', error);
      res.status(400).json({ error: error.message });
    }
  },
  
  // ✅ GET /api/products/:id
  async getProductById(req, res) {
    try {
      const product = await Product.findById(req.params.id, req.userId);
      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ✅ PUT /api/products/:id
  async updateProduct(req, res) {
    try {
      const { name, description, price, stock } = req.body;

      const updateData = {
        name,
        description: description || '',
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        image_url: undefined
      };

      if (req.file) {
        updateData.image_url = `/uploads/${req.file.filename}`;
      }

      // Remove undefined fields so Product.update won't break parsing
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const product = await Product.update(req.params.id, updateData, req.userId);
      res.json(product);
    } catch (error) {
      console.error('❌ Erreur update:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // ✅ DELETE /api/products/:id
  async deleteProduct(req, res) {
    try {
      const deleted = await Product.delete(req.params.id, req.userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Produit non trouvé ou non autorisé' });
      }
      res.json({ message: 'Produit supprimé' });
    } catch (error) {
      console.error('❌ Erreur delete:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;

// Aliases pour compatibilité avec d'anciens noms de routes
productController.getAllProducts = productController.getProducts;
productController.getProduct = productController.getProductById;
