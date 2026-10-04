const API_BASE = 'https://sellmaster-1.onrender.com/api';
const TOKEN_KEY = 'sellmaster_jwt';
const USER_KEY = 'sellmaster_user';
const loginView = document.getElementById('login-view');
const accountView = document.getElementById('account-view');
const message = document.getElementById('message');

function showMessage(text, kind) {
  message.textContent = text || '';
  message.className = `message${kind ? ` ${kind}` : ''}`;
}

function showAccount(user) {
  loginView.hidden = true;
  accountView.hidden = false;
  document.getElementById('account-email').textContent = user.email || 'Compte Sellmaster';
}

async function restoreSession() {
  const stored = await chrome.storage.local.get([TOKEN_KEY, USER_KEY]);
  if (!stored[TOKEN_KEY]) return;
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${stored[TOKEN_KEY]}`, Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Session expirée. Reconnectez-vous.');
    const user = data.user || stored[USER_KEY] || {};
    await chrome.storage.local.set({ [USER_KEY]: user });
    showAccount(user);
  } catch (_) {
    await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
    loginView.hidden = false;
    accountView.hidden = true;
  }
}

document.getElementById('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('login-button');
  button.disabled = true;
  showMessage('Connexion...', '');
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.error || 'Connexion Sellmaster impossible.');
    if (!Array.isArray(data.user?.roles) || !data.user.roles.includes('owner')) {
      throw new Error('Cette extension est réservée aux comptes owner.');
    }
    await chrome.storage.local.set({ [TOKEN_KEY]: data.token, [USER_KEY]: data.user });
    document.getElementById('password').value = '';
    showAccount(data.user);
    showMessage('Connexion réussie.', 'success');
  } catch (error) {
    showMessage(error.message || 'Erreur de connexion.', 'error');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
  accountView.hidden = true;
  loginView.hidden = false;
  showMessage('Session supprimée de cette extension.', 'success');
});

restoreSession();
