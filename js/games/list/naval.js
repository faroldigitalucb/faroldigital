(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { rand } = Nivel;

  /* ---------- Jogo 7: Batalha Naval ---------- */
  function naval(api) {
    const N = 6, LENS = [3, 2, 2];
    const grid = Array.from({ length: N * N }, () => ({ ship: -1, fired: false }));
    LENS.forEach((len, id) => {
      for (let t = 0; t < 300; t++) {
        const h = Math.random() < .5, r = rand(h ? N : N - len + 1), c = rand(h ? N - len + 1 : N);
        const cells = Array.from({ length: len }, (_, i) => (h ? r * N + c + i : (r + i) * N + c));
        if (cells.every(i => grid[i].ship < 0)) {
          cells.forEach(i => { grid[i].ship = id; });
          break;
        }
      }
    });

    const hits = LENS.map(() => 0);
    let shots = 18, sunk = 0, asking = false;
    const wrap = document.createElement('div');
    wrap.className = 'nv';
    api.stage.appendChild(wrap);

    function render() {
      wrap.innerHTML = grid.map((c, i) => {
        let cls = 'nv-cell', txt = '';
        if (c.fired) {
          if (c.ship >= 0) {
            const done = hits[c.ship] === LENS[c.ship];
            cls += done ? ' sunk' : ' hit';
            txt = done ? '🚢' : '💥';
          } else {
            cls += ' miss';
            txt = '•';
          }
        }
        return `<button class="${cls}" data-i="${i}" aria-label="Casa ${i + 1}" ${c.fired || asking ? 'disabled' : ''}>${txt}</button>`;
      }).join('');
      api.info(`Tiros: ${shots}. Navios afundados: ${sunk} de ${LENS.length}`);
    }

    wrap.addEventListener('click', async e => {
      const b = e.target.closest('.nv-cell');
      if (!b || asking || api.isOver()) return;
      const c = grid[+b.dataset.i];
      if (c.fired) return;
      asking = true;
      render();
      const ok = await api.ask({ tag: 'Prepare o disparo! Acerte a pergunta para atirar' });
      if (api.isOver()) return;
      asking = false;
      if (!ok) {
        if (api.loseLife() <= 0) return;
        render();
        return;
      }
      c.fired = true;
      shots--;
      if (c.ship >= 0) {
        hits[c.ship]++;
        api.add(100);
        if (hits[c.ship] === LENS[c.ship]) {
          sunk++;
          api.add(150);
          if (sunk === LENS.length) {
            render();
            api.add(shots * 20);
            api.end('Frota afundada!');
            return;
          }
        }
      }
      render();
      if (shots <= 0) api.end('Acabaram os tiros.');
    });

    render();
  }

  Nivel.gameImpls.naval = naval;
})();
