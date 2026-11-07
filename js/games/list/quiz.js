(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});

  /* ---------- Jogo 1: Quiz Relâmpago ---------- */
  async function quiz(api) {
    const rounds = Math.min(10, api.bankSize);
    let streak = 0;
    for (let r = 1; r <= rounds && !api.isOver(); r++) {
      api.info(`Pergunta ${r} de ${rounds}. Sequência: ${streak}`);
      const ok = await api.ask({ inline: true, seconds: 15, tag: `Pergunta ${r} de ${rounds}` });
      if (api.isOver()) return;
      if (ok) {
        streak++;
        api.add(100 + (streak - 1) * 25);
      } else {
        streak = 0;
        api.loseLife();
      }
    }
    if (!api.isOver()) api.end('Rodada completa!');
  }

  Nivel.gameImpls.quiz = quiz;
})();
