(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, plural, lsSet, lv, levelBadge,
    cache, st, activeBank, GAMES
  } = Nivel;

  /* =====================================================================
     View: Home (Seleção de Questionário e Jogos)
     ===================================================================== */
  function renderHome() {
    const me = Nivel.me;
    const first = me.name.split(' ')[0];
    $('#hello').textContent = `Oi, ${first}. Escolha um jogo e um questionário. As perguntas surgem durante a partida e valem pontos, vidas ou tempo extra.`;
    const sel = $('#bank-select');
    sel.innerHTML = cache.banks.map(b => `<option value="${b.id}">${esc(b.name)} (${lv(b.level).label})</option>`).join('') || '<option value="">Nenhum questionário disponível</option>';
    const b = activeBank();
    if (b) sel.value = b.id;
    updateBankInfo();

    $('#live').innerHTML = GAMES.map(g => `
      <button class="tile" style="--c:${g.color}" data-play="${g.id}">
        <span class="tile-emoji" aria-hidden="true">${g.emoji}</span>
        <span class="tile-name">${g.name}</span>
        <span class="tile-desc">${g.desc}</span>
        <span class="tile-best">${st.best[g.id] ? `Seu recorde: ${st.best[g.id]} pontos` : 'Sem recorde ainda'}</span>
      </button>`).join('');

    $('#cta').innerHTML = me.role === 'teacher'
      ? `<div><h2>Sala ao vivo</h2><p>Faça uma dinâmica com a turma toda ao mesmo tempo. Você projeta as perguntas e os alunos respondem no celular.</p></div><button class="btn" data-go="live">Criar uma sala</button>`
      : `<div><h2>Sala ao vivo</h2><p>Seu professor abriu uma sala? Digite o código e responda junto com a turma.</p></div><button class="btn" data-go="live">Entrar em uma sala</button>`;
  }

  function updateBankInfo() {
    const b = activeBank(), box = $('#bank-info');
    if (!b) {
      box.innerHTML = Nivel.me.role === 'teacher'
        ? 'Crie um questionário na aba Questionários.'
        : 'Peça ao professor para criar um questionário.';
      return;
    }
    box.innerHTML = `${levelBadge(b.level)}<span>${lv(b.level).note}</span>${b.theme ? `<span>Tema: ${esc(b.theme)}</span>` : ''}<span>${plural(b.questions.length, 'pergunta', 'perguntas')}</span>`;
  }

  $('#bank-select').addEventListener('change', e => {
    st.active = e.target.value;
    lsSet('nivel-active-bank', st.active);
    updateBankInfo();
  });

  Object.assign(Nivel, {
    renderHome,
    updateBankInfo
  });
})();
