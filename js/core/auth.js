(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { rand } = Nivel;

  /* =====================================================================
     Senhas (PBKDF2 com sal por usuário) e Geração de Usuários
     ===================================================================== */
  const b64 = u => btoa(String.fromCharCode(...u));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

  async function hashPw(pw, salt) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pw),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: 100000 },
      key,
      256
    );
    return b64(new Uint8Array(bits));
  }

  async function makeUser({ name, username, password, role, master }) {
    const salt = newSalt();
    return {
      username,
      name,
      role,
      master: !!master,
      salt,
      hash: await hashPw(password, salt),
      createdAt: Date.now(),
      createdBy: Nivel.me ? Nivel.me.username : username
    };
  }

  const genPw = () => {
    const c = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 6 }, () => c[rand(c.length)]).join('');
  };

  const slug = s =>
    s.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  function usernameFor(name, taken) {
    const t = slug(name);
    let base = t.length > 1 ? t[0] + '.' + t[t.length - 1] : (t[0] || 'aluno');
    while (base.length < 3) base += rand(10);
    base = base.slice(0, 26);
    let u = base, n = 2;
    while (taken.has(u)) u = base + n++;
    taken.add(u);
    return u;
  }

  Object.assign(Nivel, {
    b64,
    unb64,
    newSalt,
    hashPw,
    makeUser,
    genPw,
    slug,
    usernameFor
  });
})();
