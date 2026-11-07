(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { $, $$, shuffle } = Nivel;

  /* ---------- Jogo 6: Forca ---------- */
  function forca(api) {
    const WORDS = [
      'RESPEITO','AMIZADE','EMPATIA','FUTURO','ESTUDO','SONHO','ESCOLA',
      'CIDADANIA','DIALOGO','POUPANCA','ORCAMENTO','COMPROMISSO','LIDERANCA',
      'CORAGEM','HONESTIDADE','SOLIDARIEDADE','PROFISSAO','EQUIPE','DIVERSIDADE',
      'SAUDE','PACIENCIA','GENTILEZA','OBJETIVO','TALENTO','CONFIANCA',
      'ESPERANCA','CRIATIVIDADE','DISCIPLINA','CONHECIMENTO','AUTONOMIA'
    ];
    const words = shuffle(WORDS).slice(0, 5);
    let wi = 0, guessed = new Set(), asking = false;

    const wrap = document.createElement('div');
    wrap.className = 'forca';
    wrap.innerHTML =
      '<svg class="gallows" viewBox="0 0 120 140" role="img" aria-label="Forca"></svg>' +
      '<div class="fw-word" aria-live="polite"></div>' +
      '<div class="fw-keys"></div>';
    api.stage.appendChild(wrap);

    const svg = $('.gallows', wrap), wordEl = $('.fw-word', wrap), keys = $('.fw-keys', wrap);
    keys.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => `<button data-k="${c}">${c}</button>`).join('');

    const PARTS = [
      '<circle cx="80" cy="42" r="10"/>',
      '<line x1="80" y1="52" x2="80" y2="88"/>',
      '<line x1="80" y1="60" x2="64" y2="76"/>',
      '<line x1="80" y1="60" x2="96" y2="76"/>',
      '<line x1="80" y1="88" x2="66" y2="112"/>',
      '<line x1="80" y1="88" x2="94" y2="112"/>'
    ];

    function render() {
      const n = Math.max(0, 6 - api.lives);
      svg.innerHTML = `<g stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"><line x1="20" y1="130" x2="100" y2="130"/><line x1="40" y1="130" x2="40" y2="14"/><line x1="40" y1="14" x2="80" y2="14"/><line x1="80" y1="14" x2="80" y2="32"/>${PARTS.slice(0, n).join('')}</g>`;
      wordEl.textContent = [...words[wi]].map(c => (guessed.has(c) ? c : '_')).join(' ');
      $$('button', keys).forEach(b => { b.disabled = asking || guessed.has(b.dataset.k); });
      api.info(`Palavra ${wi + 1} de 5`);
    }

    async function guess(ch) {
      if (asking || api.isOver() || guessed.has(ch)) return;
      guessed.add(ch);
      if (words[wi].includes(ch)) {
        render();
        if ([...words[wi]].every(c => guessed.has(c))) {
          api.add(100 + api.lives * 20);
          if (wi >= words.length - 1) {
            api.end('Todas as palavras!');
            return;
          }
          wi++;
          guessed = new Set();
          render();
        }
        return;
      }
      asking = true;
      render();
      const ok = await api.ask({ tag: `A letra ${ch} não está na palavra. Responda para se salvar!` });
      if (api.isOver()) return;
      if (ok) api.add(20);
      else if (api.loseLife() <= 0) return;
      asking = false;
      render();
    }

    keys.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) guess(b.dataset.k);
    });

    const onKey = e => {
      if (asking || api.isOver() || e.ctrlKey || e.metaKey || e.altKey) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch)) guess(ch);
    };
    document.addEventListener('keydown', onKey);
    api.onStop(() => document.removeEventListener('keydown', onKey));
    render();
  }

  Nivel.gameImpls.forca = forca;
})();
