const Order = require('../models/Order');
const Product = require('../models/Product');

exports.getDashboardStats = async (req, res) => {
  try {
    const orders = await Order.findAll();
    const products = await Product.findAll();
    
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => 
      order.created_at.toISOString().split('T')[0] === today
    );

    const stats = {
      general: {
        totalOrders: orders.length,
        totalProducts: products.length,
        totalRevenue: orders
          .filter(o => o.status === 'livree')
          .reduce((sum, order) => sum + parseFloat(order.total_amount), 0)
      },
      today: {
        orders: todayOrders.length,
        revenue: todayOrders
          .filter(o => o.status === 'livree')
          .reduce((sum, order) => sum + parseFloat(order.total_amount), 0),
        delivered: todayOrders.filter(o => o.status === 'livree').length,
        cancelled: todayOrders.filter(o => o.status === 'annulee').length,
      },
      status: {
        delivered: orders.filter(o => o.status === 'livree').length,
        cancelled: orders.filter(o => o.status === 'annulee').length,
        postponed: orders.filter(o => o.status === 'reportee').length,
        dashboard: orders.filter(o => o.status === 'dashboard').length,
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWeeklyStats = async (req, res) => {
  try {
    const orders = await Order.findAll();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyOrders = orders.filter(order => 
      new Date(order.created_at) >= oneWeekAgo
    );

    // Grouper par jour
    const dailyStats = {};
    weeklyOrders.forEach(order => {
      const date = order.created_at.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, orders: 0, delivered: 0 };
      }
      
      dailyStats[date].orders++;
      if (order.status === 'livree') {
        dailyStats[date].revenue += parseFloat(order.total_amount);
        dailyStats[date].delivered++;
      }
    });

    res.json(dailyStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};