(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { LEVELS, AV_COLORS } = Nivel;

  /* =====================================================================
     Utilidades gerais, DOM, Formatação e Armazenamento Local
     ===================================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const uid = () => Math.random().toString(36).slice(2, 9);
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
  const byScore = (a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), 'pt-BR');

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  const ssDel = k => { try { sessionStorage.removeItem(k); } catch (e) {} };

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 3600);
  }

  function armed(btn, label, fn) {
    if (btn.dataset.armed) {
      fn();
      return;
    }
    btn.dataset.armed = '1';
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => {
      if (btn.isConnected) {
        delete btn.dataset.armed;
        btn.textContent = old;
      }
    }, 3000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado.');
      return true;
    } catch (e) {}
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      t.remove();
      toast(ok ? 'Copiado.' : 'Não consegui copiar. Selecione o texto e copie manualmente.');
      return ok;
    } catch (e) {
      toast('Não consegui copiar. Selecione o texto e copie manualmente.');
      return false;
    }
  }

  const lv = k => LEVELS[k] || LEVELS.medio;
  const levelBadge = k => `<span class="badge b-${LEVELS[k] ? k : 'medio'}">${lv(k).label}</span>`;

  function avatarHtml(u, sz) {
    const c = AV_COLORS[u && u.color] || 'var(--lav)';
    const ch = (u && u.avatar) || String((u && u.name) || '?').trim().charAt(0).toUpperCase() || '?';
    return `<span class="avatar ${sz || ''}" style="--c:${c}" aria-hidden="true">${esc(ch)}</span>`;
  }

  const pad2 = n => String(n).padStart(2, '0');

  /* A semana começa na segunda-feira. A chave é a data dessa segunda (AAAA-MM-DD). */
  function weekKey(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
  }

  function prevWeekKey(k, n = 1) {
    const [y, m, d] = k.split('-').map(Number);
    return weekKey(new Date(y, m - 1, d - 7 * n));
  }

  const weekLabel = k => {
    const [, m, d] = k.split('-');
    return `${d}/${m}`;
  };

  const ago = ts => {
    if (!ts) return 'nunca';
    const d = Math.floor((Date.now() - ts) / 864e5);
    return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
  };

  const fmtDT = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtClock = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  const fmtCode = c => String(c).replace(/(\d{3})(\d{3})/, '$1 $2');

  Object.assign(Nivel, {
    $, $$, esc, uid, rand, shuffle, plural, clone, sleep, byName, byScore,
    lsGet, lsSet, lsDel, ssGet, ssSet, ssDel,
    toast, armed, copyText, lv, levelBadge, avatarHtml,
    pad2, weekKey, prevWeekKey, weekLabel, ago, fmtDT, fmtClock, fmtCode
  });
})();
