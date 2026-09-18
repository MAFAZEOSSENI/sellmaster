const { pool } = require('../config/database');
const crypto = require('crypto');

class License {
  // Générer une clé de licence unique
  static generateLicenseKey() {
    return `LIC-${crypto.randomBytes(8).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }

  // Calculer la date d'expiration
  static calculateExpiryDate(type) {
    const now = new Date();
    if (type === '3months') {
      now.setMonth(now.getMonth() + 3);
    }else if (type === '1year') {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now;
  }

  // 🆕 CORRECTION : CRÉER UNE NOUVELLE LICENCE
  static async create(licenseData) {
    const connection = await pool.getConnection();
    try {
      console.log('📝 Création licence avec données:', licenseData);
      
      const { userId, type, price, paymentMethod, monerooPaymentId } = licenseData;
      
      const licenseKey = this.generateLicenseKey();
      const expiresAt = this.calculateExpiryDate(type);

      console.log('🔑 Clé générée:', licenseKey);
      console.log('📅 Expiration:', expiresAt);

      // 🆕 CORRECTION : Utiliser query() au lieu de execute() pour MariaDB
      const [result] = await connection.query(
        `INSERT INTO licenses (license_key, user_id, type, price, status, payment_method, moneroo_payment_id, expires_at) 
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [licenseKey, userId, type, price, paymentMethod, monerooPaymentId, expiresAt]
      );

      console.log('✅ Résultat insertion licence:', result);

      return {
        id: result.insertId,
        licenseKey: licenseKey,
        userId,
        type,
        price,
        status: 'pending',
        expiresAt: expiresAt
      };
    } catch (error) {
      console.error('❌ Erreur création licence:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Activer une licence après paiement réussi
  static async activate(licenseKey) {
    const connection = await pool.getConnection();
    try {
      console.log('🔑 Activation licence:', licenseKey);

      const [licenses] = await connection.query(
        'SELECT * FROM licenses WHERE license_key = ?',
        [licenseKey]
      );

      if (licenses.length === 0) {
        throw new Error('Licence non trouvée');
      }

      const license = licenses[0];
      console.log('📋 Licence trouvée:', license);

      await connection.query(
        'UPDATE licenses SET status = ?, activated_at = NOW() WHERE license_key = ?',
        ['activated', licenseKey]
      );

      await connection.query(
        'UPDATE app_users SET license_key = ?, license_expiry = ?, max_orders = 100000 WHERE id = ?',
        [licenseKey, license.expires_at, license.user_id]
      );

      console.log('✅ Licence activée pour user:', license.user_id);

      return license;
    } catch (error) {
      console.error('❌ Erreur activation licence:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Trouver une licence par clé
  static async findByKey(licenseKey) {
    const connection = await pool.getConnection();
    try {
      const [licenses] = await connection.query(
        'SELECT * FROM licenses WHERE license_key = ?',
        [licenseKey]
      );
      return licenses.length > 0 ? licenses[0] : null;
    } finally {
      connection.release();
    }
  }

  // Trouver les licences d'un utilisateur
  static async findByUserId(userId) {
    const connection = await pool.getConnection();
    try {
      const [licenses] = await connection.query(
        'SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return licenses;
    } finally {
      connection.release();
    }
  }

  // Vérifier si une licence est valide
  static async isValid(licenseKey) {
    const license = await this.findByKey(licenseKey);
    if (!license || license.status !== 'activated') {
      return false;
    }

    const now = new Date();
    const expiry = new Date(license.expires_at);
    return expiry > now;
  }
}

module.exports = License;