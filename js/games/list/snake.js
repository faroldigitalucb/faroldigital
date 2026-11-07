(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { rand } = Nivel;

  /* ---------- Jogo 3: Cobrinha Curiosa ---------- */
  function snake(api) {
    const N = 20, C = 20, stage = api.stage;
    const cv = document.createElement('canvas');
    cv.width = cv.height = N * C;
    cv.className = 'snake-cv';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Tabuleiro da cobrinha');

    const pad = document.createElement('div');
    pad.className = 'dpad';
    pad.innerHTML =
      '<button data-d="up" aria-label="Para cima">▲</button>' +
      '<button data-d="left" aria-label="Para a esquerda">◀</button>' +
      '<button data-d="right" aria-label="Para a direita">▶</button>' +
      '<button data-d="down" aria-label="Para baixo">▼</button>';
    stage.append(cv, pad);

    const g = cv.getContext('2d');
    const V = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const KEYS = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    let s, dir, next, food, grow, timer, started, asking = false, speed = 150;

    function reset() {
      s = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = next = V.right;
      grow = 0;
      started = false;
      placeFood();
      draw();
    }

    function placeFood() {
      let f;
      do { f = { x: rand(N), y: rand(N) }; } while (s.some(p => p.x === f.x && p.y === f.y));
      food = f;
    }

    const run = () => {
      clearInterval(timer);
      timer = setInterval(tick, speed);
    };

    function steer(name) {
      if (asking || api.isOver()) return;
      const d = V[name];
      if (d.x === -dir.x && d.y === -dir.y) return;
      next = d;
      if (!started) {
        started = true;
        run();
      }
    }

    function tick() {
      if (api.isOver()) return;
      dir = next;
      const h = { x: (s[0].x + dir.x + N) % N, y: (s[0].y + dir.y + N) % N };
      if (s.some(p => p.x === h.x && p.y === h.y)) {
        clearInterval(timer);
        if (api.loseLife() > 0) reset();
        return;
      }
      s.unshift(h);
      if (h.x === food.x && h.y === food.y) {
        eat();
        return;
      }
      if (grow > 0) grow--;
      else s.pop();
      draw();
    }

    async function eat() {
      clearInterval(timer);
      asking = true;
      draw();
      const ok = await api.ask({ tag: 'Você pegou uma maçã!' });
      if (api.isOver()) return;
      if (ok) {
        api.add(100);
        grow += 2;
        speed = Math.max(70, speed - 6);
      } else {
        if (api.loseLife() <= 0) return;
        for (let i = 0; i < 2 && s.length > 3; i++) s.pop();
      }
      placeFood();
      asking = false;
      draw();
      timer = setTimeout(run, 700);
    }

    function draw() {
      g.fillStyle = '#16163F';
      g.fillRect(0, 0, N * C, N * C);
      g.fillStyle = 'rgba(255,255,255,.06)';
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          if ((x + y) % 2) g.fillRect(x * C, y * C, C, C);
        }
      }
      g.fillStyle = '#FF8FA0';
      g.beginPath();
      g.arc(food.x * C + C / 2, food.y * C + C / 2, C / 2 - 2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#16163F';
      g.font = 'bold 14px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', food.x * C + C / 2, food.y * C + C / 2 + 1);
      s.forEach((p, i) => {
        g.fillStyle = i === 0 ? '#FFD23F' : '#5EEAC0';
        g.fillRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2);
      });
      if (!started) {
        g.fillStyle = 'rgba(0,0,0,.6)';
        g.fillRect(40, 170, 320, 60);
        g.fillStyle = '#fff';
        g.font = 'bold 16px sans-serif';
        g.fillText('Use as setas ou deslize para começar', N * C / 2, N * C / 2);
      }
    }

    const onKey = e => {
      const k = KEYS[e.key.toLowerCase()];
      if (!k || asking) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      steer(k);
    };
    document.addEventListener('keydown', onKey);

    let sx = 0, sy = 0;
    cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    cv.addEventListener('pointerup', e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    pad.addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-d]');
      if (b) {
        e.preventDefault();
        steer(b.dataset.d);
      }
    });

    api.onStop(() => {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
    });
    api.info('Cada maçã é uma pergunta');
    reset();
  }

  Nivel.gameImpls.snake = snake;
})();
