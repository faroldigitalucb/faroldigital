(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    Store, statsCache, esc, plural, levelBadge,
    weekKey, prevWeekKey, weekLabel, fmtDT, gameName
  } = Nivel;

  /* =====================================================================
     Serviço de Estatísticas e Desempenho
     Documento por aluno: stats/{usuário}
     ===================================================================== */
  const newStats = () => ({
    total: { points: 0, games: 0, asked: 0, right: 0 },
    weeks: {},
    byGame: {},
    byBank: {},
    recent: [],
    wrong: [],
    lastAt: 0
  });

  let statsQ = Promise.resolve();

  function recordAttempt(a) {
    const me = Nivel.me;
    if (!me) return;
    const u = me.username;
    const wk = weekKey();
    const snap = { name: me.name, role: me.role, avatar: me.avatar || '', color: me.color || '' };

    statsQ = statsQ.then(async () => {
      const path = 'stats/' + u;
      let s = null;
      try { s = await Store.get(path); } catch (e) { return; }
      s = s && s.total ? s : newStats();
      Object.assign(s, snap, { uid: u });

      const add = o => {
        o.points = (o.points || 0) + a.score;
        o.games = (o.games || 0) + 1;
        o.asked = (o.asked || 0) + a.asked;
        o.right = (o.right || 0) + a.right;
        return o;
      };

      add(s.total);
      s.weeks = s.weeks || {};
      s.weeks[wk] = add(s.weeks[wk] || {});
      Object.keys(s.weeks).sort().reverse().slice(16).forEach(k => { delete s.weeks[k]; });

      s.byGame = s.byGame || {};
      const bg = s.byGame[a.game] || { plays: 0, best: 0, asked: 0, right: 0 };
      bg.plays++;
      bg.best = Math.max(bg.best, a.score);
      bg.asked += a.asked;
      bg.right += a.right;
      s.byGame[a.game] = bg;

      s.byBank = s.byBank || {};
      if (a.bank && a.bank.id) {
        const bb = s.byBank[a.bank.id] || { plays: 0, asked: 0, right: 0 };
        Object.assign(bb, {
          name: a.bank.name || '',
          theme: a.bank.theme || '',
          level: a.bank.level || 'medio'
        });
        bb.plays++;
        bb.asked += a.asked;
        bb.right += a.right;
        s.byBank[a.bank.id] = bb;
      }

      const bankName = (a.bank && a.bank.name) || '';
      s.recent = [
        { at: Date.now(), game: a.game, mode: a.mode, bank: bankName, score: a.score, asked: a.asked, right: a.right },
        ...(s.recent || [])
      ].slice(0, 30);

      const seen = new Set();
      const wrong = [];
      (a.log || []).filter(x => !x.ok).forEach(x => {
        if (!seen.has(x.q)) {
          seen.add(x.q);
          wrong.push({ at: Date.now(), q: String(x.q).slice(0, 160), bank: bankName });
        }
      });
      s.wrong = [...wrong, ...(s.wrong || [])].slice(0, 20);
      s.lastAt = Date.now();

      try {
        await Store.set(path, s);
        statsCache.at = 0;
      } catch (e) {
        console.warn('Falha ao gravar estatísticas:', e);
      }
    }).catch(e => console.warn('Falha ao registrar estatísticas:', e));
  }

  async function loadStats(force) {
    if (!force && Date.now() - statsCache.at < 30000) return statsCache.list;
    const l = await Store.list('stats');
    statsCache.at = Date.now();
    statsCache.list = l.map(x => ({ ...x.data, uid: x.id }));
    return statsCache.list;
  }

  const ptsFor = (s, tab) =>
    tab === 'all'
      ? ((s.total || {}).points || 0)
      : (((s.weeks || {})[tab === 'last' ? prevWeekKey(weekKey()) : weekKey()] || {}).points || 0);

  function reportHtml(u, s) {
    if (!s || !s.total || !s.total.games) {
      return `<p class="note">${esc(u.name)} ainda não terminou nenhuma partida. Os números aparecem aqui assim que a primeira acabar.</p>`;
    }
    const t = s.total, wk = weekKey(), w = (s.weeks || {})[wk] || {};
    const acc = t.asked ? Math.round(t.right / t.asked * 100) : 0;
    const keys = Array.from({ length: 8 }, (_, i) => prevWeekKey(wk, 7 - i));
    const vals = keys.map(k => ((s.weeks || {})[k] || {}).points || 0);
    const max = Math.max(1, ...vals);
    const banks = Object.values(s.byBank || {})
      .filter(b => b.asked > 0)
      .map(b => ({ ...b, acc: Math.round(b.right / b.asked * 100) }))
      .sort((a, b) => a.acc - b.acc);
    const weak = banks.filter(b => b.asked >= 5 && b.acc < 60);
    const games = Object.entries(s.byGame || {})
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.plays - a.plays);
    const meter = p => `<div class="meter ${p < 60 ? 'low' : p < 80 ? 'mid' : ''}" style="--w:${p}%"><i></i></div>`;

    return `
    <div class="kpis">
      <div class="kpi"><b>${t.points}</b><span>pontos no total</span></div>
      <div class="kpi"><b>${w.points || 0}</b><span>pontos nesta semana</span></div>
      <div class="kpi"><b>${t.games}</b><span>partidas jogadas</span></div>
      <div class="kpi"><b>${t.asked}</b><span>perguntas respondidas</span></div>
      <div class="kpi"><b>${acc}%</b><span>de acerto geral</span></div>
    </div>
    ${weak.length ? `<div class="callout">Ponto de atenção: ${weak.map(b => `${esc(b.name)} (${b.acc}% de acerto)`).join(', ')}. Vale revisar esse conteúdo.</div>` : ''}
    <h3 class="t-h">Pontos por semana</h3>
    <div class="wk">${keys.map((k, i) => `<div><em>${vals[i]}</em><span class="wkbar"><i style="--h:${Math.round(vals[i] / max * 100)}%"></i></span><small>${weekLabel(k)}</small></div>`).join('')}</div>
    <h3 class="t-h">Acerto por questionário</h3>
    ${banks.length ? banks.map(b => `<div class="acc-row"><div><strong>${esc(b.name)}</strong><small>${b.theme ? esc(b.theme) + '. ' : ''}${levelBadge(b.level)} ${plural(b.plays, 'partida', 'partidas')}</small></div>${meter(b.acc)}<strong>${b.acc}% <small>(${b.right}/${b.asked})</small></strong></div>`).join('') : '<p class="note">Sem dados por questionário ainda.</p>'}
    <h3 class="t-h">Por jogo</h3>
    <div class="scroll"><table class="utable"><thead><tr><th>Jogo</th><th>Partidas</th><th>Melhor pontuação</th><th>Acerto</th></tr></thead><tbody>
      ${games.map(g => `<tr><td>${esc(gameName(g.id))}</td><td>${g.plays}</td><td>${g.best}</td><td>${g.asked ? Math.round(g.right / g.asked * 100) + '%' : '-'}</td></tr>`).join('')}</tbody></table></div>
    <h3 class="t-h">Últimas partidas</h3>
    <div class="scroll"><table class="utable"><thead><tr><th>Quando</th><th>Jogo</th><th>Questionário</th><th>Pontos</th><th>Acertos</th></tr></thead><tbody>
      ${(s.recent || []).slice(0, 12).map(r => `<tr><td>${fmtDT(r.at)}</td><td>${esc(gameName(r.game))}${r.mode === 'sala' ? ' (sala)' : ''}</td><td>${esc(r.bank)}</td><td>${r.score}</td><td>${r.right}/${r.asked}</td></tr>`).join('')}</tbody></table></div>
    <h3 class="t-h">Perguntas que errou recentemente</h3>
    ${(s.wrong || []).length ? `<ul class="wrong-list">${s.wrong.slice(0, 10).map(x => `<li>${esc(x.q)} <small>${esc(x.bank)}, ${new Date(x.at).toLocaleDateString('pt-BR')}</small></li>`).join('')}</ul>` : '<p class="note">Nenhum erro registrado ainda.</p>'}`;
  }

  Object.assign(Nivel, {
    newStats,
    recordAttempt,
    loadStats,
    ptsFor,
    reportHtml
  });
})();
