const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

class AuthController {
  // Inscription
  static async register(req, res) {
  try {
    console.log('📝 Tentative d\'inscription:', req.body);
    
    const { email, password, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    console.log('🔍 Vérification si l\'utilisateur existe...');
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findByEmail(email);
    console.log('✅ Recherche utilisateur terminée:', existingUser);

    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    console.log('🔐 Hachage du mot de passe...');
    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('👤 Création de l\'utilisateur...');
    // Créer l'utilisateur
    const user = await User.create({
      email,
      passwordHash,
      phone: phone || null
    });

    console.log('✅ Utilisateur créé:', user);

    // ✅ CORRECTION : Convertir BigInt en Number pour JWT
    const userId = Number(user.id);
    console.log('🔢 ID converti:', userId, '(type:', typeof userId, ')');

    // Générer le token JWT
    const token = jwt.sign(
      { userId: userId, email: user.email }, // ✅ ID en Number
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: userId, // ✅ ID en Number pour la réponse aussi
        email: user.email,
        phone: user.phone
      },
      token
    });

  } catch (error) {
    console.error('❌ Erreur inscription détaillée:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de l\'inscription',
      details: error.message 
    });
  }
}

  // Connexion
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      // Trouver l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier le mot de passe
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'votre_secret_jwt',
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Connexion réussie',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          trial_used: user.trial_used,
          order_count: user.order_count,
          max_orders: user.max_orders,
          license_key: user.license_key,
          license_expiry: user.license_expiry
        },
        token
      });

    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }

  // Profil utilisateur
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          trial_used: user.trial_used,
          order_count: user.order_count,
          max_orders: user.max_orders,
          license_key: user.license_key,
          license_expiry: user.license_expiry
        }
      });

    } catch (error) {
      console.error('Erreur profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  }
}

module.exports = AuthController;