function readCount(stats, key, fallback) {
  const value = Number(stats?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function getDashboardMetrics(stats, orders = [], products = []) {
  const totalOrdersFallback = orders.length;
  const totalOrders = readCount(stats, 'total_orders', totalOrdersFallback);
  const delivered = readCount(stats, 'delivered', orders.filter((order) => order.status === 'livree').length);
  const cancelled = readCount(stats, 'cancelled', orders.filter((order) => order.status === 'annulee').length);
  const postponed = readCount(stats, 'postponed', orders.filter((order) => order.status === 'reportee').length);
  const fallbackRevenue = orders
    .filter((order) => order.status === 'livree')
    .reduce((total, order) => total + (Number(order.total_amount) || 0), 0);
  const revenue = readCount(stats, 'revenue', fallbackRevenue);

  return {
    totalOrders,
    delivered,
    cancelled,
    postponed,
    revenue,
    deliveryRate: totalOrders > 0 ? (delivered / totalOrders) * 100 : 0,
    cancelledOrPostponed: cancelled + postponed,
    productCount: products.length,
  };
}

export function getTeamQueue(orders = []) {
  return orders
    .filter((order) => order.assigned_to != null || order.status === 'dashboard')
    .slice(0, 5);
}

export function getTeamAssignments(orders = []) {
  const grouped = new Map();

  for (const order of orders) {
    if (order.assigned_to == null) continue;
    const userId = Number(order.assigned_to);
    if (!grouped.has(userId)) {
      grouped.set(userId, { userId, total: 0, inProgress: 0, delivered: 0, reported: 0 });
    }

    const summary = grouped.get(userId);
    summary.total += 1;
    if (order.status === 'dashboard') summary.inProgress += 1;
    else if (order.status === 'livree') summary.delivered += 1;
    else if (order.status === 'reportee') summary.reported += 1;
  }

  return [...grouped.values()].sort((left, right) => right.total - left.total);
}
