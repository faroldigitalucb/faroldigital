(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const {
    $, esc, byName, avatarHtml, weekKey, ago,
    Store, rep, loadStats, reportHtml
  } = Nivel;

  /* =====================================================================
     View: Relatórios da Turma e Individuais (Professores)
     ===================================================================== */
  async function renderReports() {
    const v = $('#view-reports');
    v.innerHTML = '<div class="u-wrap"><p class="boot">Carregando relatórios…</p></div>';
    try {
      const [us, ss] = await Promise.all([Store.list('users'), loadStats(true)]);
      rep.students = us.map(x => x.data).filter(u => u.role === 'student').sort(byName);
      rep.stats = {};
      ss.forEach(s => { rep.stats[s.uid] = s; });
    } catch (e) {
      v.innerHTML = '<div class="u-wrap"><div class="panel">Não foi possível carregar os dados. Tente de novo.</div></div>';
      return;
    }
    paintReports();
  }

  function repRows() {
    const wk = weekKey();
    return rep.students.map(u => {
      const s = rep.stats[u.username], t = (s && s.total) || {}, w = ((s && s.weeks) || {})[wk] || {};
      return {
        u,
        s,
        wp: w.points || 0,
        games: t.games || 0,
        asked: t.asked || 0,
        acc: t.asked ? Math.round(t.right / t.asked * 100) : null,
        last: (s && s.lastAt) || 0
      };
    });
  }

  function repTableHtml() {
    const q = rep.q.trim().toLowerCase();
    const rows = repRows().filter(r => !q || r.u.name.toLowerCase().includes(q) || r.u.username.includes(q));
    const cmp = {
      name: null,
      week: (a, b) => b.wp - a.wp,
      acc: (a, b) => (a.acc === null ? 101 : a.acc) - (b.acc === null ? 101 : b.acc),
      last: (a, b) => a.last - b.last
    }[rep.sort];
    if (cmp) rows.sort(cmp);
    return rows.map(r => {
      const idle = r.last && Date.now() - r.last > 7 * 864e5;
      return `<tr><td><span class="name-cell">${avatarHtml(r.u, 'sm')}<button class="link-btn" data-rep="${esc(r.u.username)}">${esc(r.u.name)}</button></span></td>
        <td>${r.wp}</td><td>${r.games}</td>
        <td>${r.acc === null ? 'sem dados' : r.acc + '%'}${r.acc !== null && r.asked >= 10 && r.acc < 60 ? '<span class="flag">Reforçar</span>' : ''}</td>
        <td>${ago(r.last)}${idle ? '<span class="flag">Inativo</span>' : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="5">Nenhum aluno encontrado.</td></tr>';
  }

  function paintReports() {
    const v = $('#view-reports');
    if (rep.sel) {
      const u = rep.students.find(x => x.username === rep.sel);
      if (u) {
        const s = rep.stats[u.username];
        v.innerHTML = `<div class="u-wrap">
          <div class="row no-print"><button class="btn btn-sm" data-repact="back">Voltar para a turma</button><button class="btn btn-sm" data-repact="print">Imprimir relatório</button></div>
          <div class="panel"><div class="pf-head">${avatarHtml(u, 'lg')}<div><strong>${esc(u.name)}</strong><span class="note" style="margin:0">Usuário: ${esc(u.username)}. Última atividade: ${ago(s && s.lastAt)}.</span></div></div>
          ${reportHtml(u, s)}</div></div>`;
        return;
      }
      rep.sel = null;
    }

    const rows = repRows(), withAcc = rows.filter(r => r.acc !== null);
    const avg = withAcc.length ? Math.round(withAcc.reduce((s, r) => s + r.acc, 0) / withAcc.length) : null;
    const idle = rows.filter(r => !r.last || Date.now() - r.last > 7 * 864e5).length;

    v.innerHTML = `<div class="u-wrap"><div class="panel">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">Relatórios da turma</h2>
        <div class="row no-print"><button class="btn btn-sm" data-repact="csv">Baixar planilha (CSV)</button><button class="btn btn-sm" data-repact="print">Imprimir</button></div></div>
      <div class="kpis" style="margin-top:1rem">
        <div class="kpi"><b>${rows.length}</b><span>alunos cadastrados</span></div>
        <div class="kpi"><b>${rows.filter(r => r.wp > 0).length}</b><span>jogaram nesta semana</span></div>
        <div class="kpi"><b>${avg === null ? '-' : avg + '%'}</b><span>acerto médio da turma</span></div>
        <div class="kpi"><b>${idle}</b><span>sem jogar há 7+ dias</span></div>
      </div>
      <div class="rep-tools no-print">
        <label class="fld">Buscar aluno<input class="inp" id="rep-q" value="${esc(rep.q)}" placeholder="Nome ou usuário"></label>
        <label class="fld">Ordenar por<select class="inp" id="rep-sort">${[['name', 'Nome'], ['week', 'Pontos da semana (maior primeiro)'], ['acc', 'Menor acerto primeiro'], ['last', 'Mais tempo sem jogar primeiro']].map(([k, l]) => `<option value="${k}" ${rep.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="scroll"><table class="utable"><thead><tr><th>Aluno</th><th>Pontos na semana</th><th>Partidas</th><th>Acerto</th><th>Última atividade</th></tr></thead><tbody id="rep-rows">${repTableHtml()}</tbody></table></div>
      <p class="note no-print">Toque no nome de um aluno para abrir o relatório individual.</p>
    </div></div>`;
  }

  function exportCsv() {
    const wk = weekKey();
    const rows = [['Nome', 'Usuário', 'Pontos na semana', 'Pontos totais', 'Partidas', 'Perguntas respondidas', 'Acertos', 'Acerto (%)', 'Última atividade']];
    rep.students.forEach(u => {
      const s = rep.stats[u.username], t = (s && s.total) || {}, w = ((s && s.weeks) || {})[wk] || {};
      rows.push([
        u.name,
        u.username,
        w.points || 0,
        t.points || 0,
        t.games || 0,
        t.asked || 0,
        t.right || 0,
        t.asked ? Math.round(t.right / t.asked * 100) : '',
        s && s.lastAt ? new Date(s.lastAt).toLocaleDateString('pt-BR') : ''
      ]);
    });
    const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desempenho-da-turma.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const rv = $('#view-reports');
  rv.addEventListener('click', e => {
    const s = e.target.closest('[data-rep]');
    if (s) {
      rep.sel = s.dataset.rep;
      paintReports();
      window.scrollTo(0, 0);
      return;
    }
    const a = e.target.closest('[data-repact]');
    if (!a) return;
    if (a.dataset.repact === 'back') {
      rep.sel = null;
      paintReports();
    } else if (a.dataset.repact === 'print') {
      window.print();
    } else if (a.dataset.repact === 'csv') {
      exportCsv();
    }
  });

  rv.addEventListener('input', e => {
    if (e.target.id === 'rep-q') {
      rep.q = e.target.value;
      $('#rep-rows').innerHTML = repTableHtml();
    }
  });

  rv.addEventListener('change', e => {
    if (e.target.id === 'rep-sort') {
      rep.sort = e.target.value;
      $('#rep-rows').innerHTML = repTableHtml();
    }
  });

  Object.assign(Nivel, {
    renderReports,
    repRows,
    repTableHtml,
    paintReports,
    exportCsv
  });
})();
