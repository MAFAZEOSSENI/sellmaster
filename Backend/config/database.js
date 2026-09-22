const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'bdrqrvna7ivrtqdh3i9q-mysql.services.clever-cloud.com',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'umuwnzvqek77sduz',
  password: process.env.MYSQLPASSWORD || 'fLB2baWjtFB5OxK95QcP',
  database: process.env.MYSQLDATABASE || 'bdrqrvna7ivrtqdh3i9q',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  
  // 🔥🔥🔥 AJOUTEZ CES OPTIONS CRITIQUES :
  decimalNumbers: true, // Convertit DECIMAL en Number
  supportBigNumbers: true, // Gère les BigInt
  bigNumberStrings: false, // Ne pas convertir en String
  typeCast: true, // Active le type casting
  
  // Optionnel: Cast personnalisé
  dateStrings: true, // Dates en String ISO
  charset: 'utf8mb4',

  // 🛡️ Robustesse réseau (utile pour bases distantes gratuites type Railway/Clever Cloud DEV)
  connectTimeout: 20000, // 20s pour établir la connexion avant d'abandonner
  enableKeepAlive: true, // Envoie des paquets keepalive pour éviter que le proxy ne coupe une connexion inactive
  keepAliveInitialDelay: 10000 // Démarre le keepalive après 10s
});

// Réessaie automatiquement une requête si la connexion a été coupée par le proxy distant
async function queryWithRetry(conn, sql, params = [], retries = 2) {
  if (typeof params === 'number') {
    retries = params;
    params = [];
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await conn.query(sql, params);
    } catch (error) {
      const isConnectionLost = error.code === 'PROTOCOL_CONNECTION_LOST' || error.fatal;
      if (isConnectionLost && attempt < retries) {
        console.warn(`⚠️ Connexion perdue, nouvelle tentative (${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }
      throw error;
    }
  }
}

console.log('📊 Database config:', {
  host: process.env.MYSQLHOST || 'bdrqrvna7ivrtqdh3i9q-mysql.services.clever-cloud.com',
  database: process.env.MYSQLDATABASE || 'bdrqrvna7ivrtqdh3i9q',
  port: process.env.MYSQLPORT || 3306,
  options: 'decimalNumbers: true, supportBigNumbers: true'
});

module.exports = { pool, queryWithRetry };