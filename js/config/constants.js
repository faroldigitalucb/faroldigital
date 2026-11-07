(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});

  const LEVELS = {
    facil:   { label: 'Fácil',   mult: 1,   note: 'pontos ×1' },
    medio:   { label: 'Médio',   mult: 1.5, note: 'pontos ×1,5' },
    dificil: { label: 'Difícil', mult: 2,   note: 'pontos ×2' }
  };

  const AVATARS = [
    '🦊','🐼','🐯','🦁','🐸','🐙','🦄','🐧','🐬','🦉','🐢','🦖',
    '🚀','⚽','🎧','🎮','🌵','🍕','🎸','🌈','⭐','🔥','🎨','📚'
  ];

  const AV_COLORS = {
    yellow: 'var(--yellow)',
    mint:   'var(--mint)',
    coral:  'var(--coral)',
    lav:    'var(--lav)',
    sky:    'var(--sky)'
  };

  const AV_NAMES = {
    yellow: 'Amarelo',
    mint:   'Verde',
    coral:  'Rosa',
    lav:    'Lilás',
    sky:    'Azul'
  };

  const VIEWS = [
    'boot', 'login', 'home', 'game', 'teacher',
    'users', 'live', 'board', 'reports', 'profile'
  ];

  const USER_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

  const OC = ['var(--coral)', 'var(--sky)', 'var(--yellow)', 'var(--mint)'];
  const LT = ['A', 'B', 'C', 'D'];

  Object.assign(Nivel, {
    LEVELS,
    AVATARS,
    AV_COLORS,
    AV_NAMES,
    VIEWS,
    USER_RE,
    OC,
    LT
  });
})();
