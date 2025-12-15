const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'sellmaster',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // 🔥🔥🔥 AJOUTEZ CES OPTIONS CRITIQUES :
  decimalNumbers: true, // Convertit DECIMAL en Number
  supportBigNumbers: true, // Gère les BigInt
  bigNumberStrings: false, // Ne pas convertir en String
  typeCast: true, // Active le type casting
  
  // Optionnel: Cast personnalisé
  dateStrings: true, // Dates en String ISO
  charset: 'utf8mb4'
});

console.log('📊 Database config:', {
  host: process.env.MYSQLHOST,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  options: 'decimalNumbers: true, supportBigNumbers: true'
});

module.exports = { pool };
