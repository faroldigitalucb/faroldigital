(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { $, $$, esc, shuffle } = Nivel;

  /* =====================================================================
     Motor de Perguntas e Utilitários de Jogo
     ===================================================================== */
  function renderQuestion(q, box, opts, done) {
    const letters = ['A', 'B', 'C', 'D'];
    const order = shuffle(q.options.map((t, i) => ({ t, i })));
    box.innerHTML = `
      <div class="q-top"><span class="q-tag">${esc(opts.tag)}</span><span class="q-time" data-time></span></div>
      <div class="q-bar" aria-hidden="true"><i data-bar></i></div>
      <h2 class="q-text" id="q-title">${esc(q.text)}</h2>
      <div class="q-opts">${order.map((o, k) => `<button class="q-opt" data-i="${o.i}"><b>${letters[k]}</b><span>${esc(o.t)}</span></button>`).join('')}</div>
      <div class="q-feedback"></div>`;

    const btns = $$('.q-opt', box);
    const bar = $('[data-bar]', box);
    const timeEl = $('[data-time]', box);
    const fb = $('.q-feedback', box);
    const total = opts.seconds * 1000;
    const t0 = Date.now();
    let answered = false;

    const tick = setInterval(() => {
      const left = total - (Date.now() - t0);
      bar.style.width = Math.max(0, left / total * 100) + '%';
      bar.classList.toggle('low', left / total < .3);
      timeEl.textContent = Math.ceil(Math.max(0, left) / 1000) + ' s';
      if (left <= 0) finish(-1);
    }, 100);

    function onKey(e) {
      if (answered) return;
      const map = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
      const k = map[e.key.toLowerCase()];
      if (k !== undefined && btns[k]) {
        e.preventDefault();
        finish(+btns[k].dataset.i);
      }
    }
    document.addEventListener('keydown', onKey);

    const cleanup = () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
    };

    function finish(choice) {
      if (answered) return;
      answered = true;
      cleanup();
      const correct = choice === q.correct;
      btns.forEach(b => {
        b.disabled = true;
        const i = +b.dataset.i;
        if (i === q.correct) b.classList.add('is-right');
        else if (i === choice) b.classList.add('is-wrong');
      });
      const head = choice === -1 ? 'Tempo esgotado.' : correct ? 'Acertou!' : 'Não foi dessa vez.';
      fb.innerHTML = `<p class="${correct ? 'ok' : 'bad'}"><strong>${head}</strong> ${q.explanation ? esc(q.explanation) : ''}</p><button class="btn btn-primary" data-next>Continuar</button>`;
      const nx = $('[data-next]', fb);
      nx.focus();
      nx.onclick = () => done(correct);
    }

    btns.forEach(b => b.addEventListener('click', () => finish(+b.dataset.i)));
    btns[0] && btns[0].focus();
    return cleanup;
  }

  function makeDeck(bank) {
    let pool = [];
    return () => {
      if (!pool.length) pool = shuffle(bank.questions);
      return pool.pop();
    };
  }

  function mkWait(api) {
    const timers = [];
    api.onStop(() => timers.forEach(clearTimeout));
    return ms => new Promise(r => timers.push(setTimeout(r, ms)));
  }

  Object.assign(Nivel, {
    renderQuestion,
    makeDeck,
    mkWait
  });
})();
