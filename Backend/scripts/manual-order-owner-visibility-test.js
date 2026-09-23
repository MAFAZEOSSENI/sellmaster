const { pool } = require('../config/database');
const Order = require('../models/Order');
const User = require('../models/User');

async function ensureUser(email, fullName) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id FROM app_users WHERE email = ?', [email]);
    if (rows.length) {
      return Number(rows[0].id);
    }

    const [result] = await conn.query(
      `INSERT INTO app_users (email, password_hash, phone, full_name, trial_used, order_count, max_orders, license_key, license_expiry)
       VALUES (?, ?, ?, ?, TRUE, 0, 100000, 'manual-test-license', DATE_ADD(NOW(), INTERVAL 365 DAY))`,
      [email, 'hash', '0000000000', fullName]
    );

    return Number(result.insertId);
  } finally {
    conn.release();
  }
}

async function ensureProduct(ownerUserId, name) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id FROM products WHERE name = ? AND user_id = ?', [name, ownerUserId]);
    if (rows.length) {
      return Number(rows[0].id);
    }

    const [result] = await conn.query(
      'INSERT INTO products (name, description, price, stock, user_id) VALUES (?, ?, ?, ?, ?)',
      [name, 'Produit de test', 42.5, 100, ownerUserId]
    );
    return Number(result.insertId);
  } finally {
    conn.release();
  }
}

async function assignFixedRole(userId, roleName) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `DELETE FROM user_roles WHERE user_id = ?`,
      [userId]
    );
    await conn.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT ?, id FROM roles WHERE name = ?`,
      [userId, roleName]
    );
  } finally {
    conn.release();
  }
}

async function main() {
  const ownerId = await ensureUser('owner-a@test.local', 'Owner A');
  const closerId = await ensureUser('closer-c@test.local', 'Closer C');
  const courierId = await ensureUser('courier-b@test.local', 'Courier B');
  const productId = await ensureProduct(ownerId, 'Produit test owner visibility');

  await assignFixedRole(ownerId, 'owner');
  await assignFixedRole(closerId, 'closer');
  await assignFixedRole(courierId, 'courier');

  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO team_memberships (owner_user_id, member_user_id, role_name, status, invited_by, is_working)
       VALUES (?, ?, 'closer', 'active', ?, TRUE), (?, ?, 'courier', 'active', ?, TRUE)
       ON DUPLICATE KEY UPDATE status = VALUES(status), is_working = VALUES(is_working)`,
      [ownerId, closerId, ownerId, ownerId, courierId, ownerId]
    );

    await conn.query(
      `UPDATE app_users
       SET license_key = 'manual-test-license',
           license_expiry = DATE_ADD(NOW(), INTERVAL 365 DAY),
           order_count = 50,
           max_orders = 10
       WHERE id = ?`,
      [ownerId]
    );
  } finally {
    conn.release();
  }

  const closerRole = await User.getFixedRole(closerId);
  const courierRole = await User.getFixedRole(courierId);
  const closerCanAccessProducts = ['manager', 'closer'].includes(closerRole)
    && await User.isActiveTeamMemberForOwner(closerId, ownerId);
  const courierCanAccessProducts = ['manager', 'closer'].includes(courierRole)
    && await User.isActiveTeamMemberForOwner(courierId, ownerId);

  if (!closerCanAccessProducts) {
    throw new Error('❌ Test échoué: le closer de l’équipe ne doit pas être bloqué pour l’accès catalogue');
  }

  if (courierCanAccessProducts) {
    throw new Error('❌ Test échoué: le courier ne doit pas avoir accès au catalogue produit');
  }

  console.log('✅ Test OK: closer autorisé et courier refusé pour le catalogue de l’owner');

  const canCreateAsCourier = await User.canCreateOrderForOwner(courierId, ownerId);
  const canCreateAsCloser = await User.canCreateOrderForOwner(closerId, ownerId);
  if (canCreateAsCourier) {
    throw new Error('❌ Test échoué: le courier ne doit pas pouvoir créer une commande pour cet owner');
  }
  if (!canCreateAsCloser) {
    throw new Error('❌ Test échoué: le closer doit pouvoir créer une commande pour cet owner');
  }

  const courierFixedRole = await User.getFixedRole(courierId);
  if (courierFixedRole !== 'courier') {
    throw new Error('❌ Test échoué: le courier doit conserver le rôle fixe courier');
  }

  console.log('✅ Test OK: closer autorisé, courier refusé pour la création de commande sur l’owner');

  const closerOrderData = {
    clientName: 'Client Test',
    clientPhone: '0102030405',
    clientAddress: '1 rue de test',
    status: 'dashboard',
    totalAmount: 42.5,
    notes: 'ordre manuel',
    items: [{ productId, productName: 'Produit test owner visibility', unitPrice: 42.5, quantity: 1 }],
    ownerId
  };

  await Order.createWithCustomNumber(closerOrderData, closerId);

  const orders = await Order.findAll(ownerId, ownerId);
  const match = orders.find((order) => Number(order.user_id) === Number(ownerId) && Number(order.created_by) === Number(closerId));

  if (!match) {
    console.error('❌ Test échoué: la commande créée par le closer pour owner A n’apparaît pas dans /api/orders de A');
    console.log('Visible orders for owner:', JSON.stringify(orders, null, 2));
    process.exit(1);
  }

  console.log('✅ Test OK: la commande appartient bien à owner A et a été créée par closer C');
  console.log(JSON.stringify({ orderId: match.id, user_id: match.user_id, created_by: match.created_by, custom_order_number: match.custom_order_number }, null, 2));
}

main().catch((error) => {
  console.error('❌ Erreur script:', error);
  process.exit(1);
});
