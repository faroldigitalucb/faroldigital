(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, USER_RE, Store, bootState, cache, st, ui, subs, statsCache,
    byName, ssSet, ssGet, ssDel, hashPw, makeUser, seedBanks
  } = Nivel;

  /* =====================================================================
     View: Login, Configuração Inicial e Sessão
     ===================================================================== */
  function renderLogin() {
    const c = $('#login-card');
    const local = Store.mode === 'local' ? '<p class="note">Modo local: os dados ficam só neste navegador (sem nuvem).</p>' : '';
    if (bootState.mode === 'setup') {
      c.innerHTML = `<h2>Configuração inicial</h2>
        <p>Crie a conta do professor master. Ela poderá criar todos os outros professores e alunos.</p>
        <form id="setup-form" novalidate>
          <label class="fld">Seu nome<input class="inp" name="name" autocomplete="name" placeholder="Ex.: Marina Souza"></label>
          <label class="fld">Usuário<input class="inp" name="username" autocomplete="username" autocapitalize="none" placeholder="Ex.: marina"></label>
          <label class="fld">Senha (mínimo 6 caracteres)<input class="inp" type="password" name="password" autocomplete="new-password"></label>
          <div class="err" id="login-err" role="alert"></div>
          <button class="btn btn-primary" type="submit">Criar conta master e começar</button>
        </form>${local}`;
    } else if (bootState.mode === 'blocked') {
      c.innerHTML = `<h2>Sistema ainda não configurado</h2><p>O professor master precisa abrir esta página primeiro para criar a conta inicial. Volte mais tarde.</p>${local}`;
    } else if (bootState.mode === 'error') {
      c.innerHTML = `<h2>Sem conexão com os dados</h2><p>Não consegui acessar o armazenamento. Recarregue a página e tente de novo.</p>`;
    } else {
      c.innerHTML = `<h2>Entrar</h2>
        <form id="login-form" novalidate>
          <label class="fld">Usuário<input class="inp" name="username" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
          <label class="fld">Senha<input class="inp" type="password" name="password" autocomplete="current-password"></label>
          <div class="err" id="login-err" role="alert"></div>
          <button class="btn btn-primary" type="submit">Entrar</button>
        </form>
        <p class="note">Esqueceu a senha? Peça ao seu professor para criar uma nova.</p>${local}`;
    }
  }

  document.addEventListener('submit', async e => {
    const id = e.target.id;
    if (id !== 'login-form' && id !== 'setup-form') return;
    e.preventDefault();
    const f = e.target.elements, err = $('#login-err'), btn = $('button[type=submit]', e.target);
    err.textContent = '';
    if (!(window.crypto && crypto.subtle)) {
      err.textContent = 'Este navegador não permite o login seguro. Use uma versão mais recente.';
      return;
    }
    btn.disabled = true;
    try {
      if (id === 'login-form') await doLogin(f.username.value, f.password.value);
      else await doSetup(f.name.value, f.username.value, f.password.value);
    } catch (ex) {
      err.textContent = ex.message || 'Algo deu errado. Tente de novo.';
    } finally {
      btn.disabled = false;
    }
  });

  async function doLogin(username, pw) {
    const u = username.trim().toLowerCase();
    if (!u || !pw) throw new Error('Preencha o usuário e a senha.');
    const rec = USER_RE.test(u) ? await Store.get('users/' + u) : null;
    const h = rec ? await hashPw(pw, rec.salt) : null;
    if (!rec || h !== rec.hash) throw new Error('Usuário ou senha incorretos.');
    ssSet('nivel-session', JSON.stringify({ u, h: rec.hash }));
    await startApp(rec);
  }

  async function doSetup(name, username, pw) {
    name = name.trim();
    const u = username.trim().toLowerCase();
    if (name.length < 2) throw new Error('Escreva o seu nome.');
    if (!USER_RE.test(u)) throw new Error('Usuário: 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.');
    if (pw.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    try {
      const rec = await makeUser({ name, username: u, password: pw, role: 'teacher', master: true });
      await Store.set('users/' + u, rec);
      await Store.set('meta/app', { setup: true, createdAt: Date.now() });
      for (const b of seedBanks(rec)) await Store.set('banks/' + b.id, b);
      ssSet('nivel-session', JSON.stringify({ u, h: rec.hash }));
      await startApp(rec);
    } catch (ex) {
      if (ex && ex.message && /nome|usuário|senha/i.test(ex.message) && !ex.code) throw ex;
      throw new Error('Não foi possível criar a conta. A configuração inicial só pode ser feita por quem edita esta página.');
    }
  }

  async function restoreSession() {
    try {
      const s = JSON.parse(ssGet('nivel-session') || 'null');
      if (!s) return null;
      const u = await Store.get('users/' + s.u);
      if (u && u.hash === s.h) return u;
    } catch (e) {}
    ssDel('nivel-session');
    return null;
  }

  function logout() {
    Nivel.stopGame();
    Nivel.liveReset();
    subs.splice(0).forEach(u => { try { u(); } catch (e) {} });
    ssDel('nivel-session');
    ssDel('nivel-join');
    Nivel.me = null;
    cache.banks = [];
    cache.users = [];
    ui.sel = null;
    ui.editing = null;
    ui.creds = null;
    st.best = {};
    statsCache.at = 0;
    statsCache.list = [];
    Nivel.clearChrome();
    bootState.mode = 'login';
    Nivel.go('login');
  }

  async function startApp(rec) {
    Nivel.me = {
      username: rec.username,
      name: rec.name,
      role: rec.role,
      master: !!rec.master,
      avatar: rec.avatar || '',
      color: rec.color || ''
    };
    Nivel.buildChrome();
    st.best = {};
    try {
      const [sc, ss] = await Promise.all([
        Store.get('scores/' + Nivel.me.username),
        Store.get('stats/' + Nivel.me.username)
      ]);
      if (sc && sc.best) Object.assign(st.best, sc.best);
      if (ss && ss.byGame) {
        Object.entries(ss.byGame).forEach(([k, v]) => {
          st.best[k] = Math.max(st.best[k] || 0, v.best || 0);
        });
      }
    } catch (e) {}

    subs.push(Store.watchCol('banks', list => {
      cache.banks = list.map(x => x.data).sort(byName);
      onBanksChanged();
    }));

    if (Nivel.me.master) {
      subs.push(Store.watchCol('users', list => {
        cache.users = list.map(x => x.data).sort(byName);
        if (Nivel.cur === 'users') Nivel.renderUsersTable();
      }));
    }

    Nivel.go('home');
    if (Nivel.me.role === 'teacher') {
      Nivel.checkResume();
    } else {
      const jc = ssGet('nivel-join');
      if (jc) Nivel.joinRoom(jc, true);
    }
  }

  function onBanksChanged() {
    if (Nivel.cur === 'home') Nivel.renderHome();
    else if (Nivel.cur === 'teacher') {
      Nivel.renderBankList();
      if (!Nivel.editorBusy()) Nivel.renderEditor();
    } else if (Nivel.cur === 'live' && !Nivel.Live.mode) {
      Nivel.renderLive();
    }
  }

  Object.assign(Nivel, {
    renderLogin,
    doLogin,
    doSetup,
    restoreSession,
    logout,
    startApp,
    onBanksChanged
  });
})();
