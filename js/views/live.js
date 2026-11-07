(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, $$, esc, rand, shuffle, plural, byScore, lsGet, lsSet, lsDel, ssSet, ssDel,
    toast, armed, lv, avatarHtml, fmtClock, fmtCode,
    OC, LT, Store, cache, ui, Live, emptyResults, activeBank, kindOf, gameName,
    GAMES, recordAttempt, stopGame, launch
  } = Nivel;

  /* =====================================================================
     View: Sala ao Vivo (Quiz ao Vivo estilo Kahoot e Jogos ao Vivo)
     ===================================================================== */
  function liveReset() {
    Live.unsubs.forEach(u => { try { u(); } catch (e) {} });
    clearInterval(Live.timer);
    clearTimeout(Live.allTimer);
    Object.assign(Live, {
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
    });
  }

  function ranking(res) {
    if (res.final) return res.final.map(x => ({ ...x })).sort(byScore);
    return res.roster.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      score: res.qs.reduce((s, q) => s + ((q && q.pts && q.pts[i]) || 0), 0)
    })).sort(byScore);
  }

  function enterLive() {
    if (!Live.mode && Nivel.me.role === 'teacher') loadHistory();
    renderLive();
  }

  async function loadHistory() {
    try {
      const l = (await Store.list('history')).map(x => x.data).filter(h => Nivel.me.master || h.hostId === Nivel.me.username);
      ui.history = l.sort((a, b) => b.date - a.date).slice(0, 6);
      if (Nivel.cur === 'live' && !Live.mode) renderLive();
    } catch (e) {}
  }

  async function destroyRoom(code) {
    try {
      const pl = await Store.list(`rooms/${code}/players`);
      for (const p of pl) await Store.del(`rooms/${code}/players/${p.id}`);
      await Store.del(`rooms/${code}/results/all`);
      await Store.del('rooms/' + code);
    } catch (e) {}
  }

  async function checkResume() {
    ui.resume = null;
    try {
      const saved = JSON.parse(lsGet('nivel-host') || 'null');
      if (saved) {
        const room = await Store.get('rooms/' + saved.code);
        if (room && room.hostId === Nivel.me.username) ui.resume = saved.code;
        else lsDel('nivel-host');
      }
      const rooms = await Store.list('rooms');
      for (const r of rooms) {
        const d = r.data;
        if (d && d.hostId === Nivel.me.username && r.id !== ui.resume && Date.now() - (d.createdAt || 0) > 12 * 3600 * 1000) {
          destroyRoom(r.id);
        }
      }
    } catch (e) {}
    if (Nivel.cur === 'live' && !Live.mode) renderLive();
  }

  function renderLive() {
    if (Nivel.cur !== 'live') return;
    const root = $('#live-root');
    if (Nivel.me.role === 'student') {
      Live.mode === 'player' ? renderPlayer(root) : renderJoin(root);
    } else {
      Live.mode === 'host' ? renderHost(root) : renderHostSetup(root);
    }
    updateTimer();
  }

  /* ---------- Professor: Criar Sala ---------- */
  function renderHostSetup(root) {
    const banks = cache.banks.filter(b => b.questions.length >= 1);
    if (!ui.liveBank || !banks.find(b => b.id === ui.liveBank)) {
      const a = activeBank();
      ui.liveBank = (a && banks.find(b => b.id === a.id) ? a.id : (banks[0] || {}).id) || null;
    }
    const quizMode = ui.liveKind === 'quiz';
    root.innerHTML = `<div class="panel">
      <h2>Criar sala ao vivo</h2>
      <p class="note" style="margin-top:.4rem">A turma toda participa ao mesmo tempo, no celular ou no computador. Escolha o quiz com perguntas na tela ou um dos jogos: cada aluno joga no seu aparelho e o placar atualiza ao vivo. Mantenha esta página aberta durante a dinâmica.</p>
      ${ui.resume ? `<div class="resume"><span>Você tem uma sala aberta (código <b>${fmtCode(ui.resume)}</b>).</span><button class="btn btn-sm btn-primary" data-live="resume">Retomar sala</button></div>` : ''}
      <div class="grid-fields">
        <label class="fld">Dinâmica<select class="inp" id="lv-kind">
          <option value="quiz" ${quizMode ? 'selected' : ''}>Quiz ao vivo (perguntas na tela)</option>
          <optgroup label="Jogos ao vivo">${GAMES.map(g => `<option value="${g.id}" ${g.id === ui.liveKind ? 'selected' : ''}>${g.emoji} ${g.name}</option>`).join('')}</optgroup>
        </select></label>
        <label class="fld">Questionário<select class="inp" id="lv-bank">${banks.map(b => `<option value="${b.id}" ${b.id === ui.liveBank ? 'selected' : ''}>${esc(b.name)} (${lv(b.level).label}, ${plural(b.questions.length, 'pergunta', 'perguntas')})</option>`).join('') || '<option value="">Nenhum questionário com perguntas</option>'}</select></label>
        ${quizMode ? `
        <label class="fld">Tempo por pergunta<select class="inp" id="lv-time">${['10', '20', '30', '45', '60'].map(t => `<option value="${t}" ${t === ui.liveTime ? 'selected' : ''}>${t} segundos</option>`).join('')}</select></label>
        <label class="fld">Quantidade de perguntas<select class="inp" id="lv-n">${['5', '10', '15', 'all'].map(n => `<option value="${n}" ${n === ui.liveN ? 'selected' : ''}>${n === 'all' ? 'Todas' : n}</option>`).join('')}</select></label>` : `
        <label class="fld">Duração do jogo<select class="inp" id="lv-dur">${[['120', '2 minutos'], ['180', '3 minutos'], ['300', '5 minutos'], ['480', '8 minutos']].map(([v, l]) => `<option value="${v}" ${v === ui.liveDur ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`}
      </div>
      <button class="btn btn-primary" data-live="create" ${banks.length ? '' : 'disabled'}>Criar sala</button>
    </div>
    ${ui.history.length ? `<div class="panel" style="margin-top:1.4rem"><h3>Últimas salas</h3><div class="hist">${ui.history.map(h => `<div><strong>${esc(h.title || h.bankName)}</strong> <small>${new Date(h.date).toLocaleString('pt-BR')}, ${plural(h.players, 'aluno', 'alunos')}</small>
      ${h.ranking.slice(0, 3).map((r, i) => `<small>${i + 1}º ${esc(r.name)}: ${r.score} pontos</small>`).join('')}</div>`).join('')}</div></div>` : ''}`;
  }

  async function createRoom() {
    const bank = cache.banks.find(b => b.id === ui.liveBank);
    if (!bank || !bank.questions.length) {
      toast('Escolha um questionário com perguntas.');
      return;
    }
    const isQuiz = ui.liveKind === 'quiz';
    if (!isQuiz && bank.questions.length < 4) {
      toast('Para jogos ao vivo, use um questionário com pelo menos 4 perguntas.');
      return;
    }
    const base = {
      hostId: Nivel.me.username,
      hostName: Nivel.me.name,
      bankId: bank.id,
      bankName: bank.name,
      theme: bank.theme || '',
      level: bank.level || 'medio',
      status: 'lobby',
      qIndex: -1,
      current: null,
      createdAt: Date.now()
    };
    let room, prepared = [];
    if (isQuiz) {
      const limit = +ui.liveTime || 20;
      const n = ui.liveN === 'all' ? bank.questions.length : Math.min(+ui.liveN || 10, bank.questions.length);
      prepared = shuffle(bank.questions).slice(0, n).map(q => {
        const o = shuffle(q.options.map((t, i) => ({ t, i })));
        return {
          text: q.text,
          options: o.map(x => x.t),
          correct: o.findIndex(x => x.i === q.correct),
          explanation: q.explanation || ''
        };
      });
      room = { ...base, kind: 'quiz', total: prepared.length, timeLimit: limit };
    } else {
      room = {
        ...base,
        kind: 'game',
        gameId: ui.liveKind,
        duration: +ui.liveDur || 180,
        total: 0,
        timeLimit: 0,
        gameQs: bank.questions.slice(0, 60).map(q => ({
          id: q.id || '',
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation || ''
        }))
      };
    }

    try {
      let code = null;
      for (let i = 0; i < 8 && !code; i++) {
        const c = String(100000 + rand(900000));
        if (!(await Store.get('rooms/' + c))) code = c;
      }
      if (!code) throw new Error('code');
      room.code = code;
      await Store.set('rooms/' + code, room);
      await Store.set(`rooms/${code}/results/all`, emptyResults());
      lsSet('nivel-host', JSON.stringify({ code, prepared }));
      startHost(code, room, prepared, emptyResults());
    } catch (e) {
      toast('Não foi possível criar a sala. Tente de novo.');
    }
  }

  async function resumeRoom() {
    try {
      const saved = JSON.parse(lsGet('nivel-host') || 'null');
      const room = saved && await Store.get('rooms/' + saved.code);
      if (!room) {
        toast('Essa sala não existe mais.');
        lsDel('nivel-host');
        ui.resume = null;
        renderLive();
        return;
      }
      const results = (await Store.get(`rooms/${saved.code}/results/all`)) || emptyResults();
      startHost(saved.code, room, saved.prepared || [], results);
      if (kindOf(room) === 'quiz' && room.status === 'question') {
        Live.qStartMs = Date.now();
        startHostTimer();
      }
      if (kindOf(room) === 'game' && room.status === 'playing') {
        Live.playStartMs = (room.startedAt || Date.now()) + 3000;
        startGameTimer();
      }
    } catch (e) {
      toast('Não consegui retomar a sala.');
    }
  }

  function startHost(code, room, prepared, results) {
    liveReset();
    Object.assign(Live, { mode: 'host', code, room, prepared, results });
    ui.resume = null;
    Live.unsubs.push(Store.watchCol(`rooms/${code}/players`, list => {
      Live.players = list.map(x => x.data);
      onHostPlayers();
    }));
    renderLive();
  }

  function onHostPlayers() {
    if (Live.mode !== 'host' || Nivel.cur !== 'live') return;
    const r = Live.room;
    if (r.status === 'lobby') {
      const box = $('#lv-players'), cnt = $('#lv-count');
      if (box) box.innerHTML = Live.players.map(p => `<span class="pl-chip">${avatarHtml(p, 'sm')} ${esc(p.name)}</span>`).join('') || '<span class="note">Aguardando alunos…</span>';
      if (cnt) cnt.textContent = `Iniciar com ${plural(Live.players.length, 'aluno', 'alunos')}`;
    } else if (r.status === 'question') {
      const n = Live.players.filter(p => p['a' + r.qIndex]).length, el = $('#lv-answered');
      if (el) el.textContent = `${n} de ${Live.players.length} responderam`;
      if (Live.players.length && n >= Live.players.length && !Live.allTimer && !Live.revealing) {
        Live.allTimer = setTimeout(hostReveal, 700);
      }
    } else if (r.status === 'playing') {
      const box = $('#lv-rank'), pr = $('#lv-prog');
      if (box) box.innerHTML = liveRankHtml(Live.players);
      if (pr) pr.textContent = `${Live.players.filter(p => p.gscore > 0).length} de ${Live.players.length} já pontuaram`;
    }
  }

  function liveRankHtml(players) {
    const rows = players.map(p => ({ ...p, s: p.gscore || 0 }))
      .sort((a, b) => b.s - a.s || String(a.name).localeCompare(String(b.name), 'pt-BR'))
      .slice(0, 10);
    const max = Math.max(1, ...rows.map(r => r.s));
    return rows.map((r, i) => `<div class="dist" style="--c:${OC[i % 4]};--w:${Math.round(r.s / max * 100)}%"><b>${i + 1}º</b><span>${avatarHtml(r, 'sm')} ${esc(r.name)}</span><em>${r.s}</em></div>`).join('') || '<p class="note">Aguardando os alunos começarem…</p>';
  }

  /* ---------- Professor: Quiz ao Vivo ---------- */
  async function hostQuestion(i) {
    const p = Live.prepared[i];
    clearTimeout(Live.allTimer);
    Live.allTimer = null;
    Live.revealing = false;
    Live.room = { ...Live.room, status: 'question', qIndex: i, current: { index: i, text: p.text, options: p.options } };
    Live.qStartMs = Date.now();
    renderLive();
    startHostTimer();
    try {
      await Store.set('rooms/' + Live.code, Live.room);
    } catch (e) {
      toast('Falha ao enviar a pergunta. Verifique a conexão.');
    }
  }

  function startHostTimer() {
    clearInterval(Live.timer);
    Live.timer = setInterval(() => {
      updateTimer();
      if (Live.room.status === 'question' && Date.now() - Live.qStartMs >= Live.room.timeLimit * 1000 + 1200) {
        hostReveal();
      }
    }, 250);
  }

  async function hostReveal() {
    if (Live.mode !== 'host' || Live.revealing || Live.room.status !== 'question') return;
    Live.revealing = true;
    clearInterval(Live.timer);
    clearTimeout(Live.allTimer);
    Live.allTimer = null;
    const i = Live.room.qIndex, p = Live.prepared[i], lim = Live.room.timeLimit * 1000;
    Live.players.forEach(pl => {
      if (!Live.results.roster.some(r => r.id === pl.id)) {
        Live.results.roster.push({ id: pl.id, name: pl.name, avatar: pl.avatar || '', color: pl.color || '' });
      }
    });
    const counts = p.options.map(() => 0), pts = Live.results.roster.map(() => 0);
    Live.results.roster.forEach((r, idx) => {
      const pl = Live.players.find(x => x.id === r.id), a = pl && pl['a' + i];
      if (!a || typeof a.choice !== 'number' || a.choice < 0 || a.choice >= counts.length) return;
      counts[a.choice]++;
      if (a.choice === p.correct) {
        const ms = Math.min(lim, Math.max(0, +a.ms || lim));
        pts[idx] = Math.round(1000 * (1 - (ms / lim) / 2));
      }
    });
    Live.results.qs[i] = { correct: p.correct, counts, pts, explanation: p.explanation };
    Live.room = { ...Live.room, status: 'reveal' };
    renderLive();
    try {
      await Store.set(`rooms/${Live.code}/results/all`, Live.results);
      await Store.set('rooms/' + Live.code, Live.room);
    } catch (e) {
      toast('Falha ao enviar o resultado. Verifique a conexão.');
    }
  }

  async function saveHistory(rk) {
    const r = Live.room;
    try {
      await Store.set('history/' + Live.code + '_' + Date.now(), {
        code: Live.code,
        hostId: Nivel.me.username,
        hostName: Nivel.me.name,
        kind: kindOf(r),
        title: kindOf(r) === 'game' ? `${gameName(r.gameId)}: ${r.bankName}` : r.bankName,
        bankName: r.bankName,
        level: r.level,
        date: Date.now(),
        players: rk.length,
        ranking: rk.slice(0, 40).map(x => ({ name: x.name, score: x.score }))
      });
    } catch (e) {
      console.warn('Falha ao salvar histórico:', e);
    }
  }

  async function hostFinish() {
    clearInterval(Live.timer);
    Live.room = { ...Live.room, status: 'finished' };
    renderLive();
    const rk = ranking(Live.results);
    try { await Store.set('rooms/' + Live.code, Live.room); } catch (e) {}
    saveHistory(rk);
  }

  /* ---------- Professor: Jogo ao Vivo ---------- */
  async function hostStartGame() {
    Live.room = { ...Live.room, status: 'playing', startedAt: Date.now() };
    Live.playStartMs = Live.room.startedAt + 3000;
    renderLive();
    startGameTimer();
    try {
      await Store.set('rooms/' + Live.code, Live.room);
    } catch (e) {
      toast('Falha ao iniciar. Verifique a conexão.');
    }
  }

  function startGameTimer() {
    clearInterval(Live.timer);
    Live.timer = setInterval(() => {
      updateTimer();
      if (Live.room.status === 'playing' && Date.now() >= Live.playStartMs + Live.room.duration * 1000 + 3000) {
        hostFinishGame();
      }
    }, 500);
  }

  async function hostFinishGame() {
    if (Live.mode !== 'host' || !Live.room || Live.room.status !== 'playing') return;
    clearInterval(Live.timer);
    const final = Live.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar || '',
      color: p.color || '',
      score: p.gscore || 0,
      asked: p.gasked || 0,
      right: p.gright || 0
    })).sort(byScore);
    Live.results = { ...Live.results, final };
    Live.room = { ...Live.room, status: 'finished' };
    renderLive();
    try {
      await Store.set(`rooms/${Live.code}/results/all`, Live.results);
      await Store.set('rooms/' + Live.code, Live.room);
    } catch (e) {}
    saveHistory(final);
  }

  async function closeRoom() {
    const code = Live.code;
    toast('Encerrando a sala…');
    await destroyRoom(code);
    lsDel('nivel-host');
    liveReset();
    ui.resume = null;
    loadHistory();
    renderLive();
    toast('Sala encerrada.');
  }

  /* ---------- Telas do Professor ---------- */
  function podiumHtml(rk) {
    const top = rk.slice(0, 3);
    if (!top.length) return '';
    const spec = [
      { i: 1, h: '120px', c: 'var(--lav)' },
      { i: 0, h: '170px', c: 'var(--yellow)' },
      { i: 2, h: '90px', c: 'var(--coral)' }
    ];
    return `<div class="podium">${spec.filter(s => top[s.i]).map(s => `<div class="pod"><div>${avatarHtml(top[s.i], 'sm')} ${esc(top[s.i].name)}<small>${top[s.i].score} pontos</small></div><div class="blk" style="--h:${s.h};--c:${s.c}">${s.i + 1}º</div></div>`).join('')}</div>`;
  }

  function rankListHtml(rk, limit, meId) {
    return `<ol class="rank">${rk.slice(0, limit).map((r, i) => `<li class="${r.id === meId ? 'me' : ''}"><span>${i + 1}º ${esc(r.name)}</span><span>${r.score}</span></li>`).join('')}</ol>`;
  }

  function renderHost(root) {
    const r = Live.room, game = kindOf(r) === 'game';
    if (r.status === 'lobby') {
      root.innerHTML = `<div class="live-stage"><div class="live-hero">
        <p style="margin:0;font-weight:600">${game ? `${esc(gameName(r.gameId))}, ${fmtClock(r.duration * 1000)} de duração. Perguntas: ${esc(r.bankName)}` : `${esc(r.bankName)}, ${plural(r.total, 'pergunta', 'perguntas')} de ${r.timeLimit} segundos`}</p>
        <div class="room-code" aria-label="Código da sala ${r.code.split('').join(' ')}">${fmtCode(r.code)}</div>
        <p style="margin:0">Alunos: entrem no Nível, abram <strong>Sala ao vivo</strong> e digitem o código.</p>
        <div class="pl-chips" id="lv-players"></div>
        <div class="row" style="justify-content:center"><button class="btn btn-primary" data-live="${game ? 'startgame' : 'start'}" id="lv-count">Iniciar</button><button class="btn" data-live="close">Cancelar sala</button></div>
      </div></div>`;
      onHostPlayers();
    } else if (r.status === 'question') {
      const c = r.current;
      root.innerHTML = `<div class="live-stage">
        <div class="q-top"><span class="q-tag">Pergunta ${r.qIndex + 1} de ${r.total}</span><span class="q-time"><span id="lv-sec">${r.timeLimit}</span> s</span></div>
        <div class="q-bar"><i id="lv-bar"></i></div>
        <h2 class="live-q">${esc(c.text)}</h2>
        <div class="opt-grid">${c.options.map((t, i) => `<div class="opt-blk" style="--c:${OC[i]}"><b>${LT[i]}</b><span>${esc(t)}</span></div>`).join('')}</div>
        <div class="row live-foot"><span class="live-count" id="lv-answered"></span><button class="btn" data-live="reveal">Mostrar resposta agora</button></div>
      </div>`;
      onHostPlayers();
    } else if (r.status === 'playing') {
      root.innerHTML = `<div class="live-stage">
        <div class="q-top"><span class="q-tag">${esc(gameName(r.gameId))}</span><span class="q-time" id="lv-clock"></span></div>
        <div class="q-bar"><i id="lv-gbar"></i></div>
        <h2 class="live-q">Placar ao vivo</h2>
        <div id="lv-rank"></div>
        <div class="row live-foot"><span class="live-count" id="lv-prog"></span><button class="btn" data-live="endgame">Encerrar agora</button></div>
      </div>`;
      onHostPlayers();
    } else if (r.status === 'reveal') {
      const i = r.qIndex, q = Live.results.qs[i], p = Live.prepared[i], total = q.counts.reduce((a, b) => a + b, 0), rk = ranking(Live.results);
      const last = i + 1 >= r.total;
      root.innerHTML = `<div class="live-stage">
        <div class="q-top"><span class="q-tag">Pergunta ${i + 1} de ${r.total}</span><span class="live-count">${plural(total, 'resposta', 'respostas')}</span></div>
        <h2 class="live-q">${esc(p.text)}</h2>
        ${p.options.map((t, k) => `<div class="dist ${k === q.correct ? 'right' : ''}" style="--c:${OC[k]};--w:${total ? Math.round(q.counts[k] / total * 100) : 0}%"><b>${LT[k]}</b><span>${esc(t)}${k === q.correct ? ' (correta)' : ''}</span><em>${q.counts[k]}</em></div>`).join('')}
        ${p.explanation ? `<p class="note">${esc(p.explanation)}</p>` : ''}
        <h3 class="t-h">Placar</h3>${rankListHtml(rk, 5)}
        <div class="row live-foot"><span></span><button class="btn btn-primary" data-live="${last ? 'finish' : 'next'}">${last ? 'Ver pódio final' : 'Próxima pergunta'}</button></div>
      </div>`;
    } else {
      const rk = ranking(Live.results);
      root.innerHTML = `<div class="live-stage"><div class="live-hero"><h2 style="font-size:2.4rem">Fim da dinâmica!</h2>${podiumHtml(rk)}</div>
        ${rk.length > 3 ? `<h3 class="t-h" style="margin-top:0">Classificação completa</h3>${rankListHtml(rk, 60)}` : ''}
        <div class="row live-foot"><span class="note" style="margin:0">O resultado fica salvo em "Últimas salas".</span><button class="btn btn-primary" data-live="close">Encerrar sala</button></div>
      </div>`;
    }
  }

  /* ---------- Aluno: Entrar e Jogar ---------- */
  function renderJoin(root) {
    root.innerHTML = `<div class="panel" style="max-width:520px;margin:0 auto;text-align:center">
      <h2>Entrar em uma sala</h2>
      <p class="note" style="margin:.6rem 0 1.2rem">Digite o código de 6 números que o professor mostrou na tela.</p>
      <input class="inp code-inp" id="join-code" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="000000" aria-label="Código da sala">
      <div style="margin-top:1.2rem"><button class="btn btn-primary" data-live="join">Entrar na sala</button></div>
    </div>`;
  }

  async function joinRoom(code, silent) {
    code = String(code).replace(/\D/g, '');
    if (code.length !== 6) {
      if (!silent) toast('O código tem 6 números.');
      return;
    }
    try {
      const room = await Store.get('rooms/' + code);
      if (!room || room.status === 'finished') {
        if (!silent) toast('Sala não encontrada. Confira o código com o professor.');
        ssDel('nivel-join');
        return;
      }
      const pref = `rooms/${code}/players/${Nivel.me.username}`;
      let rec = await Store.get(pref);
      if (!rec) {
        rec = {
          id: Nivel.me.username,
          name: Nivel.me.name,
          avatar: Nivel.me.avatar || '',
          color: Nivel.me.color || '',
          joinedAt: Date.now()
        };
        await Store.set(pref, rec);
      }
      liveReset();
      Live.mode = 'player';
      Live.code = code;
      Live.room = room;
      Live.myBest = rec.gscore || 0;
      Object.keys(rec).forEach(k => {
        if (/^a\d+$/.test(k)) Live.answers[+k.slice(1)] = rec[k].choice;
      });
      ssSet('nivel-join', code);
      Live.unsubs.push(Store.watchDoc('rooms/' + code, d => onRoomDoc(d)));
      Live.unsubs.push(Store.watchDoc(`rooms/${code}/results/all`, d => {
        Live.results = d || emptyResults();
        renderLive();
        maybeRecordLive();
      }));
      renderLive();
    } catch (e) {
      if (!silent) toast('Não foi possível entrar na sala. Tente de novo.');
    }
  }

  function liveOpts(r, countdown) {
    return {
      live: {
        code: Live.code,
        endAt: Live.endAt,
        countdown,
        timer: null,
        questions: r.gameQs,
        bank: { id: r.bankId || '', name: r.bankName, theme: r.theme || '', level: r.level || 'medio' }
      }
    };
  }

  function startLiveGame(d) {
    Live.endAt = Date.now() + 3000 + d.duration * 1000;
    launch(d.gameId, liveOpts(d, true));
  }

  function onRoomDoc(d) {
    if (Live.mode !== 'player') return;
    if (!d) {
      if (!Live.room || Live.room.status !== 'finished') Live.room = null;
      if (Nivel.G && Nivel.G.live) stopGame();
      if (Nivel.cur === 'game') Nivel.go('live');
      else renderLive();
      return;
    }
    const kind = kindOf(d);
    if (kind === 'quiz' && d.status === 'question' && d.current) {
      Live.qtexts[d.qIndex] = d.current.text;
      if (d.qIndex !== Live.seenQ) {
        Live.seenQ = d.qIndex;
        Live.qStartMs = Date.now();
        clearInterval(Live.timer);
        Live.timer = setInterval(updateTimer, 250);
      }
    }
    if (d.status !== 'question') clearInterval(Live.timer);
    Live.room = d;
    if (kind === 'game' && d.status === 'playing' && !Live.gameStarted) {
      Live.gameStarted = true;
      startLiveGame(d);
      return;
    }
    if (d.status === 'finished' && Nivel.G && Nivel.G.live) stopGame();
    if (d.status === 'finished' && Nivel.cur === 'game') Nivel.go('live');
    else renderLive();
    maybeRecordLive();
  }

  /* Ao fim do quiz ao vivo, registra o desempenho do aluno nas estatísticas (uma vez). */
  function maybeRecordLive() {
    const r = Live.room;
    if (Live.mode !== 'player' || Live.recorded || !r || r.status !== 'finished' || kindOf(r) !== 'quiz' || !Live.results.qs.length) return;
    Live.recorded = true;
    const mine = ranking(Live.results).find(x => x.id === Nivel.me.username);
    const log = [];
    let asked = 0, right = 0;
    Live.results.qs.forEach((q, i) => {
      const a = Live.answers[i];
      if (!q || a === undefined) return;
      asked++;
      const ok = a === q.correct;
      if (ok) right++;
      log.push({ q: Live.qtexts[i] || 'Pergunta ' + (i + 1), ok });
    });
    if (asked) {
      recordAttempt({
        game: 'livequiz',
        mode: 'sala',
        bank: { id: r.bankId || '', name: r.bankName, theme: r.theme || '', level: r.level || 'medio' },
        score: mine ? mine.score : 0,
        asked,
        right,
        log
      });
    }
  }

  function renderPlayer(root) {
    const r = Live.room, game = kindOf(r) === 'game';
    const leave = '<div class="row" style="justify-content:center;margin-top:1.2rem"><button class="btn btn-sm" data-live="leave">Sair da sala</button></div>';
    if (!r) {
      root.innerHTML = `<div class="live-stage"><div class="result-big"><h2>A sala foi encerrada</h2><p class="note">O professor encerrou a sala.</p></div>${leave}</div>`;
      return;
    }
    if (r.status === 'lobby') {
      root.innerHTML = `<div class="live-stage"><div class="result-big"><h2>Você está na sala!</h2><p class="lead" style="margin:.6rem auto">${game ? `Jogo: ${esc(gameName(r.gameId))}, ${fmtClock(r.duration * 1000)} de duração.` : `${esc(r.bankName)}, ${plural(r.total, 'pergunta', 'perguntas')}.`} Aguarde o professor iniciar.</p></div>${leave}</div>`;
    } else if (r.status === 'playing') {
      const can = Live.endAt - Date.now() > 5000;
      root.innerHTML = `<div class="live-stage"><div class="result-big"><h2>Jogo em andamento</h2><p class="lead" style="margin:.6rem auto">Sua melhor pontuação: <strong>${Live.myBest}</strong></p><p class="note">O resultado final aparece quando o professor encerrar.</p></div>
        <div class="row" style="justify-content:center">${can ? '<button class="btn btn-primary" data-live="resumegame">Voltar ao jogo</button>' : ''}</div>${leave}</div>`;
    } else if (r.status === 'question') {
      const c = r.current, i = r.qIndex, mine = Live.answers[i];
      root.innerHTML = `<div class="live-stage">
        <div class="q-top"><span class="q-tag">Pergunta ${i + 1} de ${r.total}</span><span class="q-time"><span id="lv-sec">${r.timeLimit}</span> s</span></div>
        <div class="q-bar"><i id="lv-bar"></i></div>
        <h2 class="live-q">${esc(c.text)}</h2>
        <div class="opt-grid">${c.options.map((t, k) => `<button class="opt-blk ${mine === k ? 'picked' : ''}" style="--c:${OC[k]}" data-ans="${k}" ${mine !== undefined ? 'disabled' : ''}><b>${LT[k]}</b><span>${esc(t)}</span></button>`).join('')}</div>
        <p class="live-count" id="lv-status" role="status" style="margin:1.2rem 0 0">${mine !== undefined ? 'Resposta enviada. Aguarde o resultado.' : ''}</p></div>`;
    } else if (r.status === 'reveal') {
      const i = r.qIndex, q = Live.results.qs[i];
      if (!q) {
        root.innerHTML = `<div class="live-stage"><div class="result-big"><h2>Calculando…</h2></div></div>`;
        return;
      }
      const idx = Live.results.roster.findIndex(p => p.id === Nivel.me.username);
      const pts = idx >= 0 ? (q.pts[idx] || 0) : 0;
      const mine = Live.answers[i], ok = mine !== undefined && mine === q.correct;
      const rk = ranking(Live.results), pos = rk.findIndex(x => x.id === Nivel.me.username) + 1;
      root.innerHTML = `<div class="live-stage ${ok ? 'result-ok' : 'result-bad'}"><div class="result-big">
        <h2>${mine === undefined ? 'Sem resposta' : ok ? 'Acertou!' : 'Não foi dessa vez'}</h2>
        <div class="pts">+${pts}</div>
        ${ok ? '' : `<p style="margin:0">Resposta certa: <strong>${LT[q.correct]}. ${esc(r.current.options[q.correct])}</strong></p>`}
        ${q.explanation ? `<p class="note">${esc(q.explanation)}</p>` : ''}
        ${pos ? `<p style="font-weight:700;margin:1rem 0 0">Você está em ${pos}º lugar com ${rk[pos - 1].score} pontos</p>` : ''}
        <p class="note">Aguarde a próxima pergunta.</p></div>${leave}</div>`;
    } else {
      const rk = ranking(Live.results), pos = rk.findIndex(x => x.id === Nivel.me.username) + 1;
      root.innerHTML = `<div class="live-stage"><div class="live-hero"><h2 style="font-size:2.4rem">Fim da dinâmica!</h2>
        ${pos ? `<p class="lead" style="margin:.6rem auto"><strong>Você ficou em ${pos}º lugar com ${rk[pos - 1].score} pontos.</strong></p>` : ''}
        ${podiumHtml(rk)}</div>${leave}</div>`;
    }
  }

  async function submitAnswer(k) {
    const r = Live.room;
    if (!r || r.status !== 'question') return;
    const i = r.qIndex;
    if (Live.answers[i] !== undefined) return;
    const ms = Date.now() - Live.qStartMs;
    if (ms > r.timeLimit * 1000 + 300) return;
    Live.answers[i] = k;
    renderLive();
    try {
      await Store.update(`rooms/${Live.code}/players/${Nivel.me.username}`, { ['a' + i]: { choice: k, ms } });
    } catch (e) {
      delete Live.answers[i];
      renderLive();
      toast('Não consegui enviar sua resposta. Toque de novo.');
    }
  }

  function leaveRoom() {
    stopGame();
    ssDel('nivel-join');
    liveReset();
    if (Nivel.cur === 'game') Nivel.go('live');
    else renderLive();
  }

  /* ---------- Cronômetros ---------- */
  function updateTimer() {
    const r = Live.room;
    if (!r) return;
    if (kindOf(r) === 'game') {
      if (r.status !== 'playing' || Live.mode !== 'host') return;
      const total = r.duration * 1000, left = Live.playStartMs + total - Date.now();
      const c = $('#lv-clock'), b = $('#lv-gbar');
      if (c) c.textContent = fmtClock(left);
      if (b) {
        b.style.width = Math.max(0, Math.min(100, left / total * 100)) + '%';
        b.classList.toggle('low', left / total < .2);
      }
      return;
    }
    const bar = $('#lv-bar'), sec = $('#lv-sec');
    if (r.status !== 'question' || !bar) return;
    const total = r.timeLimit * 1000, left = total - (Date.now() - Live.qStartMs);
    bar.style.width = Math.max(0, left / total * 100) + '%';
    bar.classList.toggle('low', left / total < .3);
    if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 0 && Live.mode === 'player') {
      $$('#live-root [data-ans]').forEach(b => { b.disabled = true; });
      const s = $('#lv-status');
      if (s && Live.answers[r.qIndex] === undefined) s.textContent = 'Tempo esgotado. Aguarde o resultado.';
    }
  }

  /* ---------- Eventos da Sala ---------- */
  const lvw = $('#view-live');
  lvw.addEventListener('click', e => {
    const a = e.target.closest('[data-ans]');
    if (a) {
      submitAnswer(+a.dataset.ans);
      return;
    }
    const b = e.target.closest('[data-live]');
    if (!b) return;
    switch (b.dataset.live) {
      case 'create': createRoom(); break;
      case 'resume': resumeRoom(); break;
      case 'start': hostQuestion(0); break;
      case 'startgame': hostStartGame(); break;
      case 'endgame': armed(b, 'Clique de novo para encerrar', hostFinishGame); break;
      case 'next': hostQuestion(Live.room.qIndex + 1); break;
      case 'reveal': hostReveal(); break;
      case 'finish': hostFinish(); break;
      case 'close': armed(b, 'Clique de novo para encerrar', closeRoom); break;
      case 'join': joinRoom($('#join-code').value); break;
      case 'resumegame': {
        const r = Live.room;
        if (r && r.status === 'playing' && Live.endAt - Date.now() > 5000) launch(r.gameId, liveOpts(r, false));
        break;
      }
      case 'leave': leaveRoom(); break;
    }
  });

  lvw.addEventListener('change', e => {
    if (e.target.id === 'lv-kind') { ui.liveKind = e.target.value; renderLive(); }
    if (e.target.id === 'lv-bank') ui.liveBank = e.target.value;
    if (e.target.id === 'lv-time') ui.liveTime = e.target.value;
    if (e.target.id === 'lv-n') ui.liveN = e.target.value;
    if (e.target.id === 'lv-dur') ui.liveDur = e.target.value;
  });

  lvw.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'join-code') joinRoom(e.target.value);
  });

  lvw.addEventListener('input', e => {
    if (e.target.id === 'join-code') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  Object.assign(Nivel, {
    liveReset,
    ranking,
    enterLive,
    loadHistory,
    destroyRoom,
    checkResume,
    renderLive,
    joinRoom,
    leaveRoom
  });
})();
