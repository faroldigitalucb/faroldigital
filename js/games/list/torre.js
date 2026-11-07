(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { $$, rand } = Nivel;

  /* ---------- Jogo 9: Defesa da Torre ---------- */
  function torre(api) {
    const box = document.createElement('div');
    box.className = 'td';
    box.innerHTML = [0, 1, 2].map(l => `<div class="td-lane" data-l="${l}" role="button" tabindex="0" aria-label="Faixa ${l + 1}. Toque para atirar"><span class="td-tower" aria-hidden="true">🏰</span></div>`).join('');
    api.stage.appendChild(box);

    const GOAL = 25, ENEMY = ['👾', '👹', '🤖', '👻'];
    let list = [], ammo = 6, kills = 0, asking = false, spawnT = 0, spawnEvery = 1500, last = performance.now(), raf = 0;
    const lanes = $$('.td-lane', box);
    const info = () => api.info(`Munição: ${ammo}. Derrotados: ${kills} de ${GOAL}`);

    function spawn() {
      const l = rand(3), el = document.createElement('span');
      el.className = 'td-enemy';
      el.textContent = ENEMY[rand(ENEMY.length)];
      lanes[l].appendChild(el);
      list.push({ el, l, x: lanes[l].clientWidth, sp: 38 + Math.random() * 22 + kills * 1.2 });
    }

    function boom(l, x) {
      const b = document.createElement('span');
      b.className = 'td-boom';
      b.textContent = '💥';
      b.style.left = x + 'px';
      lanes[l].appendChild(b);
      setTimeout(() => b.remove(), 500);
    }

    async function reload() {
      asking = true;
      const ok = await api.ask({ tag: 'Sem munição! Responda para recarregar' });
      if (api.isOver()) return;
      if (ok) {
        ammo = 6;
        api.add(30);
      } else {
        ammo = 3;
        if (api.loseLife() <= 0) return;
      }
      asking = false;
      last = performance.now();
      info();
    }

    function fire(l) {
      if (asking || api.isOver()) return;
      if (ammo <= 0) {
        reload();
        return;
      }
      ammo--;
      const target = list.filter(e => e.l === l).sort((a, b) => a.x - b.x)[0];
      if (target) {
        list = list.filter(e => e !== target);
        boom(l, target.x);
        target.el.remove();
        kills++;
        api.add(20);
        if (kills >= GOAL) {
          api.add(api.lives * 50);
          api.end('Torre defendida!');
          return;
        }
      }
      info();
      if (ammo <= 0) reload();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      if (asking || api.isOver()) return;
      spawnT += dt * 1000;
      if (spawnT >= spawnEvery) {
        spawnT = 0;
        spawn();
        spawnEvery = Math.max(750, spawnEvery - 25);
      }
      for (const e of list) {
        e.x -= e.sp * dt;
        e.el.style.transform = `translateX(${e.x}px)`;
      }
      const hit = list.filter(e => e.x <= 50);
      if (hit.length) {
        list = list.filter(e => e.x > 50);
        hit.forEach(e => e.el.remove());
        for (let i = 0; i < hit.length; i++) if (api.loseLife() <= 0) return;
      }
    }

    lanes.forEach((ln, l) => {
      ln.addEventListener('pointerdown', e => { e.preventDefault(); fire(l); });
      ln.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fire(l);
        }
      });
    });

    const onKey = e => {
      if (asking) return;
      const k = { '1': 0, '2': 1, '3': 2 }[e.key];
      if (k !== undefined) fire(k);
    };
    document.addEventListener('keydown', onKey);
    api.onStop(() => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    });
    info();
    raf = requestAnimationFrame(frame);
  }

  Nivel.gameImpls.torre = torre;
})();
