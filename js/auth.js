/**
 * auth.js — Authentication layer
 * Users & encrypted API keys stored in localStorage only.
 * Session managed via sessionStorage (cleared on tab close).
 */

const Auth = {
  USERS_KEY: 'crstats_users',
  SESSION_KEY: 'crstats_session',

  /** Load all registered users */
  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'); }
    catch { return {}; }
  },

  /** Save users object */
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  /** Register a new user */
  async register(username, password, apiKey, playerTag) {
    const users = this.getUsers();
    const uname = username.trim().toLowerCase();
    if (users[uname]) throw new Error('Usuário já existe.');
    if (password.length < 8) throw new Error('Senha muito curta (mín. 8 caracteres).');

    const { hash, salt } = await CryptoUtil.hashPassword(password);
    const encryptedApiKey = await CryptoUtil.encryptData(apiKey.trim(), password);
    const tag = playerTag.trim().toUpperCase().replace(/^#?/, '#');

    users[uname] = {
      hash, salt,
      encryptedApiKey,
      playerTag: tag,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    return uname;
  },

  /** Login — returns session object or throws */
  async login(username, password) {
    const users = this.getUsers();
    const uname = username.trim().toLowerCase();
    const user = users[uname];
    if (!user) throw new Error('Usuário não encontrado.');

    const ok = await CryptoUtil.verifyPassword(password, user.hash, user.salt);
    if (!ok) throw new Error('Senha incorreta.');

    // Decrypt API key for this session only
    const apiKey = await CryptoUtil.decryptData(user.encryptedApiKey, password);

    const session = {
      username: uname,
      playerTag: user.playerTag,
      apiKey,
      loginAt: Date.now()
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  /** Get current session (null if not logged in) */
  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },

  /** Logout */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  /** Check if logged in */
  isLoggedIn() {
    return !!this.getSession();
  }
};

/* ── UI Handlers ─────────────────────────── */

let currentTab = 'login';

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('register-error').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    const session = await Auth.login(username, password);
    await initApp(session);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const apiKey   = document.getElementById('reg-api-key').value;
  const playerTag = document.getElementById('reg-player-tag').value;
  const btn = document.getElementById('register-btn');
  const errEl = document.getElementById('register-error');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    await Auth.register(username, password, apiKey, playerTag);
    const session = await Auth.login(username, password);
    showToast('✅ Conta criada com sucesso!');
    await initApp(session);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

function logout() {
  Auth.logout();
  AppCache.clear();
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('splash-screen').classList.remove('hidden');
  document.getElementById('splash-screen').classList.add('active');
  showToast('👋 Até logo!');
}

function setButtonLoading(btn, loading) {
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁️';
}
