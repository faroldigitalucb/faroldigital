(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { rand } = Nivel;

  /* ---------- Jogo 4: Estoura Balões ---------- */
  function balloons(api) {
    const sky = document.createElement('div');
    sky.className = 'sky';
    api.stage.appendChild(sky);
    const COLORS = ['#FF8FA0', '#FFD23F', '#5EEAC0', '#B9B6FF', '#FF9F5E'];
    let time = 60, list = [], pops = 0, spawnT = 0, spawnEvery = 700, last = performance.now(), raf = 0, asking = false, lastSec = -1, elapsed = 0;

    function floatText(txt, x, y) {
      const f = document.createElement('span');
      f.className = 'float';
      f.textContent = txt;
      f.style.left = x + 'px';
      f.style.top = y + 'px';
      sky.appendChild(f);
      setTimeout(() => f.remove(), 800);
    }

    function spawn() {
      const bomb = Math.random() < .14;
      const el = document.createElement('button');
      el.className = 'balloon';
      el.setAttribute('aria-label', bomb ? 'Bomba' : 'Balão');
      el.style.left = rand(Math.max(1, sky.clientWidth - 64)) + 'px';
      el.style.background = bomb ? '#16163F' : COLORS[rand(COLORS.length)];
      if (bomb) el.textContent = '✖';
      const b = { el, bomb, y: sky.clientHeight + 10, speed: 70 + Math.random() * 60 };
      el.addEventListener('pointerdown', ev => { ev.preventDefault(); pop(b); });
      sky.appendChild(el);
      list.push(b);
    }

    function pop(b) {
      if (asking || api.isOver() || !list.includes(b)) return;
      list = list.filter(x => x !== b);
      const x = parseFloat(b.el.style.left), y = b.y;
      b.el.classList.add('pop');
      setTimeout(() => b.el.remove(), 200);
      if (b.bomb) {
        time -= 5;
        floatText('-5 s', x, y);
        return;
      }
      api.add(10);
      floatText('+' + Math.round(10 * api.mult), x, y);
      pops++;
      if (pops % 6 === 0) questionTime();
    }

    async function questionTime() {
      asking = true;
      const ok = await api.ask({ tag: 'Pergunta relâmpago' });
      if (api.isOver()) return;
      if (ok) {
        api.add(100);
        time += 8;
      } else {
        time -= 5;
      }
      asking = false;
      last = performance.now();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      if (asking || api.isOver()) return;
      time -= dt;
      elapsed += dt;
      spawnT += dt * 1000;
      if (spawnT >= spawnEvery) {
        spawnT = 0;
        spawn();
        spawnEvery = Math.max(380, spawnEvery - 5);
      }
      const boost = 1 + Math.min(.6, elapsed / 100);
      list.forEach(b => {
        b.y -= b.speed * boost * dt;
        b.el.style.transform = `translateY(${b.y}px)`;
      });
      list = list.filter(b => {
        if (b.y < -100) {
          b.el.remove();
          return false;
        }
        return true;
      });
      const sec = Math.ceil(Math.max(0, time));
      if (sec !== lastSec) {
        lastSec = sec;
        api.info(`Tempo: ${sec} s`);
      }
      if (time <= 0) api.end('O tempo acabou!');
    }

    api.onStop(() => cancelAnimationFrame(raf));
    api.info('Tempo: 60 s');
    raf = requestAnimationFrame(frame);
  }

  Nivel.gameImpls.balloons = balloons;
})();
