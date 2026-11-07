(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { shuffle } = Nivel;

  /* ---------- Jogo 2: Memória dos Pares ---------- */
  function memory(api) {
    const EMOJI = ['🚀','🎧','🌵','🍕','⚽','🎨','🦊','🌈','🎸','🐙'];
    const pick = shuffle(EMOJI).slice(0, 6);
    const cards = shuffle([...pick, ...pick]).map((e, i) => ({ e, i, open: false, done: false }));
    const wrap = document.createElement('div');
    wrap.className = 'mem';
    wrap.innerHTML = cards.map(c => `<button class="mem-card" data-i="${c.i}" aria-label="Carta virada para baixo"><span class="back">?</span><span class="front">${c.e}</span></button>`).join('');
    api.stage.appendChild(wrap);

    let first = null, lock = false, found = 0;
    api.info('Pares encontrados: 0 de 6');

    const el = c => wrap.children[c.i];
    const flip = (c, open) => {
      c.open = open;
      el(c).classList.toggle('open', open);
      el(c).setAttribute('aria-label', open ? `Carta ${c.e}` : 'Carta virada para baixo');
    };

    const timers = [];
    api.onStop(() => timers.forEach(clearTimeout));

    wrap.addEventListener('click', async e => {
      const b = e.target.closest('.mem-card');
      if (!b || lock || api.isOver()) return;
      const c = cards[+b.dataset.i];
      if (c.open || c.done) return;
      flip(c, true);
      if (!first) {
        first = c;
        return;
      }
      const a = first;
      first = null;
      lock = true;

      if (a.e !== c.e) {
        timers.push(setTimeout(() => {
          flip(a, false);
          flip(c, false);
          lock = false;
        }, 800));
        return;
      }

      await new Promise(r => timers.push(setTimeout(r, 400)));
      const ok = await api.ask({ tag: 'Par encontrado! Responda para ficar com ele' });
      if (api.isOver()) return;

      if (ok) {
        a.done = c.done = true;
        el(a).classList.add('done');
        el(c).classList.add('done');
        api.add(100);
        found++;
        api.info(`Pares encontrados: ${found} de 6`);
        if (found === 6) {
          api.add(api.lives * 50);
          api.end('Todos os pares!');
          return;
        }
      } else {
        flip(a, false);
        flip(c, false);
        if (api.loseLife() <= 0) return;
      }
      lock = false;
    });
  }

  Nivel.gameImpls.memory = memory;
})();
