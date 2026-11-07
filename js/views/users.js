(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, plural, toast, armed, copyText, avatarHtml,
    USER_RE, Store, cache, ui, newSalt, hashPw, makeUser, genPw, usernameFor
  } = Nivel;

  /* =====================================================================
     View: Usuários (Somente Professor Master)
     ===================================================================== */
  function renderUsersShell() {
    $('#view-users').innerHTML = `<div class="u-wrap">
      <div class="panel">
        <h2>Criar usuário</h2>
        <form id="u-form" novalidate>
          <div class="u-grid">
            <label class="fld">Nome completo<input class="inp" name="name" autocomplete="off"></label>
            <label class="fld">Usuário<input class="inp" name="username" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="ex.: ana.lima"></label>
            <label class="fld">Senha<input class="inp" name="password" autocomplete="off" placeholder="em branco = gerar"></label>
            <label class="fld">Tipo<select class="inp" name="role"><option value="student">Aluno</option><option value="teacher">Professor</option></select></label>
          </div>
          <div class="err" id="u-err" role="alert"></div>
          <button class="btn btn-primary" type="submit">Criar usuário</button>
        </form>
      </div>
      <div class="panel">
        <h2>Criar vários alunos de uma vez</h2>
        <p class="note" style="margin-top:0">Escreva um nome por linha. O sistema cria o usuário (ex.: ana.lima) e uma senha temporária para cada aluno.</p>
        <textarea class="inp" id="bulk-names" placeholder="Ana Lima&#10;Bruno Costa&#10;Carla Mendes" style="min-height:8rem"></textarea>
        <div class="row" style="margin-top:.7rem"><button class="btn btn-primary" data-uact="bulk">Criar alunos</button></div>
      </div>
      <div id="u-result"></div>
      <div class="panel"><h2>Usuários cadastrados</h2><div class="scroll" id="u-table"></div></div>
    </div>`;
    renderCreds();
    renderUsersTable();
  }

  function renderUsersTable() {
    const t = $('#u-table');
    if (!t) return;
    t.innerHTML = `<table class="utable"><thead><tr><th>Nome</th><th>Usuário</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>
      ${cache.users.map(u => `<tr>
        <td><span class="name-cell">${avatarHtml(u, 'sm')}${esc(u.name)}</span></td><td>${esc(u.username)}</td>
        <td><span class="badge ${u.role === 'student' ? 'b-student' : 'b-teacher'}">${u.master ? 'Professor master' : u.role === 'teacher' ? 'Professor' : 'Aluno'}</span></td>
        <td>${u.master ? '' : `<div class="row"><button class="btn btn-sm" data-uact="reset" data-u="${esc(u.username)}">Nova senha</button><button class="btn btn-sm btn-danger" data-uact="del" data-u="${esc(u.username)}">Excluir</button></div>`}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  function renderCreds() {
    const box = $('#u-result');
    if (!box) return;
    if (!ui.creds) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="creds"><strong>${esc(ui.creds.title)}</strong>
      <table><thead><tr><th>Nome</th><th>Usuário</th><th>Senha</th></tr></thead><tbody>
      ${ui.creds.list.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.username)}</td><td>${esc(c.password)}</td></tr>`).join('')}</tbody></table>
      <p style="margin:.2rem 0 .8rem">Anote agora. As senhas não ficam guardadas e não dá para vê-las depois (só gerar uma nova).</p>
      <div class="row"><button class="btn btn-sm" data-uact="copy-creds">Copiar lista</button><button class="btn btn-sm" data-uact="hide-creds">Fechar</button></div></div>`;
  }

  const uv = $('#view-users');
  uv.addEventListener('submit', async e => {
    if (e.target.id !== 'u-form') return;
    e.preventDefault();
    const f = e.target.elements, err = $('#u-err'), btn = $('button[type=submit]', e.target);
    const name = f.name.value.trim(), u = f.username.value.trim().toLowerCase();
    let pw = f.password.value;
    if (name.length < 2) {
      err.textContent = 'Escreva o nome completo.';
      return;
    }
    if (!USER_RE.test(u)) {
      err.textContent = 'Usuário: 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.';
      return;
    }
    if (cache.users.some(x => x.username === u)) {
      err.textContent = 'Esse usuário já existe. Escolha outro.';
      return;
    }
    if (!pw) pw = genPw();
    else if (pw.length < 6) {
      err.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
      return;
    }
    err.textContent = '';
    btn.disabled = true;
    try {
      await Store.set('users/' + u, await makeUser({ name, username: u, password: pw, role: f.role.value }));
      ui.creds = { title: 'Usuário criado', list: [{ name, username: u, password: pw }] };
      renderCreds();
      e.target.reset();
      toast('Usuário criado.');
    } catch (ex) {
      err.textContent = 'Não foi possível criar. Só quem edita esta página consegue criar usuários.';
    } finally {
      btn.disabled = false;
    }
  });

  uv.addEventListener('click', async e => {
    const a = e.target.closest('[data-uact]');
    if (!a) return;
    switch (a.dataset.uact) {
      case 'bulk': {
        const names = $('#bulk-names').value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!names.length) {
          toast('Escreva pelo menos um nome.');
          return;
        }
        const taken = new Set(cache.users.map(u => u.username));
        const list = [];
        a.disabled = true;
        toast('Criando alunos…');
        try {
          for (const name of names) {
            const username = usernameFor(name, taken);
            const password = genPw();
            await Store.set('users/' + username, await makeUser({ name, username, password, role: 'student' }));
            list.push({ name, username, password });
          }
          ui.creds = { title: `${plural(list.length, 'aluno criado', 'alunos criados')}`, list };
          renderCreds();
          $('#bulk-names').value = '';
          toast('Alunos criados.');
        } catch (ex) {
          if (list.length) {
            ui.creds = { title: 'Criação interrompida. Estes foram criados:', list };
            renderCreds();
          }
          toast('Não foi possível criar todos os alunos.');
        } finally {
          a.disabled = false;
        }
        break;
      }
      case 'reset': {
        const rec = cache.users.find(x => x.username === a.dataset.u);
        if (!rec) return;
        const pw = genPw(), salt = newSalt();
        try {
          await Store.set('users/' + rec.username, { ...rec, salt, hash: await hashPw(pw, salt), pwResetAt: Date.now() });
          ui.creds = { title: 'Nova senha gerada', list: [{ name: rec.name, username: rec.username, password: pw }] };
          renderCreds();
          toast('Senha redefinida.');
        } catch (ex) {
          toast('Não foi possível redefinir a senha.');
        }
        break;
      }
      case 'del':
        armed(a, 'Confirmar?', async () => {
          try {
            await Store.del('users/' + a.dataset.u);
            toast('Usuário excluído.');
          } catch (ex) {
            toast('Não foi possível excluir.');
          }
        });
        break;
      case 'copy-creds':
        copyText('Nome\tUsuário\tSenha\n' + ui.creds.list.map(c => `${c.name}\t${c.username}\t${c.password}`).join('\n'));
        break;
      case 'hide-creds':
        ui.creds = null;
        renderCreds();
        break;
    }
  });

  Object.assign(Nivel, {
    renderUsersShell,
    renderUsersTable,
    renderCreds
  });
})();
