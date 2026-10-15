import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardMetrics, getTeamAssignments, getTeamQueue } from './dashboardMetrics.js';

test('matches Flutter dashboard metrics from the shared daily backend stats', () => {
  const metrics = getDashboardMetrics({
    total_orders: 10,
    delivered: 6,
    cancelled: 1,
    postponed: 2,
    revenue: 125000,
  }, [], [{ id: 1 }, { id: 2 }]);

  assert.deepEqual(metrics, {
    totalOrders: 10,
    delivered: 6,
    cancelled: 1,
    postponed: 2,
    revenue: 125000,
    deliveryRate: 60,
    cancelledOrPostponed: 3,
    productCount: 2,
  });
});

test('falls back to the same order-list calculations when daily stats are absent', () => {
  const metrics = getDashboardMetrics(null, [
    { status: 'livree', total_amount: '500' },
    { status: 'annulee', total_amount: '100' },
    { status: 'reportee', total_amount: '80' },
  ], []);

  assert.equal(metrics.totalOrders, 3);
  assert.equal(metrics.delivered, 1);
  assert.equal(metrics.revenue, 500);
  assert.equal(metrics.deliveryRate, 100 / 3);
  assert.equal(metrics.cancelledOrPostponed, 2);
});

test('matches Flutter team queue and assigned workload summaries', () => {
  const orders = [
    { id: 1, assigned_to: 7, status: 'dashboard' },
    { id: 2, assigned_to: 7, status: 'livree' },
    { id: 3, assigned_to: 8, status: 'reportee' },
    { id: 4, assigned_to: null, status: 'dashboard' },
    { id: 5, assigned_to: null, status: 'livree' },
  ];

  assert.deepEqual(getTeamQueue(orders).map((order) => order.id), [1, 3, 4]);
  assert.deepEqual(getTeamAssignments(orders), [
    { userId: 7, total: 2, inProgress: 1, delivered: 1, reported: 0 },
    { userId: 8, total: 1, inProgress: 0, delivered: 0, reported: 1 },
  ]);
});
