const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'sellmaster',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('📊 Database config:', {
  host: process.env.MYSQLHOST,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

module.exports = { pool };
