require('dotenv').config();
const authMiddleware = require('./middleware/authMiddleware');
const orderAuth = require('./extensions/middleware/orderAuth');
const User = require('./models/User');
const Rbac = require('./models/Rbac');
const express = require('express');
const cors = require('cors');
const path = require('path');
const createTables = require('./database/init');
const { getConnection } = require('./config/database');
const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./extensions/auth/authRoutes');
const licenseRoutes = require('./extensions/licenses/licenseRoutes');
const paymentRoutes = require('./extensions/payments/paymentRoutes');
const adminRoutes = require('./extensions/admin/adminRoutes');

// Middleware de base
app.use(cors({
  origin: true, // Autorise TOUTES les origines
  credentials: true, // ESSENTIEL pour les tokens/cookies
  exposedHeaders: ['Authorization'], // ESSENTIEL pour que mobile puisse lire le header
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

// Pour les webhooks Shopify, il faut traiter le body brut (signature HMAC)
app.use('/api/shopify/webhook', express.raw({ type: 'application/json', limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: '*/*', limit: '10mb' }));
app.use((req, res, next) => {
  console.log('[SERVER] incoming', req.method, req.originalUrl, 'content-type=', req.headers['content-type'], 'body=', req.body ? JSON.stringify(req.body).slice(0, 400) : '<empty>');
  next();
});
// Middleware pour set les headers CORS explicitement
app.use((req, res, next) => {
  // Set headers CORS
  const origin = req.headers.origin;
  
  // Autoriser toutes les origines avec credentials
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Authorization, Content-Length');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  // Pour les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware pour gérer les BigInt
const bigIntHandler = () => {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      const stringifiedData = JSON.stringify(data, (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
      });
      res.setHeader('Content-Type', 'application/json');
      res.send(stringifiedData);
    };
    next();
  };
};

app.use(bigIntHandler());

// Service fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import des modèles
const Product = require('./models/Product');
const Order = require('./models/Order');

async function ensureOwnerMemberAccess(req, res, effectiveOwnerId, resourceLabel = 'cette ressource') {
  if (!effectiveOwnerId || Number(req.userId) === Number(effectiveOwnerId)) {
    return null;
  }

  const fixedRole = await User.getFixedRole(req.userId);

  if (fixedRole === 'courier') {
    return res.status(403).json({
      error: "Les livreurs n'ont pas accès au catalogue produits.",
      code: 'COURIER_FORBIDDEN'
    });
  }

  if (!['manager', 'closer'].includes(fixedRole)) {
    return res.status(403).json({
      error: `Vous n’êtes pas autorisé à ${resourceLabel} pour cet e-commerçant.`,
      code: 'INVALID_MEMBER_ROLE'
    });
  }

  const isActiveMembership = await User.isActiveTeamMemberForOwner(Number(req.userId), effectiveOwnerId);
  if (!isActiveMembership) {
    return res.status(403).json({
      error: 'Vous n’êtes pas autorisé à accéder à cet e-commerçant.',
      code: 'INVALID_OWNER'
    });
  }

  return null;
}

// Import des routes Shopify
const shopifyRoutesV2 = require('./routes/shopify.routes'); // Nouveau fichier
app.use('/api/shopify', shopifyRoutesV2);

// ==================== ROUTES API ====================

// Routes Produits
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const effectiveOwnerId = ownerId && Number(ownerId) > 0 ? Number(ownerId) : null;
    console.log('🛍️  Récupération produits pour user:', req.userId, 'ownerId:', effectiveOwnerId);

    if (effectiveOwnerId && Number(req.userId) !== effectiveOwnerId) {
      const denied = await ensureOwnerMemberAccess(req, res, effectiveOwnerId, 'consulter les produits');
      if (denied) {
        return denied;
      }
    }

    const products = await Product.findAll(req.userId, effectiveOwnerId);
    const jsonProducts = JSON.parse(JSON.stringify(products));
    res.json(jsonProducts);
  } catch (error) {
    console.error('❌ Erreur produits:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, cost_price, stock, ownerId } = req.body;
    const effectiveOwnerId = ownerId && Number(ownerId) > 0 ? Number(ownerId) : req.userId;

    if (Number(req.userId) !== effectiveOwnerId) {
      const denied = await ensureOwnerMemberAccess(req, res, effectiveOwnerId, 'créer un produit');
      if (denied) {
        return denied;
      }
    }

    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      cost_price: cost_price === undefined || cost_price === null || cost_price === ''
        ? null
        : parseFloat(cost_price),
      stock: parseInt(stock),
      image_url: null
    }, req.userId, effectiveOwnerId);

    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/products/profitability', authMiddleware, getProductProfitability);

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, cost_price, stock } = req.body;
    const product = await Product.update(req.params.id, {
      name,
      description,
      price,
      cost_price,
      stock,
    }, req.userId);
    res.json(product);
  } catch (error) {
    console.error('❌ Erreur mise à jour produit:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const effectiveOwnerId = ownerId && Number(ownerId) > 0 ? Number(ownerId) : null;

    if (effectiveOwnerId && Number(req.userId) !== effectiveOwnerId) {
      const denied = await ensureOwnerMemberAccess(req, res, effectiveOwnerId, 'consulter ce produit');
      if (denied) {
        return denied;
      }
    }

    const product = await Product.findById(req.params.id, req.userId, effectiveOwnerId);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROUTES COMMANDES ====================

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { ownerId } = req.query;
    console.log('📦 Récupération commandes pour user:', req.userId, 'ownerId:', ownerId);

    const orders = await Order.findAll(req.userId, ownerId || null);
    res.json(orders);
  } catch (error) {
    console.error('❌ Erreur récupération commandes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 REMPLACER l'ancienne route POST /api/orders
app.post('/api/orders', authMiddleware, orderAuth, async (req, res) => {
  try {
    const ownerIdFromBody = req.body && req.body.ownerId !== undefined && req.body.ownerId !== null && String(req.body.ownerId).trim() !== ''
      ? Number(req.body.ownerId)
      : null;

    const effectiveOwnerId = ownerIdFromBody !== null ? ownerIdFromBody : Number(req.userId);

    if (ownerIdFromBody !== null && Number(req.userId) !== effectiveOwnerId) {
      const denied = await ensureOwnerMemberAccess(req, res, effectiveOwnerId, 'créer une commande');
      if (denied) {
        return denied;
      }
    }

    console.log('📦 Création commande avec numéro personnalisé pour user:', req.userId, 'owner:', effectiveOwnerId, req.body);
    
    const order = await Order.createWithCustomNumber({ ...req.body, ownerId: effectiveOwnerId }, req.userId);
    
    const user = await User.findById(effectiveOwnerId);
    if (user) {
      await User.updateOrderCount(effectiveOwnerId, Number(user.order_count || 0) + 1);
      console.log('✅ Commande créée, compteur mis à jour pour owner:', effectiveOwnerId, Number(user.order_count || 0) + 1);
    }
    
    res.status(201).json(order);
  } catch (error) {
    console.error('❌ Erreur création commande:', error);
    const statusCode = error && error.statusCode ? error.statusCode : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

// 🆕 NOUVELLE ROUTE : Statistiques de numérotation
app.get('/api/orders/number-stats', authMiddleware, async (req, res) => {
  try {
    const { ownerId } = req.query;
    console.log('📊 Récupération stats numérotation pour user:', req.userId, 'ownerId:', ownerId);

    const stats = await Order.getOrderNumberStats(req.userId, ownerId || null);

    console.log('✅ Stats numérotation:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur stats numérotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 NOUVELLE ROUTE : Trouver une commande par son numéro personnalisé
app.get('/api/orders/custom/:orderNumber', authMiddleware, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { ownerId } = req.query;
    console.log('🔍 Recherche commande par numéro personnalisé:', orderNumber, 'pour user:', req.userId, 'ownerId:', ownerId);

    const order = await Order.findByCustomNumber(orderNumber, req.userId, ownerId || null);

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Erreur recherche commande personnalisée:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/orders', authMiddleware, async (req, res) => {
  try {
    console.log('📦 Récupération commandes user spécifique:', req.userId);
    
    const orders = await Order.findAll({
      where: { user_id: req.userId },
      order: [['created_at', 'DESC']]
    });
    
    console.log(`✅ ${orders.length} commandes pour user ${req.userId}`);
    res.json(orders);
  } catch (error) {
    console.error('❌ Erreur récupération commandes user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const order = await Order.findById(req.params.id, req.userId, ownerId || null);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée ou non autorisée' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/earnings/me', authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.userId);
    const role = await User.getFixedRole(userId);
    if (!['closer', 'courier'].includes(role)) {
      return res.json({ role, total: 0, earnings: [] });
    }

    const conn = await getConnection();
    try {
      const availableColumns = await Order.getOrderColumnSet();
      const personFilter = role === 'courier'
        ? 'o.assigned_to = $1'
        : availableColumns.has('assigned_closer_id')
          ? 'COALESCE(o.assigned_closer_id, o.created_by) = $1'
          : 'o.created_by = $1';
      const amountColumn = role === 'courier' ? 'o.delivery_fee' : 'o.closer_commission_amount';

      const [rows] = await conn.query(
        `SELECT o.user_id AS owner_id,
                owner.full_name AS owner_name,
                owner.email AS owner_email,
                COALESCE(SUM(${amountColumn}), 0) AS total_amount,
                COUNT(*) AS delivered_orders
         FROM orders o
         LEFT JOIN app_users owner ON owner.id = o.user_id
         WHERE ${personFilter}
           AND o.status = 'livree'
         GROUP BY o.user_id, owner.full_name, owner.email
         ORDER BY o.user_id`,
        [userId]
      );

      const earnings = rows.map((row) => ({
        owner_id: Number(row.owner_id),
        owner_name: row.owner_name || row.owner_email || 'Propriétaire',
        owner_email: row.owner_email,
        total_amount: Number(row.total_amount || 0),
        delivered_orders: Number(row.delivered_orders || 0),
      }));

      return res.json({
        role,
        total: earnings.reduce((sum, item) => sum + item.total_amount, 0),
        earnings,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('❌ Erreur récupération gains:', error);
    return res.status(500).json({ error: 'Erreur récupération des gains' });
  }
});

async function getProductProfitability(req, res) {
  try {
    const requesterId = Number(req.userId);
    const requesterRole = await User.getFixedRole(requesterId);
    if (!['owner', 'manager'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Accès réservé aux owners et managers' });
    }

    const requestedOwnerId = req.query.ownerId === undefined
      ? requesterId
      : Number(req.query.ownerId);
    if (!Number.isInteger(requestedOwnerId) || requestedOwnerId <= 0) {
      return res.status(400).json({ error: 'ownerId invalide' });
    }

    if (requesterRole === 'manager') {
      const isMember = await User.isActiveTeamMemberForOwner(requesterId, requestedOwnerId);
      if (!isMember) {
        return res.status(403).json({ error: 'Vous n’êtes pas autorisé à voir cet owner' });
      }
    } else if (requestedOwnerId !== requesterId) {
      return res.status(403).json({ error: 'Vous n’êtes pas autorisé à voir cet owner' });
    }

    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;
    const advertisingCost = req.query.advertisingCost === undefined ? 0 : Number(req.query.advertisingCost);
    if (!Number.isFinite(advertisingCost) || advertisingCost < 0) {
      return res.status(400).json({ error: 'Coût publicitaire invalide' });
    }
    if ((startDate && Number.isNaN(Date.parse(startDate))) || (endDate && Number.isNaN(Date.parse(endDate)))) {
      return res.status(400).json({ error: 'Plage de dates invalide' });
    }
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'La date de début doit précéder la date de fin' });
    }
    const dateFilter = `o.created_at >= COALESCE($2::date, o.created_at::date)
                        AND o.created_at < COALESCE(($3::date + INTERVAL '1 day'), o.created_at + INTERVAL '1 second')`;

    const conn = await getConnection();
    try {
      const [productRows] = await conn.query(
        `SELECT oi.product_id,
                COALESCE(p.name, oi.product_name) AS product_name,
                SUM((oi.unit_price - COALESCE(oi.unit_cost, 0)) * oi.quantity) AS gross_margin,
                SUM(oi.unit_price * oi.quantity) AS revenue,
                SUM(COALESCE(oi.unit_cost, 0) * oi.quantity) AS product_cost,
                SUM(oi.quantity) AS quantity
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE o.user_id = $1 AND o.status = 'livree' AND ${dateFilter}
         GROUP BY oi.product_id, COALESCE(p.name, oi.product_name)
         ORDER BY gross_margin DESC`,
        [requestedOwnerId, startDate, endDate]
      );

      const [globalRows] = await conn.query(
        `SELECT
           COALESCE(SUM(o.total_amount), 0)
             - COALESCE((
                 SELECT SUM(COALESCE(oi.unit_cost, 0) * oi.quantity)
                 FROM order_items oi
                 JOIN orders item_orders ON item_orders.id = oi.order_id
                 WHERE item_orders.user_id = $1 AND item_orders.status = 'livree'
                   AND item_orders.created_at >= COALESCE($2::date, item_orders.created_at::date)
                   AND item_orders.created_at < COALESCE(($3::date + INTERVAL '1 day'), item_orders.created_at + INTERVAL '1 second')
               ), 0)
             - COALESCE(SUM(o.closer_commission_amount), 0)
             - COALESCE(SUM(o.delivery_fee), 0) - $4 AS net_profit,
           COALESCE(SUM(o.total_amount), 0) AS revenue,
           COALESCE((
             SELECT SUM(COALESCE(oi.unit_cost, 0) * oi.quantity)
             FROM order_items oi
             JOIN orders cost_orders ON cost_orders.id = oi.order_id
                 WHERE cost_orders.user_id = $1 AND cost_orders.status = 'livree'
                   AND cost_orders.created_at >= COALESCE($2::date, cost_orders.created_at::date)
                   AND cost_orders.created_at < COALESCE(($3::date + INTERVAL '1 day'), cost_orders.created_at + INTERVAL '1 second')
           ), 0) AS product_cost,
           COALESCE(SUM(o.closer_commission_amount), 0) AS closer_commissions,
           COALESCE(SUM(o.delivery_fee), 0) AS delivery_fees,
           COUNT(*) AS delivered_orders
         FROM orders o
         WHERE o.user_id = $1 AND o.status = 'livree' AND ${dateFilter}`,
        [requestedOwnerId, startDate, endDate, advertisingCost]
      );

      const [estimatedRows] = await conn.query(
        `SELECT oi.product_id,
                COALESCE(p.name, oi.product_name) AS product_name,
                SUM(
                  (oi.unit_price - COALESCE(oi.unit_cost, 0)) * oi.quantity
                  - CASE WHEN o.total_amount > 0
                    THEN (COALESCE(o.closer_commission_amount, 0) + COALESCE(o.delivery_fee, 0))
                         * (oi.unit_price * oi.quantity / o.total_amount)
                    ELSE 0 END
                ) AS estimated_net_profit,
                SUM(oi.quantity) AS quantity
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE o.user_id = $1 AND o.status = 'livree' AND ${dateFilter}
         GROUP BY oi.product_id, COALESCE(p.name, oi.product_name)
         ORDER BY estimated_net_profit DESC`,
        [requestedOwnerId, startDate, endDate]
      );

      const numberize = (row, fields) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [fields.includes(key) ? key : key, fields.includes(key) ? Number(value || 0) : value])
      );
      return res.json({
        owner_id: requestedOwnerId,
        global: {
          ...numberize(globalRows[0] || {}, ['net_profit', 'revenue', 'product_cost', 'closer_commissions', 'delivery_fees', 'delivered_orders']),
          advertising_cost: advertisingCost,
        },
        period: { start_date: startDate, end_date: endDate },
        products: productRows.map((row) => numberize(row, ['product_id', 'gross_margin', 'revenue', 'product_cost', 'quantity'])),
        estimated_products: estimatedRows.map((row) => numberize(row, ['product_id', 'estimated_net_profit', 'quantity'])),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('❌ Erreur rentabilité produits:', error);
    return res.status(500).json({ error: 'Erreur récupération rentabilité produits' });
  }
}

app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, delivery_fee } = req.body;
    console.log('🔄 Mise à jour statut pour user:', req.userId, req.params.id, status);
    
    const order = await Order.findById(req.params.id, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée ou non autorisée' });
    }

    const callerRole = await User.getFixedRole(Number(req.userId));
    const deliveryFee = Number(delivery_fee);
    if (status === 'livree' && callerRole === 'courier' && (!Number.isFinite(deliveryFee) || deliveryFee <= 0)) {
      return res.status(400).json({ error: 'Frais de livraison requis' });
    }

    if (status === 'livree' && callerRole === 'courier') {
      const conn = await getConnection();
      try {
        const availableColumns = await Order.getOrderColumnSet();
        const closerColumn = availableColumns.has('assigned_closer_id')
          ? 'COALESCE(assigned_closer_id, created_by)'
          : 'created_by';
        const [closerRows] = await conn.query(
          `SELECT ${closerColumn} AS closer_user_id
           FROM orders
           WHERE id = $1`,
          [req.params.id]
        );
        const closerUserId = Number(closerRows[0]?.closer_user_id || 0);
        let closerCommissionAmount = null;

        if (closerUserId > 0) {
          const [commissionRows] = await conn.query(
            `SELECT tm.commission_amount, tm.commission_type
             FROM team_memberships tm
             WHERE tm.owner_user_id = $1
               AND tm.member_user_id = $2
               AND tm.role_name = 'closer'
               AND tm.status = 'active'
             ORDER BY tm.id DESC
             LIMIT 1`,
            [Number(order.user_id), closerUserId]
          );
          const commission = commissionRows[0];
          if (commission) {
            const configuredAmount = Number(commission.commission_amount || 0);
            closerCommissionAmount = commission.commission_type === 'percentage'
              ? Number(order.total_amount || 0) * configuredAmount / 100
              : configuredAmount;
          }
        }

        await conn.query(
          `UPDATE orders
           SET status = $1, delivery_fee = $2, closer_commission_amount = $3
           WHERE id = $4`,
          [status, deliveryFee, closerCommissionAmount, req.params.id]
        );
      } finally {
        conn.release();
      }

      return res.json(await Order.findById(req.params.id, req.userId));
    }
    
    const updatedOrder = await Order.updateStatus(req.params.id, status);
    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ Erreur mise à jour statut:', error);
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/assign', authMiddleware, async (req, res) => {
  try {
    const { user_id, assignment_note } = req.body;
    const currentUserId = Number(req.userId);
    const assignedToUserId = user_id !== undefined && user_id !== null ? Number(user_id) : currentUserId;

    const currentRole = await User.getFixedRole(currentUserId);
    const allowedAssignerRoles = ['owner', 'manager', 'closer'];
    if (!allowedAssignerRoles.includes(currentRole)) {
      return res.status(403).json({
        error: 'Seuls les rôles owner, manager ou closer peuvent assigner des commandes.',
        code: 'INSUFFICIENT_ROLE'
      });
    }

    const order = await Order.findById(req.params.id, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée ou non autorisée' });
    }

    const ownerUserId = Number(order.user_id);
    const hasActiveMembership = await User.isActiveTeamMemberForOwner(currentUserId, ownerUserId);
    const hasWorkingMembership = await User.isActiveWorkingTeamMemberForOwner(currentUserId, ownerUserId);

    if (!hasActiveMembership || !hasWorkingMembership) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas modifier cette commande car cette équipe n’est pas active et travaillée.',
        code: 'INVALID_OWNER'
      });
    }

    const targetRole = await User.getFixedRole(assignedToUserId);
    if (targetRole !== 'courier') {
      return res.status(403).json({
        error: 'La commande ne peut être assignée qu’à un utilisateur avec le rôle fixe courier.',
        code: 'INVALID_ASSIGNEE_ROLE'
      });
    }

    const targetMemberIsAllowed = await User.isActiveWorkingTeamMemberForOwner(assignedToUserId, ownerUserId);
    if (!targetMemberIsAllowed) {
      return res.status(403).json({
        error: 'Le destinataire n’est pas un courier actif et travaillant pour cet e-commerçant.',
        code: 'INVALID_ASSIGNEE'
      });
    }

    const updatedOrder = await Order.assignToOrder(
      req.params.id,
      assignedToUserId,
      req.userId,
      assignment_note || `Assignée par ${req.userId}`,
      currentRole === 'closer' ? currentUserId : null
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ Erreur attribution commande:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Récupération stats pour user:', req.userId);
    
    const stats = await Order.getDashboardStats(req.userId);
    
    console.log('✅ Stats récupérées:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROUTES DE BASE ====================

app.get('/', (req, res) => {
  res.json({ 
    message: 'API Gestion Commandes en marche! 🚀',
    endpoints: {
      products: ['GET /api/products', 'POST /api/products', 'GET /api/products/:id'],
      orders: ['GET /api/orders', 'POST /api/orders', 'GET /api/orders/:id', 'PATCH /api/orders/:id/status', 'GET /api/orders/number-stats', 'GET /api/orders/custom/:orderNumber'],
      stats: ['GET /api/orders/stats/dashboard'],
      shopify: ['POST /api/shopify/webhook', 'GET /api/shopify/orders']
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK ✅', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL/Supabase'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Démarrer le serveur
async function startServer() {
  try {  
    await createTables();
    await Order.ensureAssignmentColumns();
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🛍️  API Products: http://localhost:${PORT}/api/products`);
      console.log(`📦 API Orders: http://localhost:${PORT}/api/orders`);
      console.log(`📊 API Stats: http://localhost:${PORT}/api/orders/stats/dashboard`);
      console.log(`🔢 API Numérotation: http://localhost:${PORT}/api/orders/number-stats`);
      console.log(`🛒 API Shopify: http://localhost:${PORT}/api/shopify`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
    });
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
  }
}

startServer();
