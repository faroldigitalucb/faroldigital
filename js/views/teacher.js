(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, uid, plural, clone, byName, lsSet, toast, armed, copyText, levelBadge,
    LEVELS, Store, cache, st, ui, activeBank, canEditBank, selBank
  } = Nivel;

  /* =====================================================================
     View: Questionários (Professor)
     ===================================================================== */
  function editorBusy() {
    const a = document.activeElement, ed = $('#editor');
    return ui.formDirty || (ed && a && ed.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }

  function saveBank(b) {
    b.updatedAt = Date.now();
    return Store.set('banks/' + b.id, b).catch(() => toast('Não foi possível salvar. Verifique a conexão e tente de novo.'));
  }

  function renderBankList() {
    $('#bank-list').innerHTML = cache.banks.map(b => `
      <li><button class="bank-btn" data-bank="${b.id}" ${b.id === ui.sel ? 'aria-current="true"' : ''}>
        <span>${esc(b.name)}</span>
        <span class="meta">${levelBadge(b.level)}<small>${plural(b.questions.length, 'pergunta', 'perguntas')}</small></span>
        ${b.theme ? `<small>${esc(b.theme)}</small>` : ''}</button></li>`).join('') || '<li class="note">Nenhum questionário ainda.</li>';
  }

  function editorHtml(bank) {
    const can = canEditBank(bank), dis = can ? '' : 'disabled';
    const eq = ui.editing ? bank.questions.find(q => q.id === ui.editing) : null;
    const opt = i => (eq && eq.options[i] !== undefined ? eq.options[i] : '');
    const letters = ['A', 'B', 'C', 'D'];
    return `
    <div class="panel">
      ${can ? '' : `<div class="readonly-note">Este questionário é de ${esc(bank.ownerName || 'outro professor')}. Você pode ver e testar, mas para editar faça uma cópia.</div>`}
      <div class="ed-head">
        <label class="fld">Nome do questionário<input class="inp" id="bank-name" value="${esc(bank.name)}" ${dis}></label>
        <label class="fld">Tema<input class="inp" id="bank-theme" value="${esc(bank.theme || '')}" placeholder="Ex.: Educação financeira, Saúde emocional, Cidadania" ${dis}></label>
        <fieldset class="seg"><legend>Nível de dificuldade</legend>
          ${Object.entries(LEVELS).map(([k, v]) => `<label class="seg-i"><input type="radio" name="level" value="${k}" ${bank.level === k || (!LEVELS[bank.level] && k === 'medio') ? 'checked' : ''} ${dis}><span>${v.label}<small>${v.note}</small></span></label>`).join('')}
        </fieldset>
        <div class="row">
          <button class="btn btn-primary" data-act="play-bank">Testar nos jogos</button>
          <button class="btn" data-act="dup-bank">Duplicar</button>
          ${can ? '<button class="btn btn-danger" data-act="del-bank">Excluir questionário</button>' : ''}
        </div>
      </div>

      <h3 class="t-h" style="margin-top:0">Perguntas (${bank.questions.length})</h3>
      ${bank.questions.length ? `<ul class="qlist">${bank.questions.map(q => `
        <li class="qi">
          <div class="qi-text">${esc(q.text)}</div>
          <ul class="qi-opts">${q.options.map((o, i) => `<li class="${i === q.correct ? 'right' : ''}">${i === q.correct ? '✔ ' : ''}${esc(o)}</li>`).join('')}</ul>
          ${q.explanation ? `<p class="qi-expl">${esc(q.explanation)}</p>` : ''}
          ${can ? `<div class="row"><button class="btn btn-sm" data-act="edit-q" data-id="${q.id}">Editar</button><button class="btn btn-sm btn-danger" data-act="del-q" data-id="${q.id}">Excluir</button></div>` : ''}
        </li>`).join('')}</ul>` : `<p class="note">Este questionário ainda não tem perguntas. Os jogos pedem pelo menos 4.</p>`}

      ${can ? `
      <h3 class="t-h" id="form-title">${eq ? 'Editar pergunta' : 'Adicionar pergunta'}</h3>
      <form id="q-form" novalidate>
        <label class="fld" style="margin-bottom:.8rem">Enunciado<textarea class="inp" name="text" placeholder="Ex.: O que é uma reserva de emergência?">${esc(eq ? eq.text : '')}</textarea></label>
        <fieldset style="border:0;padding:0;margin:0 0 .8rem"><legend style="font-weight:700;margin-bottom:.4rem">Alternativas (marque a correta; mínimo de 2)</legend>
          ${[0, 1, 2, 3].map(i => `<div class="optrow">
            <label class="rad"><input type="radio" name="correct" value="${i}" ${eq && eq.correct === i ? 'checked' : ''}>Correta</label>
            <input class="inp" name="o${i}" placeholder="Alternativa ${letters[i]}" value="${esc(opt(i))}" aria-label="Alternativa ${letters[i]}">
          </div>`).join('')}
        </fieldset>
        <label class="fld">Explicação depois da resposta (opcional)<input class="inp" name="expl" value="${esc(eq ? eq.explanation || '' : '')}" placeholder="Ex.: Ela cobre gastos inesperados sem que você se endivide."></label>
        <div class="err" id="q-err" role="alert"></div>
        <div class="row"><button class="btn btn-primary" type="submit">${eq ? 'Salvar alterações' : 'Adicionar pergunta'}</button>${eq ? '<button class="btn" type="button" data-act="cancel-edit">Cancelar edição</button>' : ''}</div>
      </form>` : ''}

      <h3 class="t-h">Backup e compartilhamento</h3>
      <p class="note" style="margin-top:0">Gere o JSON para guardar ou enviar a outro professor. Para importar, cole um JSON aqui e clique em importar.</p>
      <textarea class="inp json-box" id="json-box" aria-label="JSON do questionário" spellcheck="false"></textarea>
      <div class="row" style="margin-top:.7rem">
        <button class="btn btn-sm" data-act="gen-json">Gerar JSON deste questionário</button>
        <button class="btn btn-sm" data-act="copy-json">Copiar</button>
        <button class="btn btn-sm" data-act="import-json">Importar como novo questionário</button>
      </div>
    </div>`;
  }

  function renderEditor() {
    const bank = selBank();
    ui.formDirty = false;
    $('#editor').innerHTML = bank
      ? editorHtml(bank)
      : `<div class="panel empty"><h2>Comece criando um questionário</h2><p>Depois adicione perguntas com 2 a 4 alternativas. Os jogos e as salas ao vivo vão sorteá-las.</p></div>`;
  }

  function renderTeacher() {
    if (!selBank()) ui.sel = (activeBank() || {}).id || null;
    renderBankList();
    renderEditor();
  }

  async function newBankDoc(name) {
    const b = {
      id: uid(),
      name,
      theme: '',
      level: 'medio',
      ownerId: Nivel.me.username,
      ownerName: Nivel.me.name,
      questions: [],
      updatedAt: Date.now()
    };
    cache.banks.push(b);
    cache.banks.sort(byName);
    await saveBank(b);
    return b;
  }

  async function importJson() {
    const box = $('#json-box');
    try {
      const d = JSON.parse(box.value);
      if (!d || !Array.isArray(d.questions) || !d.questions.length) throw new Error('vazio');
      const qs = d.questions.map(q => {
        if (
          typeof q.text !== 'string' ||
          !q.text.trim() ||
          !Array.isArray(q.options) ||
          q.options.length < 2 ||
          q.options.length > 4 ||
          q.options.some(o => typeof o !== 'string' || !o.trim()) ||
          !Number.isInteger(q.correct) ||
          q.correct < 0 ||
          q.correct >= q.options.length
        ) throw new Error('formato');
        return {
          id: uid(),
          text: q.text.trim(),
          options: q.options.map(o => o.trim()),
          correct: q.correct,
          explanation: typeof q.explanation === 'string' ? q.explanation : ''
        };
      });
      const b = await newBankDoc((typeof d.name === 'string' && d.name.trim()) || 'Questionário importado');
      b.questions = qs;
      b.theme = typeof d.theme === 'string' ? d.theme : '';
      b.level = LEVELS[d.level] ? d.level : 'medio';
      await saveBank(b);
      ui.sel = b.id;
      ui.editing = null;
      renderTeacher();
      toast(`Importado: ${plural(qs.length, 'pergunta', 'perguntas')}.`);
    } catch (e) {
      toast('Não consegui ler esse JSON. Confira se ele veio do botão "Gerar JSON".');
    }
  }

  const tv = $('#view-teacher');
  tv.addEventListener('click', async e => {
    const bb = e.target.closest('[data-bank]');
    if (bb) {
      ui.sel = bb.dataset.bank;
      ui.editing = null;
      renderTeacher();
      return;
    }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const bank = selBank();
    switch (a.dataset.act) {
      case 'new-bank': {
        const b = await newBankDoc('Novo questionário');
        ui.sel = b.id;
        ui.editing = null;
        renderTeacher();
        const n = $('#bank-name');
        if (n) n.select();
        break;
      }
      case 'play-bank':
        st.active = bank.id;
        lsSet('nivel-active-bank', st.active);
        Nivel.go('home');
        break;
      case 'dup-bank': {
        const b = await newBankDoc(bank.name + ' (cópia)');
        b.theme = bank.theme || '';
        b.level = bank.level;
        b.questions = clone(bank.questions).map(q => ({ ...q, id: uid() }));
        await saveBank(b);
        ui.sel = b.id;
        ui.editing = null;
        renderTeacher();
        toast('Cópia criada. Ela é sua.');
        break;
      }
      case 'del-bank':
        armed(a, 'Clique de novo para excluir', async () => {
          cache.banks = cache.banks.filter(b => b.id !== bank.id);
          try { await Store.del('banks/' + bank.id); } catch (er) { toast('Não foi possível excluir.'); }
          ui.sel = null;
          ui.editing = null;
          renderTeacher();
          toast('Questionário excluído.');
        });
        break;
      case 'edit-q':
        ui.editing = a.dataset.id;
        renderEditor();
        $('#form-title').scrollIntoView({ block: 'start' });
        break;
      case 'cancel-edit':
        ui.editing = null;
        renderEditor();
        break;
      case 'del-q':
        armed(a, 'Confirmar?', async () => {
          bank.questions = bank.questions.filter(q => q.id !== a.dataset.id);
          if (ui.editing === a.dataset.id) ui.editing = null;
          await saveBank(bank);
          renderTeacher();
          toast('Pergunta excluída.');
        });
        break;
      case 'gen-json': {
        const out = {
          name: bank.name,
          theme: bank.theme || '',
          level: bank.level,
          questions: bank.questions.map(({ text, options, correct, explanation }) => ({
            text,
            options,
            correct,
            explanation: explanation || ''
          }))
        };
        $('#json-box').value = JSON.stringify(out, null, 2);
        break;
      }
      case 'copy-json': {
        const box = $('#json-box');
        if (!box.value) {
          toast('Gere o JSON primeiro.');
          break;
        }
        box.select();
        copyText(box.value);
        break;
      }
      case 'import-json':
        importJson();
        break;
    }
  });

  tv.addEventListener('input', e => {
    if (e.target.closest('#q-form')) ui.formDirty = true;
  });

  tv.addEventListener('change', async e => {
    const bank = selBank();
    if (!bank || !canEditBank(bank)) return;
    if (e.target.id === 'bank-name') {
      bank.name = e.target.value.trim() || 'Sem título';
      cache.banks.sort(byName);
      await saveBank(bank);
      renderBankList();
    } else if (e.target.id === 'bank-theme') {
      bank.theme = e.target.value.trim();
      await saveBank(bank);
      renderBankList();
    } else if (e.target.name === 'level') {
      bank.level = e.target.value;
      await saveBank(bank);
      renderBankList();
    }
  });

  tv.addEventListener('submit', async e => {
    if (e.target.id !== 'q-form') return;
    e.preventDefault();
    const f = e.target.elements, err = $('#q-err'), bank = selBank();
    if (!bank || !canEditBank(bank)) return;
    const text = f.text.value.trim();
    const raw = [0, 1, 2, 3].map(i => f['o' + i].value.trim());
    const idxs = raw.map((t, i) => (t ? i : -1)).filter(i => i >= 0);
    const cv = f.correct.value;
    if (!text) {
      err.textContent = 'Escreva o enunciado da pergunta.';
      return;
    }
    if (idxs.length < 2) {
      err.textContent = 'Preencha pelo menos 2 alternativas.';
      return;
    }
    if (cv === '' || !raw[+cv]) {
      err.textContent = 'Marque qual alternativa é a correta. Ela precisa estar preenchida.';
      return;
    }
    const item = {
      text,
      options: idxs.map(i => raw[i]),
      correct: idxs.indexOf(+cv),
      explanation: f.expl.value.trim()
    };
    if (ui.editing) {
      const q = bank.questions.find(x => x.id === ui.editing);
      Object.assign(q, item);
      toast('Pergunta atualizada.');
    } else {
      bank.questions.push({ id: uid(), ...item });
      toast('Pergunta adicionada.');
    }
    ui.editing = null;
    await saveBank(bank);
    renderTeacher();
  });

  Object.assign(Nivel, {
    editorBusy,
    saveBank,
    renderBankList,
    editorHtml,
    renderEditor,
    renderTeacher,
    newBankDoc,
    importJson
  });
})();
