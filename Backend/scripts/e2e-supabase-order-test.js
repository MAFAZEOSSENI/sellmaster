require('dotenv').config();

const { spawn } = require('child_process');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est requis pour exécuter le test Supabase réel.');
}

const baseUrl = `http://127.0.0.1:${process.env.E2E_PORT || 3310}`;
const email = `e2e-${Date.now()}@example.test`;
const password = 'E2e-test-password-2026!';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('supavisor')
    ? { rejectUnauthorized: false }
    : false,
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForServer(child) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      await request('/health');
      return;
    } catch (error) {
      if (child.exitCode !== null) throw new Error(`Serveur arrêté prématurément: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Le serveur Express n’est pas devenu disponible à temps.');
}

async function main() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: process.env.E2E_PORT || '3310' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

  try {
    await waitForServer(child);

    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName: 'Supabase E2E Owner' }),
    });
    const userId = Number(registration.user && registration.user.id);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error('L’inscription n’a pas retourné un id utilisateur valide.');

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!login.token) throw new Error('La connexion n’a pas retourné de JWT.');

    const order = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.token}` },
      body: JSON.stringify({
        clientName: 'Supabase E2E Client',
        clientPhone: '+33100000000',
        clientAddress: '1 rue du Test',
        totalAmount: 19.99,
        items: [],
      }),
    });
    const orderId = Number(order.order && order.order.id || order.id);
    if (!Number.isInteger(orderId) || orderId <= 0) throw new Error('La création de commande n’a pas retourné un id valide.');

    console.log(`✅ E2E Supabase réussi: user_id=${userId}, order_id=${orderId}`);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    await pool.query('DELETE FROM orders WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)', [email]);
    await pool.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)', [email]);
    await pool.query('DELETE FROM app_users WHERE email = $1', [email]);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`❌ E2E Supabase échoué: ${error.message}`);
  process.exitCode = 1;
});