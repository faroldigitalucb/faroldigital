(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { $, rand, mkWait } = Nivel;

  /* ---------- Jogo 8: Caça ao Tesouro (trilha com dado) ---------- */
  function trilha(api) {
    const N = 24, COLS = 6, MAXT = 30;
    const tiles = Array.from({ length: N }, (_, i) => {
      if (i === 0) return 's';
      if (i === N - 1) return 'x';
      const r = Math.random();
      return r < .42 ? 'q' : r < .55 ? 'c' : r < .68 ? 't' : 'n';
    });
    const ICON = { s: '🏁', x: '💎', q: '❓', c: '🎁', t: '💣', n: '' };
    let pos = 0, busy = false, turns = 0;
    const wait = mkWait(api);

    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="tr"></div>' +
      '<p class="tr-msg" aria-live="polite">Role o dado para começar.</p>' +
      '<div class="tr-ctl"><button class="btn btn-primary" data-roll>Rolar dado</button><span class="note" data-turn style="margin:0"></span></div>';
    api.stage.appendChild(wrap);

    const board = $('.tr', wrap), msg = $('.tr-msg', wrap), roll = $('[data-roll]', wrap), turnEl = $('[data-turn]', wrap);
    const cellPos = i => {
      const r = Math.floor(i / COLS);
      return [r + 1, (r % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS)) + 1];
    };

    function render() {
      board.innerHTML = tiles.map((t, i) => {
        const [r, c] = cellPos(i);
        return `<div class="tr-tile ${t} ${i === pos ? 'here' : ''}" style="grid-row:${r};grid-column:${c}" aria-label="Casa ${i + 1}">${i === pos ? '🧭' : ICON[t]}</div>`;
      }).join('');
      turnEl.textContent = `Jogada ${turns} de ${MAXT}`;
      roll.disabled = busy;
      api.info(`Casa ${pos + 1} de ${N}`);
    }

    async function move(to) {
      while (pos !== to) {
        pos += pos < to ? 1 : -1;
        render();
        await wait(230);
        if (api.isOver()) return false;
      }
      return true;
    }

    roll.addEventListener('click', async () => {
      if (busy || api.isOver()) return;
      busy = true;
      turns++;
      const d = 1 + rand(3);
      msg.textContent = `🎲 Você tirou ${d}!`;
      render();
      await wait(500);
      if (!(await move(Math.min(N - 1, pos + d)))) return;

      const t = tiles[pos];
      if (t === 'x') {
        api.add(300 + api.lives * 50);
        api.end('Você achou o tesouro!');
        return;
      }
      if (t === 'c') {
        msg.textContent = 'Baú de bônus! +60';
        api.add(60);
      } else if (t === 't') {
        msg.textContent = 'Armadilha! Volte 2 casas.';
        await wait(500);
        if (!(await move(Math.max(0, pos - 2)))) return;
      } else if (t === 'q') {
        msg.textContent = 'Casa de pergunta!';
        render();
        const ok = await api.ask({ tag: 'Casa de pergunta' });
        if (api.isOver()) return;
        if (ok) {
          api.add(100);
          msg.textContent = 'Acertou! +100';
        } else {
          msg.textContent = 'Errou. Você perdeu uma vida.';
          if (api.loseLife() <= 0) return;
        }
      } else {
        msg.textContent = 'Casa tranquila. Role de novo.';
      }
      busy = false;
      if (turns >= MAXT) {
        api.end('Acabaram as jogadas.');
        return;
      }
      render();
    });

    render();
  }

  Nivel.gameImpls.trilha = trilha;
})();
