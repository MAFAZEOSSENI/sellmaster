const Order = require('../models/Order');

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.updateStatus(req.params.id, status);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await Order.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};