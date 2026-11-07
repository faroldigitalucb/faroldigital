(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, $$, avatarHtml, VIEWS, Store, bootState,
    stopGame, launch, renderLogin, renderHome, renderTeacher,
    renderUsersShell, enterLive, renderBoard, renderReports, renderProfile,
    restoreSession, startApp, logout
  } = Nivel;

  /* =====================================================================
     Roteador de Views, Barra Superior (Chrome) e Inicialização (Boot)
     ===================================================================== */
  function allowed(v) {
    const me = Nivel.me;
    if (v === 'boot' || v === 'login') return true;
    if (!me) return false;
    if (v === 'teacher' || v === 'reports') return me.role === 'teacher';
    if (v === 'users') return !!me.master;
    return true;
  }

  function go(view) {
    if (!allowed(view)) view = Nivel.me ? 'home' : 'login';
    if (view !== 'game') stopGame();
    Nivel.cur = view;
    VIEWS.forEach(v => { $('#view-' + v).hidden = v !== view; });
    $$('.tab').forEach(t => {
      const on = t.dataset.go === view || (view === 'game' && t.dataset.go === 'home');
      on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
    });

    if (view === 'login') renderLogin();
    if (view === 'home') renderHome();
    if (view === 'teacher') renderTeacher();
    if (view === 'users') renderUsersShell();
    if (view === 'live') enterLive();
    if (view === 'board') renderBoard();
    if (view === 'reports') renderReports();
    if (view === 'profile') renderProfile();

    const wb = $('#who-btn');
    if (wb) {
      view === 'profile' ? wb.setAttribute('aria-current', 'page') : wb.removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
  }

  function buildChrome() {
    const me = Nivel.me;
    const tabs = me.role === 'student'
      ? [['home', 'Jogar'], ['live', 'Sala ao vivo'], ['board', 'Placar']]
      : [['home', 'Jogar'], ['teacher', 'Questionários'], ['live', 'Sala ao vivo'], ['board', 'Placar'], ['reports', 'Relatórios']];
    if (me.master) tabs.push(['users', 'Usuários']);

    const nav = $('#nav');
    nav.hidden = false;
    nav.innerHTML = tabs.map(([v, l]) => `<button class="tab" data-go="${v}">${l}</button>`).join('');

    $('#who').hidden = false;
    $('#who-name').textContent = me.name;
    $('#who-av').innerHTML = avatarHtml(me, 'sm');

    const r = $('#who-role');
    r.textContent = me.master ? 'Professor master' : me.role === 'teacher' ? 'Professor' : 'Aluno';
    r.className = 'badge ' + (me.role === 'student' ? 'b-student' : 'b-teacher');
  }

  function clearChrome() {
    $('#nav').hidden = true;
    $('#nav').innerHTML = '';
    $('#who').hidden = true;
  }

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) {
      go(g.dataset.go);
      return;
    }
    const p = e.target.closest('[data-play]');
    if (p) launch(p.dataset.play);
  });

  $('#logout').addEventListener('click', logout);

  Object.assign(Nivel, {
    allowed,
    go,
    buildChrome,
    clearChrome
  });

  /* =====================================================================
     Inicialização da Aplicação
     ===================================================================== */
  (async function boot() {
    try {
      await Store.init();
      const meta = await Store.get('meta/app');
      const sess = await restoreSession();
      if (sess) {
        await startApp(sess);
        return;
      }
      // Se a aplicação já tiver configuração no Firebase, vai para o login normal.
      // Caso contrário, abre diretamente o ecrã de setup para criar a conta master.
      bootState.mode = meta ? 'login' : 'setup';
    } catch (e) {
      console.error('Erro na inicialização:', e);
      bootState.mode = 'error';
    }
    go('login');
  })();
})();
