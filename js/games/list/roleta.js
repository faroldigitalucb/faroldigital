(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { $, rand, mkWait } = Nivel;

  /* ---------- Jogo 10: Roleta da Sorte ---------- */
  function roleta(api) {
    const SEG = [
      { t: '+50', k: 'pts', v: 50, c: '#5EEAC0' }, { t: '?', k: 'q', v: 1, c: '#FFD23F' },
      { t: '+100', k: 'pts', v: 100, c: '#7FD1FF' }, { t: '?×2', k: 'q', v: 2, c: '#B9B6FF' },
      { t: '💣', k: 'bomb', c: '#FF8FA0' }, { t: '?', k: 'q', v: 1, c: '#FFD23F' },
      { t: '+150', k: 'pts', v: 150, c: '#5EEAC0' }, { t: '?×3', k: 'q', v: 3, c: '#B9B6FF' }
    ];
    const MAX = 10;
    let spins = 0, total = 0, busy = false;
    const wait = mkWait(api);

    const pt = (deg, r) => {
      const a = deg * Math.PI / 180;
      return [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)];
    };

    const wedges = SEG.map((s, i) => {
      const [x0, y0] = pt(i * 45 - 22.5, 100), [x1, y1] = pt(i * 45 + 22.5, 100);
      return `<path d="M0 0 L${x0} ${y0} A100 100 0 0 1 ${x1} ${y1} Z" fill="${s.c}" stroke="#16163F" stroke-width="2.5"/><text transform="rotate(${i * 45}) translate(0,-66)" text-anchor="middle" dominant-baseline="middle" font-size="17" font-weight="800" fill="#16163F">${s.t}</text>`;
    }).join('');

    const wrap = document.createElement('div');
    wrap.className = 'wheel-wrap';
    wrap.innerHTML = `<svg viewBox="-115 -120 230 235" role="img" aria-label="Roleta da sorte"><g class="wheel" style="transform-box:fill-box;transform-origin:center;transition:transform 3.2s cubic-bezier(.17,.67,.2,1)">${wedges}<circle r="10" fill="#16163F"/></g><polygon points="-11,-118 11,-118 0,-94" fill="#16163F" stroke="#fff" stroke-width="2"/></svg><p class="tr-msg" aria-live="polite">Gire a roleta!</p><button class="btn btn-primary" data-spin>Girar</button>`;
    api.stage.appendChild(wrap);

    const wheel = $('.wheel', wrap), msg = $('.tr-msg', wrap), btn = $('[data-spin]', wrap);
    const info = () => api.info(`Giro ${Math.min(spins + 1, MAX)} de ${MAX}`);

    btn.addEventListener('click', async () => {
      if (busy || api.isOver()) return;
      busy = true;
      btn.disabled = true;
      spins++;
      const idx = rand(SEG.length), target = (360 - idx * 45) % 360;
      total += 360 * 5 + ((target - (total % 360)) + 360) % 360;
      wheel.style.transform = `rotate(${total}deg)`;
      msg.textContent = 'Girando…';
      await wait(3400);

      const s = SEG[idx];
      if (s.k === 'pts') {
        api.add(s.v);
        msg.textContent = `+${s.v} pontos!`;
      } else if (s.k === 'bomb') {
        msg.textContent = 'Bomba! Você perdeu uma vida.';
        if (api.loseLife() <= 0) return;
      } else {
        msg.textContent = `Pergunta valendo ${s.v}×!`;
        const ok = await api.ask({ tag: `Pergunta valendo ${s.v}×` });
        if (api.isOver()) return;
        if (ok) {
          api.add(100 * s.v);
          msg.textContent = `Acertou! +${100 * s.v}`;
        } else {
          msg.textContent = 'Errou. Você perdeu uma vida.';
          if (api.loseLife() <= 0) return;
        }
      }
      if (spins >= MAX) {
        api.end('Fim das rodadas!');
        return;
      }
      busy = false;
      btn.disabled = false;
      info();
    });

    info();
  }

  Nivel.gameImpls.roleta = roleta;
})();
