const { pool } = require('../config/database');

class User {
  // Créer un nouvel utilisateur - ✅ CORRIGÉ
  static async create(userData) {
    const { email, passwordHash, phone } = userData;
    
    const connection = await pool.getConnection();
    try {
      // ✅ CORRECTION : Utiliser query() au lieu de execute() pour MariaDB
      const result = await connection.query(
        `INSERT INTO app_users (email, password_hash, phone, trial_used, order_count, max_orders) 
         VALUES (?, ?, ?, FALSE, 0, 10)`,
        [email, passwordHash, phone]
      );
      
      // ✅ CORRECTION : result est déjà l'objet d'insertion
      console.log('📝 Résultat insertion:', result);
      return { id: result.insertId, email, phone };
    } finally {
      connection.release();
    }
  }

  // Trouver un utilisateur par email - ✅ CORRIGÉ
 static async findByEmail(email) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM app_users WHERE email = ?',
      [email]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      
      // NORMALISATION: S'assurer qu'on a toujours les deux formats
      if (user.password_hash && !user.passwordHash) {
        user.passwordHash = user.password_hash; // Crée camelCase
      }
      if (user.passwordHash && !user.password_hash) {
        user.password_hash = user.passwordHash; // Crée snake_case
      }
      
      console.log(`✅ Utilisateur trouvé: ${user.email}`);
      console.log(`🔑 Hash disponible: ${user.password_hash ? 'Oui' : 'Non'}`);
      
      return user;
    }
    
    console.log(`❌ Utilisateur non trouvé: ${email}`);
    return null;
    
  } catch (error) {
    console.error('❌ Erreur findByEmail:', error);
    throw error;
  } finally {
    connection.release();
  }
}
      
      // ✅ CORRECTION : MariaDB retourne [rows] avec query()
      const rows = Array.isArray(result) ? result : [result];
      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  // Trouver un utilisateur par ID - ✅ CORRIGÉ  
 static async findById(id) {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(
      'SELECT id, email, phone, trial_used, order_count, max_orders, license_key, license_expiry FROM app_users WHERE id = ?',
      [id]
    );
    
    const rows = Array.isArray(result) ? result : [result];
    if (rows.length > 0) {
      const user = rows[0];
      // ✅ Convertir BigInt en Number
      if (user && user.id && typeof user.id === 'bigint') {
        user.id = Number(user.id);
      }
      return user;
    }
    return null;
  } finally {
    connection.release();
  }
}

  // Mettre à jour le compteur de commandes - ✅ CORRIGÉ
  static async updateOrderCount(userId, newCount) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE app_users SET order_count = ? WHERE id = ?',
        [newCount, userId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  // Activer une licence - ✅ CORRIGÉ
  static async activateLicense(userId, licenseKey, expiryDate) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE app_users SET license_key = ?, license_expiry = ?, max_orders = 100000 WHERE id = ?',
        [licenseKey, expiryDate, userId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  // Vérifier si l'utilisateur peut créer des commandes
  static async canCreateOrder(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      // Si licence active
      if (user.license_key && new Date(user.license_expiry) > new Date()) {
        return true;
      }

      // Si essai gratuit
      if (user.order_count < user.max_orders) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur canCreateOrder:', error);
      return false;
    }
  }
}

module.exports = User;
