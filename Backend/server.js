require('dotenv').config();
const authMiddleware = require('./middleware/authMiddleware');
const orderAuth = require('./extensions/middleware/orderAuth');
const User = require('./models/User');
const Rbac = require('./models/Rbac');
const express = require('express');
const cors = require('cors');
const path = require('path');
const createTables = require('./database/init');
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
    const { name, description, price, stock, ownerId } = req.body;
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
      stock: parseInt(stock),
      image_url: null
    }, req.userId, effectiveOwnerId);

    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
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

app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    console.log('🔄 Mise à jour statut pour user:', req.userId, req.params.id, status);
    
    const order = await Order.findById(req.params.id, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée ou non autorisée' });
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
      assignment_note || `Assignée par ${req.userId}`
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
    database: 'MariaDB'
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
