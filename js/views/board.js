(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, avatarHtml, pad2, weekKey, prevWeekKey, weekLabel,
    ui, loadStats, ptsFor
  } = Nivel;

  /* =====================================================================
     View: Placar Semanal
     ===================================================================== */
  async function renderBoard(force) {
    const v = $('#view-board'), tab = ui.boardTab || 'this', wk = weekKey();
    const labels = { this: 'Esta semana', last: 'Semana passada', all: 'Geral' };
    let range = 'Pontos de todas as partidas até hoje';
    if (tab !== 'all') {
      const k = tab === 'last' ? prevWeekKey(wk) : wk;
      const [y, m, d] = k.split('-').map(Number);
      const e = new Date(y, m - 1, d + 6);
      range = `Semana de ${weekLabel(k)} a ${pad2(e.getDate())}/${pad2(e.getMonth() + 1)}`;
    }
    v.innerHTML = `<div class="u-wrap"><div class="panel">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">Placar dos alunos</h2><button class="btn btn-sm" data-board="refresh">Atualizar</button></div>
      <div class="row" style="margin:1rem 0 .4rem">${Object.entries(labels).map(([k, l]) => `<button class="btn btn-sm ${k === tab ? 'btn-primary' : ''}" data-board="${k}">${l}</button>`).join('')}</div>
      <p class="note" style="margin:.2rem 0 1rem">${range}. Contam os pontos de todas as partidas e das salas ao vivo. O placar zera toda segunda-feira.</p>
      <div id="board-body"><p class="note">Carregando…</p></div></div></div>`;

    try {
      const list = await loadStats(force);
      if (Nivel.cur !== 'board') return;
      const rows = list
        .filter(s => s.role === 'student')
        .map(s => ({ s, p: ptsFor(s, tab) }))
        .filter(x => x.p > 0)
        .sort((a, b) => b.p - a.p || String(a.s.name).localeCompare(String(b.s.name), 'pt-BR'));
      const top = rows.slice(0, 10);
      const mine = rows.findIndex(x => x.s.uid === Nivel.me.username);
      $('#board-body').innerHTML = top.length
        ? `<ol class="board">${top.map((x, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${x.s.uid === Nivel.me.username ? 'me' : ''}"><span class="pos">${i + 1}</span>${avatarHtml(x.s)}<span class="nm">${esc(x.s.name)}</span><span class="pt">${x.p}</span></li>`).join('')}</ol>
           ${Nivel.me.role === 'student' ? (mine >= 10 ? `<p class="board-me">Você está em ${mine + 1}º lugar com ${rows[mine].p} pontos. Continue jogando para entrar no top 10!</p>` : mine < 0 ? '<p class="board-me">Você ainda não pontuou neste período. Jogue uma partida para entrar no placar!</p>' : '') : ''}`
        : '<p class="note">Ninguém pontuou neste período ainda. Jogue uma partida para abrir o placar!</p>';
    } catch (e) {
      const b = $('#board-body');
      if (b) b.innerHTML = '<p class="note">Não foi possível carregar o placar. Tente atualizar.</p>';
    }
  }

  $('#view-board').addEventListener('click', e => {
    const b = e.target.closest('[data-board]');
    if (!b) return;
    if (b.dataset.board === 'refresh') renderBoard(true);
    else {
      ui.boardTab = b.dataset.board;
      renderBoard();
    }
  });

  Object.assign(Nivel, {
    renderBoard
  });
})();
