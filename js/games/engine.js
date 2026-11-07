(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, plural, toast, lv, fmtClock,
    Store, st, Live, activeBank, recordAttempt, renderQuestion, makeDeck, gameImpls
  } = Nivel;

  /* =====================================================================
     Catálogo de Jogos e Executor de Partidas
     ===================================================================== */
  const GAMES = [
    { id: 'quiz',     name: 'Quiz Relâmpago',        emoji: '⚡', color: 'var(--yellow)', lives: 3, start: gameImpls.quiz,     desc: 'Perguntas rápidas de 15 segundos. Quem acerta em sequência ganha bônus.' },
    { id: 'memory',   name: 'Memória dos Pares',     emoji: '🃏', color: 'var(--mint)',   lives: 5, start: gameImpls.memory,   desc: 'Achou um par? Responda a pergunta para ficar com ele.' },
    { id: 'snake',    name: 'Cobrinha Curiosa',      emoji: '🐍', color: 'var(--coral)',  lives: 3, start: gameImpls.snake,    desc: 'Cada maçã vira uma pergunta. Acertou, você cresce e ganha pontos.' },
    { id: 'balloons', name: 'Estoura Balões',        emoji: '🎈', color: 'var(--sky)',    lives: 0, start: gameImpls.balloons, desc: 'Estoure balões, fuja das bombas e responda a cada 6 estouros.' },
    { id: 'runner',   name: 'Corrida de Obstáculos', emoji: '🏃', color: 'var(--lav)',    lives: 3, start: gameImpls.runner,   desc: 'Pule os obstáculos. A cada 5 superados, um checkpoint com pergunta.' },
    { id: 'forca',    name: 'Forca',                 emoji: '🔤', color: '#FF9F5E',       lives: 6, start: gameImpls.forca,    desc: 'Descubra as palavras. Errou a letra? Responda uma pergunta para se salvar.' },
    { id: 'naval',    name: 'Batalha Naval',         emoji: '🚢', color: 'var(--sky)',    lives: 3, start: gameImpls.naval,    desc: 'Só atira quem acerta a pergunta. Afunde toda a frota inimiga.' },
    { id: 'trilha',   name: 'Caça ao Tesouro',       emoji: '🗺️', color: 'var(--mint)',   lives: 3, start: gameImpls.trilha,   desc: 'Role o dado e avance pela trilha. Casas com ❓ escondem perguntas.' },
    { id: 'torre',    name: 'Defesa da Torre',       emoji: '🏰', color: 'var(--coral)',  lives: 3, start: gameImpls.torre,    desc: 'Derrube os invasores. Ficou sem munição? Responda para recarregar.' },
    { id: 'roleta',   name: 'Roleta da Sorte',       emoji: '🎡', color: 'var(--yellow)', lives: 4, start: gameImpls.roleta,   desc: 'Gire e torça. As casas de pergunta valem até 3 vezes mais.' }
  ];

  const modal = $('#modal');

  function setHud(S) {
    if (S !== Nivel.G) return;
    $('#hud-score').textContent = S.score;
    $('#hud-mult').textContent = S.mult > 1 ? '(×' + String(S.mult).replace('.', ',') + ')' : '';
    const L = $('#hud-lives');
    if (S.g.lives > 0) {
      L.hidden = false;
      L.textContent = '♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, S.g.lives - S.lives));
      L.setAttribute('aria-label', plural(Math.max(0, S.lives), 'vida', 'vidas'));
    } else {
      L.hidden = true;
    }
    $('#hud-info').textContent = S.info || '';
  }

  /* Registra a partida (estatísticas, recorde e, na sala ao vivo, a pontuação). Só uma vez por partida. */
  function finalizeAttempt(S) {
    if (S.recorded) return;
    S.recorded = true;
    if (!S.live && S.score > (st.best[S.g.id] || 0)) st.best[S.g.id] = S.score;
    if (!S.asked && !S.score) return;
    recordAttempt({
      game: S.g.id,
      mode: S.live ? 'sala' : 'solo',
      bank: S.meta,
      score: S.score,
      asked: S.asked,
      right: S.right,
      log: S.log
    });
    if (S.live) livePush(S, true);
  }

  /* Envia a melhor pontuação do aluno para a sala (com intervalo, para economizar gravações). */
  function livePush(S, flush) {
    const L = S.live;
    if (!L) return;
    if (S.score >= (Live.myBest || 0)) {
      Live.myBest = S.score;
      Live.myAsked = S.asked;
      Live.myRight = S.right;
    }
    const send = async () => {
      L.timer = null;
      try {
        await Store.update(`rooms/${L.code}/players/${Nivel.me.username}`, {
          gscore: Live.myBest || 0,
          gasked: Live.myAsked || 0,
          gright: Live.myRight || 0
        });
      } catch (e) {}
    };
    if (flush) {
      clearTimeout(L.timer);
      send();
    } else if (!L.timer) {
      L.timer = setTimeout(send, 4000);
    }
  }

  function stopGame() {
    if (!Nivel.G) return;
    const S = Nivel.G;
    S.stopped = true;
    if (!S.over) finalizeAttempt(S);
    S.cleanups.forEach(f => { try { f(); } catch (e) {} });
    S.cleanups = [];
    if (S.abortQ) S.abortQ();
    modal.hidden = true;
    $('#stage').innerHTML = '';
    $('#hud-clock').textContent = '';
    Nivel.G = null;
  }

  function launch(id, opts = {}) {
    const g = GAMES.find(x => x.id === id);
    if (!g) return;
    const live = opts.live || null;
    let questions, meta;

    if (live) {
      questions = live.questions;
      meta = live.bank;
    } else {
      const b = activeBank();
      if (!b || b.questions.length < 4) {
        toast('Este questionário precisa de pelo menos 4 perguntas para os jogos.');
        return;
      }
      questions = b.questions;
      meta = { id: b.id, name: b.name, theme: b.theme || '', level: b.level || 'medio' };
    }
    if (!questions || !questions.length) return;

    stopGame();
    Nivel.go('game');
    const stage = $('#stage');
    stage.innerHTML = '';
    $('#hud-exit').dataset.go = live ? 'live' : 'home';
    $('#hud-exit').textContent = live ? 'Voltar à sala' : 'Sair do jogo';

    const S = {
      g,
      deck: makeDeck({ questions }),
      bankSize: questions.length,
      mult: live ? 1 : lv(meta.level).mult,
      score: 0,
      lives: g.lives,
      info: '',
      over: false,
      stopped: false,
      asked: 0,
      right: 0,
      cleanups: [],
      abortQ: null,
      log: [],
      meta,
      live,
      recorded: false
    };
    Nivel.G = S;
    $('#hud-title').textContent = g.name;
    setHud(S);

    const api = {
      stage,
      get lives() { return S.lives; },
      get bankSize() { return S.bankSize; },
      get mult() { return S.mult; },
      isOver: () => S.over || S.stopped,
      add(n) {
        S.score = Math.max(0, S.score + Math.round(n * S.mult));
        setHud(S);
        if (S.live) livePush(S);
      },
      info(t) {
        S.info = t;
        setHud(S);
      },
      onStop(fn) {
        S.cleanups.push(fn);
      },
      loseLife() {
        S.lives--;
        setHud(S);
        if (S.lives <= 0) api.end('Acabaram as vidas.');
        return S.lives;
      },
      ask(opts = {}) {
        return new Promise(resolve => {
          if (api.isOver()) return;
          const q = S.deck();
          let box;
          if (opts.inline) {
            box = $('.q-card.inline', stage);
            if (!box) {
              box = document.createElement('div');
              box.className = 'q-card inline';
              stage.prepend(box);
            }
          } else {
            box = $('#modal-body');
            modal.hidden = false;
          }
          S.abortQ = renderQuestion(q, box, { seconds: opts.seconds || 20, tag: opts.tag || 'Pergunta' }, correct => {
            S.abortQ = null;
            if (!opts.inline) modal.hidden = true;
            S.asked++;
            if (correct) S.right++;
            if (S.log.length < 300) S.log.push({ q: q.text, ok: correct });
            resolve(correct);
          });
        });
      },
      end(msg) {
        if (S.over || S.stopped) return;
        S.over = true;
        S.cleanups.forEach(f => { try { f(); } catch (e) {} });
        S.cleanups = [];
        if (S.abortQ) {
          S.abortQ();
          S.abortQ = null;
        }
        modal.hidden = true;
        const prev = st.best[g.id] || 0;
        const rec = !S.live && S.score > prev && S.score > 0;
        finalizeAttempt(S);
        const left = S.live ? S.live.endAt - Date.now() : 0;
        const btns = S.live
          ? (left > 8000 ? '<button class="btn btn-primary" data-again>Jogar de novo</button>' : '') + '<button class="btn" data-go="live">Ver a sala</button>'
          : '<button class="btn btn-primary" data-again>Jogar de novo</button><button class="btn" data-go="home">Escolher outro jogo</button>';

        const ov = document.createElement('div');
        ov.className = 'end';
        ov.innerHTML = `<h2>${esc(msg)}</h2><p class="end-score">${S.score}<small> pontos</small></p>
          <p>${S.right} de ${S.asked} perguntas respondidas corretamente.${rec ? ' <strong>Novo recorde!</strong>' : ''}</p>
          ${S.live ? `<p class="note" style="margin:0">Sua melhor pontuação na sala: ${Math.max(Live.myBest || 0, S.score)}. O placar final aparece quando o professor encerrar.</p>` : ''}
          <div class="row" style="justify-content:center">${btns}</div>`;
        const again = $('[data-again]', ov);
        if (again) again.onclick = () => launch(g.id, S.live ? { live: { ...S.live, countdown: false, timer: null } } : {});
        stage.appendChild(ov);
        $('button', ov).focus();
      }
    };

    if (live) {
      $('#hud-clock').textContent = fmtClock(live.endAt - Date.now());
      const clk = setInterval(() => {
        const left = live.endAt - Date.now();
        $('#hud-clock').textContent = fmtClock(left);
        if (left <= 0) api.end('O tempo da sala acabou!');
      }, 500);
      S.cleanups.push(() => clearInterval(clk));
    } else {
      $('#hud-clock').textContent = '';
    }

    const begin = () => { if (!api.isOver()) g.start(api); };
    if (live && live.countdown) {
      let n = 3;
      const ov = document.createElement('div');
      ov.className = 'end';
      ov.innerHTML = `<p class="end-score">${n}</p><p>Prepare-se!</p>`;
      stage.appendChild(ov);
      const iv = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(iv);
          ov.remove();
          begin();
        } else {
          $('.end-score', ov).textContent = n;
        }
      }, 1000);
      S.cleanups.push(() => clearInterval(iv));
    } else {
      begin();
    }
  }

  Object.assign(Nivel, {
    GAMES,
    setHud,
    finalizeAttempt,
    livePush,
    stopGame,
    launch
  });
})();
