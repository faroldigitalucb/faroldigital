(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { rand } = Nivel;

  /* ---------- Jogo 5: Corrida de Obstáculos ---------- */
  function runner(api) {
    const W = 640, H = 260, GY = 210, PX = 70, PW = 34, PH = 42;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    cv.className = 'run-cv';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Corrida de obstáculos. Aperte espaço ou toque para pular.');
    api.stage.appendChild(cv);
    const g = cv.getContext('2d');

    let y = GY - PH, vy = 0, obs = [], spawn = 60, cleared = 0, asking = false, started = false, inv = 0, raf = 0, last = performance.now(), dist = 0;

    const jump = () => {
      if (api.isOver() || asking) return;
      started = true;
      if (y >= GY - PH - 0.5) vy = -13;
    };

    const onKey = e => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        jump();
      }
    };
    document.addEventListener('keydown', onKey);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });

    async function checkpoint() {
      asking = true;
      const ok = await api.ask({ tag: 'Checkpoint! Responda para seguir' });
      if (api.isOver()) return;
      if (ok) api.add(100);
      else if (api.loseLife() <= 0) return;
      obs = obs.filter(o => o.x > W);
      inv = 60;
      asking = false;
      last = performance.now();
    }

    function update(k) {
      vy += 0.75 * k;
      y += vy * k;
      if (y >= GY - PH) {
        y = GY - PH;
        vy = 0;
      }
      const speed = Math.min(11, 5 + cleared * 0.15);
      dist += speed * k;
      spawn -= k;
      if (spawn <= 0) {
        obs.push({ x: W + 20, w: 20 + rand(16), h: 26 + rand(30), p: false, hit: false });
        spawn = (60 + rand(60)) * (5 / speed) + 30;
      }
      obs.forEach(o => { o.x -= speed * k; });
      obs = obs.filter(o => o.x > -60);
      if (inv > 0) inv -= k;

      for (const o of obs) {
        if (!o.p && o.x + o.w < PX) {
          o.p = true;
          cleared++;
          api.add(10);
          api.info('Obstáculos: ' + cleared);
          if (cleared % 5 === 0) {
            checkpoint();
            return;
          }
        }
        if (inv <= 0 && !o.hit && PX + PW - 6 > o.x && PX + 6 < o.x + o.w && y + PH > GY - o.h) {
          o.hit = true;
          inv = 70;
          if (api.loseLife() <= 0) return;
        }
      }
    }

    function draw() {
      g.fillStyle = '#16163F';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2B2B6B';
      g.fillRect(0, GY, W, H - GY);
      g.fillStyle = 'rgba(255,255,255,.18)';
      for (let x = -(dist % 60); x < W; x += 60) g.fillRect(x, GY + 14, 30, 4);
      g.fillStyle = '#FF8FA0';
      obs.forEach(o => g.fillRect(o.x, GY - o.h, o.w, o.h));
      if (inv <= 0 || Math.floor(inv / 6) % 2 === 0) {
        g.font = '38px serif';
        g.textAlign = 'left';
        g.textBaseline = 'alphabetic';
        g.fillStyle = '#fff';
        g.fillText('🏃', PX - 4, y + PH - 2);
      }
      if (!started) {
        g.fillStyle = 'rgba(0,0,0,.6)';
        g.fillRect(130, 80, 380, 56);
        g.fillStyle = '#fff';
        g.font = 'bold 18px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('Espaço ou toque para pular', W / 2, 108);
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const k = Math.min(2, (now - last) / 16.667);
      last = now;
      if (started && !asking && !api.isOver()) update(k);
      draw();
    }

    api.onStop(() => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    });
    api.info('Obstáculos: 0');
    raf = requestAnimationFrame(frame);
  }

  Nivel.gameImpls.runner = runner;
})();
