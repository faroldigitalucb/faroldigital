(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, $$, esc, ssSet, toast, avatarHtml,
    AVATARS, AV_COLORS, AV_NAMES, Store, ui, statsCache, newSalt, hashPw, reportHtml
  } = Nivel;

  /* =====================================================================
     View: Perfil do Usuário e Alteração de Senha
     ===================================================================== */
  function renderProfile() {
    const me = Nivel.me;
    ui.pf = { avatar: me.avatar || '', color: me.color || 'lav' };
    const v = $('#view-profile');
    v.innerHTML = `<div class="u-wrap">
      <div class="panel"><h2>Meu perfil</h2>
        <div class="pf-head" id="pf-prev"></div>
        <form id="pf-form" class="pf-form" novalidate>
          <label class="fld">Nome de exibição<input class="inp" name="name" value="${esc(me.name)}" maxlength="40" autocomplete="name"></label>
          <div class="fld"><span>Avatar</span><div class="av-grid">${AVATARS.map(a => `<button type="button" class="av-opt" data-av="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div></div>
          <div class="fld"><span>Cor do avatar</span><div class="sw-row">${Object.keys(AV_COLORS).map(k => `<button type="button" class="sw" data-col="${k}" style="--c:${AV_COLORS[k]}" aria-label="Cor ${AV_NAMES[k]}"></button>`).join('')}</div></div>
          <div class="err" id="pf-err" role="alert"></div>
          <div class="row"><button class="btn btn-primary" type="submit">Salvar perfil</button></div>
        </form>
      </div>
      <div class="panel"><h2>Trocar senha</h2>
        <form id="pw-form" class="pf-form" novalidate>
          <label class="fld">Senha atual<input class="inp" type="password" name="cur" autocomplete="current-password"></label>
          <label class="fld">Nova senha (mínimo 6 caracteres)<input class="inp" type="password" name="nw" autocomplete="new-password"></label>
          <label class="fld">Repita a nova senha<input class="inp" type="password" name="rp" autocomplete="new-password"></label>
          <div class="err" id="pw-err" role="alert"></div>
          <div class="row"><button class="btn btn-primary" type="submit">Trocar senha</button></div>
        </form>
      </div>
      ${me.role === 'student' ? '<div class="panel"><h2>Meu desempenho</h2><div id="pf-report"><p class="note">Carregando…</p></div></div>' : ''}
    </div>`;

    paintPf();
    if (me.role === 'student') {
      Store.get('stats/' + me.username)
        .then(s => {
          const el = $('#pf-report');
          if (el) el.innerHTML = reportHtml(me, s);
        })
        .catch(() => {
          const el = $('#pf-report');
          if (el) el.innerHTML = '<p class="note">Não foi possível carregar.</p>';
        });
    }
  }

  function paintPf() {
    const me = Nivel.me;
    const inp = $('#pf-form [name=name]');
    const name = (inp && inp.value.trim()) || me.name;
    $('#pf-prev').innerHTML = `${avatarHtml({ avatar: ui.pf.avatar, color: ui.pf.color, name }, 'lg')}<div><strong>${esc(name)}</strong><span class="note" style="margin:0">${me.master ? 'Professor master' : me.role === 'teacher' ? 'Professor' : 'Aluno'}. Usuário: ${esc(me.username)}</span></div>`;
    $$('#view-profile .av-opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.av === ui.pf.avatar)));
    $$('#view-profile .sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.col === ui.pf.color)));
  }

  const pv = $('#view-profile');
  pv.addEventListener('click', e => {
    const a = e.target.closest('.av-opt'), c = e.target.closest('.sw');
    if (a) {
      ui.pf.avatar = ui.pf.avatar === a.dataset.av ? '' : a.dataset.av;
      paintPf();
    }
    if (c) {
      ui.pf.color = c.dataset.col;
      paintPf();
    }
  });

  pv.addEventListener('input', e => {
    if (e.target.name === 'name') paintPf();
  });

  pv.addEventListener('submit', async e => {
    e.preventDefault();
    const me = Nivel.me;
    const f = e.target.elements;
    if (e.target.id === 'pf-form') {
      const err = $('#pf-err'), name = f.name.value.trim();
      if (name.length < 2) {
        err.textContent = 'Escreva um nome com pelo menos 2 letras.';
        return;
      }
      err.textContent = '';
      try {
        const rec = await Store.get('users/' + me.username);
        if (!rec) throw new Error('nf');
        await Store.set('users/' + me.username, { ...rec, name, avatar: ui.pf.avatar, color: ui.pf.color });
        Object.assign(me, { name, avatar: ui.pf.avatar, color: ui.pf.color });
        Nivel.buildChrome();
        Store.update('stats/' + me.username, { name, avatar: ui.pf.avatar, color: ui.pf.color }).catch(() => {});
        statsCache.at = 0;
        toast('Perfil salvo.');
      } catch (ex) {
        err.textContent = 'Não foi possível salvar. Tente de novo.';
      }
    } else if (e.target.id === 'pw-form') {
      const err = $('#pw-err'), btn = $('button[type=submit]', e.target);
      if (!(window.crypto && crypto.subtle)) {
        err.textContent = 'Este navegador não permite trocar a senha com segurança.';
        return;
      }
      if (f.nw.value.length < 6) {
        err.textContent = 'A nova senha precisa ter pelo menos 6 caracteres.';
        return;
      }
      if (f.nw.value !== f.rp.value) {
        err.textContent = 'As duas senhas novas não são iguais.';
        return;
      }
      err.textContent = '';
      btn.disabled = true;
      try {
        const rec = await Store.get('users/' + me.username);
        if (!rec || (await hashPw(f.cur.value, rec.salt)) !== rec.hash) {
          err.textContent = 'A senha atual está incorreta.';
          return;
        }
        const salt = newSalt(), hash = await hashPw(f.nw.value, salt);
        await Store.set('users/' + me.username, { ...rec, salt, hash, pwChangedAt: Date.now() });
        ssSet('nivel-session', JSON.stringify({ u: me.username, h: hash }));
        e.target.reset();
        toast('Senha alterada.');
      } catch (ex) {
        err.textContent = 'Não foi possível trocar a senha. Tente de novo.';
      } finally {
        btn.disabled = false;
      }
    }
  });

  Object.assign(Nivel, {
    renderProfile,
    paintPf
  });
})();
