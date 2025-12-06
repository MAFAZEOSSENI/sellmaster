exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      image_url: imageUrl
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    
    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      image_url: null // Pour l'instant, sans image
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    
    const product = await Product.update(req.params.id, {
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock)
    });
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.delete(req.params.id);
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    
    const updateData = {
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock)
    };

    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }

    const product = await Product.update(req.params.id, updateData);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};