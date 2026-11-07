(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { lsGet } = Nivel;

  /* =====================================================================
     Estado Global Compartilhado
     ===================================================================== */
  Nivel.me = null;
  Nivel.cur = 'boot';
  Nivel.G = null;

  const cache = { banks: [], users: [] };
  const st = { active: lsGet('nivel-active-bank'), best: {} };
  const ui = {
    sel: null,
    editing: null,
    formDirty: false,
    history: [],
    resume: null,
    liveBank: null,
    liveTime: '20',
    liveN: '10',
    liveKind: 'quiz',
    liveDur: '180',
    boardTab: 'this',
    pf: { avatar: '', color: 'lav' },
    creds: null
  };
  const subs = [];
  const bootState = { mode: 'login' };

  const emptyResults = () => ({ roster: [], qs: [] });

  const Live = {
    mode: null,
    code: null,
    room: null,
    players: [],
    results: emptyResults(),
    prepared: [],
    unsubs: [],
    timer: null,
    allTimer: null,
    qStartMs: 0,
    playStartMs: 0,
    seenQ: -2,
    answers: {},
    qtexts: {},
    revealing: false,
    gameStarted: false,
    endAt: 0,
    myBest: 0,
    myAsked: 0,
    myRight: 0,
    recorded: false
  };

  const rep = { students: [], stats: {}, sel: null, sort: 'name', q: '' };
  const statsCache = { at: 0, list: [] };
  const gameImpls = {};

  const activeBank = () => cache.banks.find(b => b.id === st.active) || cache.banks[0] || null;
  const canEditBank = b => !!Nivel.me && (Nivel.me.master || b.ownerId === Nivel.me.username);
  const selBank = () => cache.banks.find(b => b.id === ui.sel) || null;
  const kindOf = r => (r && r.kind) || 'quiz';
  const gameName = id => ((Nivel.GAMES || []).find(g => g.id === id) || {}).name || (id === 'livequiz' ? 'Quiz ao vivo' : id);

  Object.assign(Nivel, {
    cache,
    st,
    ui,
    subs,
    bootState,
    emptyResults,
    Live,
    rep,
    statsCache,
    gameImpls,
    activeBank,
    canEditBank,
    selBank,
    kindOf,
    gameName
  });
})();
