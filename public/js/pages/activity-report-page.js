function activityReportPage() {
  const today = new Date().toISOString().split('T')[0];

  return {
    agents: [],
    loadingAgents: true,
    source: 'helpdesk',   // 'helpdesk' | 'qualitor' | 'ambos'
    filters: {
      userId: '',
      startDate: today,
      endDate: today,
    },
    report: null,
    bothReports: null,   // { helpdesk: {...}, qualitor: {...} } quando source === 'ambos'
    generating: false,
    error: '',

    async init() {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/reports/agents', {
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Erro ao carregar agentes');
        this.agents = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loadingAgents = false;
      }
    },

    switchSource(src) {
      this.source = src;
      this.report = null;
      this.bothReports = null;
      this.error = '';
    },

    async generateReport() {
      if (!this.filters.userId) { this.error = 'Selecione um agente'; return; }
      if (!this.filters.startDate || !this.filters.endDate) { this.error = 'Informe o período completo'; return; }
      if (this.filters.startDate > this.filters.endDate) { this.error = 'Data inicial não pode ser maior que a final'; return; }

      this.error = '';
      this.generating = true;
      this.report = null;
      this.bothReports = null;

      if (this.source === 'qualitor') {
        await this._generateQualitorReport();
      } else if (this.source === 'ambos') {
        await this._generateBothReports();
      } else {
        await this._generateHelpdeskReport();
      }
    },

    async _fetchHelpdeskData() {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({
        user_id: this.filters.userId,
        start_date: this.filters.startDate,
        end_date: this.filters.endDate,
      });
      const res = await fetch(`/api/reports/activity?${params}`, {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) return null;
      return res.json();
    },

    async _fetchQualitorData() {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({
        interno_user_id: this.filters.userId,
        start_date: this.filters.startDate,
        end_date: this.filters.endDate,
      });
      const res = await fetch(`/api/qualitor/reports/activity?${params}`, {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) return null;
      return res.json();
    },

    async _generateHelpdeskReport() {
      try {
        const data = await this._fetchHelpdeskData();
        if (!data) { this.error = 'Erro ao gerar relatório helpdesk'; return; }
        this.report = data;
      } catch { this.error = 'Erro ao gerar relatório. Tente novamente.'; }
      finally { this.generating = false; }
    },

    async _generateQualitorReport() {
      try {
        const data = await this._fetchQualitorData();
        if (!data) { this.error = 'Erro ao gerar relatório Qualitor'; return; }
        this.report = data;
      } catch { this.error = 'Erro ao gerar relatório. Tente novamente.'; }
      finally { this.generating = false; }
    },

    async _generateBothReports() {
      try {
        const [hd, qt] = await Promise.all([
          this._fetchHelpdeskData(),
          this._fetchQualitorData(),
        ]);
        if (!hd && !qt) { this.error = 'Nenhum dado encontrado para este agente'; return; }
        this.bothReports = { helpdesk: hd, qualitor: qt };
      } catch { this.error = 'Erro ao gerar relatório. Tente novamente.'; }
      finally { this.generating = false; }
    },

    printReport() {
      if (this.bothReports) { this._printBothReport(); return; }
      if (!this.report) return;
      if (this.report.source === 'qualitor') { this._printQualitorReport(); return; }
      this._printHelpdeskReport();
    },

    _pdfOpen(title, body) {
      const win = window.open('', '_blank', 'width=960,height=720');
      if (!win) { alert('Permite pop-ups para gerar o PDF'); return; }
      win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title><style>${this._pdfCss()}</style></head><body>${body}</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 450);
    },

    _pdfCss() {
      return `
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a202c;background:white;padding:32px 40px;font-size:13px}
        h1{font-size:20px;font-weight:700;letter-spacing:-.3px}
        .sub{font-size:12px;opacity:.75;margin-top:3px}
        .hdr{color:white;padding:22px 26px;border-radius:10px;margin-bottom:20px}
        .hdr.hd{background:#1e3a5f}
        .hdr.qt{background:#3b0764}
        .hdr.both{background:#064e3b}
        .hdr .meta{display:flex;justify-content:space-between;margin-top:16px}
        .hdr .ml{font-size:10px;text-transform:uppercase;letter-spacing:.6px;opacity:.65;margin-bottom:2px}
        .hdr .mv{font-size:15px;font-weight:600}
        .sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#718096;margin-bottom:8px;margin-top:18px}
        .section-hd{font-size:11px;font-weight:700;color:#1e40af;border-bottom:2px solid #bfdbfe;padding-bottom:5px;margin:22px 0 10px}
        .section-qt{font-size:11px;font-weight:700;color:#6d28d9;border-bottom:2px solid #ddd6fe;padding-bottom:5px;margin:22px 0 10px}
        .stats{display:grid;gap:8px;margin-bottom:4px}
        .s5{grid-template-columns:repeat(5,1fr)}
        .s4{grid-template-columns:repeat(4,1fr)}
        .s3{grid-template-columns:repeat(3,1fr)}
        .stat{background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 8px;text-align:center}
        .stat .v{font-size:26px;font-weight:800;margin-bottom:2px}
        .stat .l{font-size:10px;color:#718096}
        .breakdown{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
        .bcard{background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px}
        .bcard.hd{border-top:3px solid #3b82f6}
        .bcard.qt{border-top:3px solid #8b5cf6}
        .bcard h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#718096;margin-bottom:12px}
        .bars{display:flex;align-items:center}
        .bi{flex:1;text-align:center}
        .bi .bv{font-size:24px;font-weight:800;margin-bottom:2px}
        .bi .bl{font-size:10px;color:#718096}
        .dv{width:1px;background:#e2e8f0;margin:0 10px;height:36px}
        table{width:100%;border-collapse:collapse;margin-top:4px;font-size:11px}
        th{text-align:left;padding:7px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#718096;background:#f9fafb;border-bottom:1px solid #e2e8f0}
        td{padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#374151}
        tr:last-child td{border-bottom:none}
        .mono{font-family:monospace;color:#6b7280}
        .badge{display:inline-block;font-size:9px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#5b21b6;margin-left:3px;vertical-align:middle}
        .trunc{max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block}
        .cbl{color:#1d4ed8}.cgr{color:#059669}.crd{color:#dc2626}
        .cyl{color:#d97706}.cpr{color:#7c3aed}.cgy{color:#6b7280}
        .cor{color:#c2410c}.cem{color:#065f46}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#a0aec0}
        @media print{@page{margin:8mm}body{padding:0}}
      `;
    },

    _pdfSevColor(s) {
      if (!s) return 'cgy';
      if (s.startsWith('P1')) return 'crd';
      if (s.startsWith('P2')) return 'cor';
      if (s.startsWith('P3')) return 'cyl';
      return 'cgy';
    },

    _pdfSitColor(s) {
      const m = {'Encerrado':'cgr','Cancelado':'cgy','Em atendimento':'cbl','Aguardando atendimento':'cyl','Aguardando confirmação de encerramento':'cpr'};
      return m[s] || 'cgy';
    },

    _pdfFooter() {
      return `<div class="footer"><span>RM1 Helpdesk &mdash; Sistema de Gestão de Chamados</span><span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
    },

    _printHelpdeskReport() {
      const r = this.report;
      const fd = (d) => this.formatDate(d);
      const rl = (p) => ({low:'Baixa',medium:'Média',high:'Alta'}[p]||p);
      const sl = (s) => ({open:'Aberto',closed:'Fechado',cancelled:'Cancelado'}[s]||s);
      const pc = (p) => ({high:'crd',medium:'cyl',low:'cbl'}[p]||'cgy');
      const sc = (s) => ({open:'cbl',closed:'cgr',cancelled:'cgy'}[s]||'cgy');
      const pl = (p) => ({waiting:'Aguardando',in_progress:'Em progresso',feedback:'Feedback',awaiting_confirmation:'Ag. confirmação',done:'Concluído'}[p]||p);

      const rows = (r.ticket_list||[]).map(t =>
        `<tr><td class="mono">#${t.id}</td><td><span class="trunc">${t.title||'—'}</span></td><td>${t.hotel||'—'}</td><td>${t.category||'—'}</td><td class="${pc(t.priority)}">${rl(t.priority)}</td><td class="${sc(t.status)}">${sl(t.status)}</td><td>${pl(t.progress)}</td></tr>`
      ).join('');

      const body = `
<div class="hdr hd">
  <h1>Relatório de Atividades — Helpdesk</h1>
  <div class="sub">${r.agent.email} &middot; ${this.roleLabel(r.agent.role)}</div>
  <div class="meta">
    <div><div class="ml">Atendente</div><div class="mv">${r.agent.name}</div></div>
    <div style="text-align:right"><div class="ml">Período analisado</div><div class="mv">${fd(r.period.start)} &mdash; ${fd(r.period.end)}</div></div>
  </div>
</div>
<div class="sl">Resumo de atendimentos</div>
<div class="stats s5">
  <div class="stat"><div class="v cbl">${r.summary.tickets_interacted}</div><div class="l">Atendidos</div></div>
  <div class="stat"><div class="v cgr">${r.summary.tickets_closed}</div><div class="l">Fechados</div></div>
  <div class="stat"><div class="v cor">${r.summary.tickets_opened}</div><div class="l">Abertos</div></div>
  <div class="stat"><div class="v cpr">${r.summary.comments_made}</div><div class="l">Comentários</div></div>
  <div class="stat"><div class="v cor">${r.summary.total_actions}</div><div class="l">Ações</div></div>
</div>
<div class="sl">Análise por categoria</div>
<div class="breakdown">
  <div class="bcard hd"><h3>Por prioridade</h3><div class="bars">
    <div class="bi"><div class="bv crd">${r.by_priority.high}</div><div class="bl">Alta</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cyl">${r.by_priority.medium}</div><div class="bl">Média</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cbl">${r.by_priority.low}</div><div class="bl">Baixa</div></div>
  </div></div>
  <div class="bcard hd"><h3>Por status atual</h3><div class="bars">
    <div class="bi"><div class="bv cbl">${r.by_status.open}</div><div class="bl">Abertos</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgr">${r.by_status.closed}</div><div class="bl">Fechados</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgy">${r.by_status.cancelled}</div><div class="bl">Cancelados</div></div>
  </div></div>
</div>
${rows ? `<div class="sl" style="margin-top:22px">Chamados atendidos no período (${r.ticket_list.length})</div>
<table><thead><tr><th>#</th><th>Título</th><th>Hotel</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Progresso</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
${this._pdfFooter()}`;

      this._pdfOpen(`Relatório Helpdesk — ${r.agent.name}`, body);
    },

    _printQualitorReport() {
      const r = this.report;
      const fd = (d) => this.formatDate(d);
      const fqd = (d) => this.formatQualitorDate(d);
      const sc = (s) => this._pdfSevColor(s);
      const stc = (s) => this._pdfSitColor(s);
      const agentName = r.agent?.name || r.agent?.nome || '';
      const agentEmail = r.agent?.email || '';

      const sevEntries = Object.entries(r.by_severity || {});
      const sevBars = sevEntries.map(([sev, cnt]) =>
        `<div class="bi"><div class="bv ${sc(sev)}">${cnt}</div><div class="bl">${sev}</div></div><div class="dv"></div>`
      ).join('').replace(/<div class="dv"><\/div>$/, '') || '<span style="color:#718096;font-size:11px">Sem dados</span>';

      const rows = (r.ticket_list||[]).map(t =>
        `<tr><td class="mono">#${t.id}${!t.is_responsible ? '<span class="badge">part.</span>' : ''}</td><td><span class="trunc">${t.titulo||'—'}</span></td><td>${t.contato||t.cliente||'—'}</td><td>${t.equipe||'—'}</td><td class="${sc(t.severidade)}">${t.severidade||'—'}</td><td class="${stc(t.situacao)}">${t.situacao||'—'}</td><td>${fqd(t.dtabertura)}</td><td class="${t.scheduled_visit_at ? 'cbl' : 'cgy'}">${t.scheduled_visit_at ? fqd(t.scheduled_visit_at) : '—'}</td></tr>`
      ).join('');

      const body = `
<div class="hdr qt">
  <h1>Relatório de Atividades — Qualitor</h1>
  <div class="sub">${agentEmail}</div>
  <div class="meta">
    <div><div class="ml">Atendente</div><div class="mv">${agentName}</div></div>
    <div style="text-align:right"><div class="ml">Período analisado</div><div class="mv">${fd(r.period.start)} &mdash; ${fd(r.period.end)}</div></div>
  </div>
</div>
<div class="sl">Resumo de atendimentos</div>
<div class="stats s3">
  <div class="stat"><div class="v cpr">${r.summary.tickets_managed}</div><div class="l">Gerenciados</div></div>
  <div class="stat"><div class="v cgr">${r.summary.tickets_closed}</div><div class="l">Fechados</div></div>
  <div class="stat"><div class="v cbl">${r.summary.comments_made}</div><div class="l">Comentários</div></div>
</div>
<div class="sl">Análise por categoria</div>
<div class="breakdown">
  <div class="bcard qt"><h3>Por severidade</h3><div class="bars">${sevBars}</div></div>
  <div class="bcard qt"><h3>Por status atual</h3><div class="bars">
    <div class="bi"><div class="bv cbl">${r.by_status.open}</div><div class="bl">Abertos</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgr">${r.by_status.closed}</div><div class="bl">Fechados</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgy">${r.by_status.cancelled}</div><div class="bl">Cancelados</div></div>
  </div></div>
</div>
${rows ? `<div class="sl" style="margin-top:22px">Chamados no período (${r.ticket_list.length})</div>
<table><thead><tr><th>#</th><th>Título</th><th>Contato</th><th>Equipe</th><th>Severidade</th><th>Situação</th><th>Abertura</th><th>Visita</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
${this._pdfFooter()}`;

      this._pdfOpen(`Relatório Qualitor — ${agentName}`, body);
    },

    _printBothReport() {
      const hd = this.bothReports.helpdesk;
      const qt = this.bothReports.qualitor;
      const bs = this.bothSummary();
      const agentName = this.agentDisplayName();
      const fd = (d) => this.formatDate(d);
      const fqd = (d) => this.formatQualitorDate(d);
      const sc = (s) => this._pdfSevColor(s);
      const stc = (s) => this._pdfSitColor(s);
      const rl = (p) => ({low:'Baixa',medium:'Média',high:'Alta'}[p]||p);
      const sl = (s) => ({open:'Aberto',closed:'Fechado',cancelled:'Cancelado'}[s]||s);
      const pc = (p) => ({high:'crd',medium:'cyl',low:'cbl'}[p]||'cgy');
      const stsc = (s) => ({open:'cbl',closed:'cgr',cancelled:'cgy'}[s]||'cgy');
      const pl = (p) => ({waiting:'Aguardando',in_progress:'Em progresso',feedback:'Feedback',awaiting_confirmation:'Ag. confirmação',done:'Concluído'}[p]||p);

      const hdSection = hd ? `
<div class="section-hd">Helpdesk</div>
<div class="stats s4" style="margin-bottom:10px">
  <div class="stat"><div class="v cbl">${hd.summary.tickets_interacted}</div><div class="l">Atendidos</div></div>
  <div class="stat"><div class="v cgr">${hd.summary.tickets_closed}</div><div class="l">Fechados</div></div>
  <div class="stat"><div class="v cor">${hd.summary.tickets_opened}</div><div class="l">Abertos</div></div>
  <div class="stat"><div class="v cpr">${hd.summary.comments_made}</div><div class="l">Comentários</div></div>
</div>
<div class="breakdown" style="margin-bottom:8px">
  <div class="bcard hd"><h3>Por prioridade</h3><div class="bars">
    <div class="bi"><div class="bv crd">${hd.by_priority?.high||0}</div><div class="bl">Alta</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cyl">${hd.by_priority?.medium||0}</div><div class="bl">Média</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cbl">${hd.by_priority?.low||0}</div><div class="bl">Baixa</div></div>
  </div></div>
  <div class="bcard hd"><h3>Por status</h3><div class="bars">
    <div class="bi"><div class="bv cbl">${hd.by_status?.open||0}</div><div class="bl">Abertos</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgr">${hd.by_status?.closed||0}</div><div class="bl">Fechados</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgy">${hd.by_status?.cancelled||0}</div><div class="bl">Cancelados</div></div>
  </div></div>
</div>
${(hd.ticket_list||[]).length ? `<div class="sl">Chamados Helpdesk (${hd.ticket_list.length})</div>
<table><thead><tr><th>#</th><th>Título</th><th>Hotel</th><th>Prioridade</th><th>Status</th><th>Progresso</th></tr></thead><tbody>
${hd.ticket_list.map(t => `<tr><td class="mono">#${t.id}</td><td><span class="trunc">${t.title||'—'}</span></td><td>${t.hotel||'—'}</td><td class="${pc(t.priority)}">${rl(t.priority)}</td><td class="${stsc(t.status)}">${sl(t.status)}</td><td>${pl(t.progress)}</td></tr>`).join('')}
</tbody></table>` : ''}` : '';

      const sevBars = qt ? Object.entries(qt.by_severity||{}).map(([sev,cnt]) =>
        `<div class="bi"><div class="bv ${sc(sev)}">${cnt}</div><div class="bl">${sev}</div></div><div class="dv"></div>`
      ).join('').replace(/<div class="dv"><\/div>$/, '') || '<span style="color:#718096;font-size:11px">Sem dados</span>' : '';

      const qtSection = qt ? `
<div class="section-qt">Qualitor</div>
<div class="stats s3" style="margin-bottom:10px">
  <div class="stat"><div class="v cpr">${qt.summary.tickets_managed}</div><div class="l">Gerenciados</div></div>
  <div class="stat"><div class="v cgr">${qt.summary.tickets_closed}</div><div class="l">Fechados</div></div>
  <div class="stat"><div class="v cbl">${qt.summary.comments_made}</div><div class="l">Comentários</div></div>
</div>
<div class="breakdown" style="margin-bottom:8px">
  <div class="bcard qt"><h3>Por severidade</h3><div class="bars">${sevBars}</div></div>
  <div class="bcard qt"><h3>Por status</h3><div class="bars">
    <div class="bi"><div class="bv cbl">${qt.by_status?.open||0}</div><div class="bl">Abertos</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgr">${qt.by_status?.closed||0}</div><div class="bl">Fechados</div></div><div class="dv"></div>
    <div class="bi"><div class="bv cgy">${qt.by_status?.cancelled||0}</div><div class="bl">Cancelados</div></div>
  </div></div>
</div>
${(qt.ticket_list||[]).length ? `<div class="sl">Chamados Qualitor (${qt.ticket_list.length})</div>
<table><thead><tr><th>#</th><th>Título</th><th>Contato</th><th>Severidade</th><th>Situação</th><th>Abertura</th></tr></thead><tbody>
${qt.ticket_list.map(t => `<tr><td class="mono">#${t.id}${!t.is_responsible?'<span class="badge">part.</span>':''}</td><td><span class="trunc">${t.titulo||'—'}</span></td><td>${t.contato||t.cliente||'—'}</td><td class="${sc(t.severidade)}">${t.severidade||'—'}</td><td class="${stc(t.situacao)}">${t.situacao||'—'}</td><td>${fqd(t.dtabertura)}</td></tr>`).join('')}
</tbody></table>` : ''}` : '';

      const body = `
<div class="hdr both">
  <h1>Relatório Combinado — Helpdesk + Qualitor</h1>
  <div class="meta">
    <div><div class="ml">Atendente</div><div class="mv">${agentName}</div></div>
    <div style="text-align:right"><div class="ml">Período analisado</div><div class="mv">${fd(this.filters.startDate)} &mdash; ${fd(this.filters.endDate)}</div></div>
  </div>
</div>
<div class="sl">Totais combinados</div>
<div class="stats s4">
  <div class="stat"><div class="v cem">${bs.total_closed}</div><div class="l">Total fechados (HD+QT)</div></div>
  <div class="stat"><div class="v cpr">${bs.total_comments}</div><div class="l">Total comentários (HD+QT)</div></div>
  <div class="stat"><div class="v cbl">${bs.hd_interacted}</div><div class="l">HD — atendidos</div></div>
  <div class="stat"><div class="v cpr">${bs.qt_managed}</div><div class="l">QT — gerenciados</div></div>
</div>
${hdSection}
${qtSection}
${this._pdfFooter()}`;

      this._pdfOpen(`Relatório Combinado — ${agentName}`, body);
    },

    formatDate(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    },

    statusLabel(s) {
      return { open: 'Aberto', closed: 'Fechado', cancelled: 'Cancelado' }[s] || s;
    },

    priorityLabel(p) {
      return { low: 'Baixa', medium: 'Média', high: 'Alta' }[p] || p;
    },

    progressLabel(p) {
      return {
        waiting: 'Aguardando',
        in_progress: 'Em progresso',
        feedback: 'Feedback',
        awaiting_confirmation: 'Ag. confirmação',
        done: 'Concluído',
      }[p] || p;
    },

    priorityClass(p) {
      return { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' }[p] || 'text-gray-400';
    },

    statusClass(s) {
      return { open: 'text-blue-400', closed: 'text-emerald-400', cancelled: 'text-gray-400' }[s] || 'text-gray-400';
    },

    roleLabel(r) {
      return { admin: 'Administrador', agent: 'Agente', client_manager: 'Gerente', client_receptionist: 'Recepcionista' }[r] || r;
    },

    // Helpers específicos Qualitor
    severidadeClass(s) {
      if (!s) return 'text-gray-400';
      if (s.startsWith('P1')) return 'text-red-400';
      if (s.startsWith('P2')) return 'text-orange-400';
      if (s.startsWith('P3')) return 'text-yellow-400';
      return 'text-gray-400';
    },

    situacaoClassQ(s) {
      const m = {
        'Encerrado':                              'text-emerald-400',
        'Cancelado':                              'text-gray-400',
        'Em atendimento':                         'text-blue-400',
        'Aguardando atendimento':                 'text-yellow-400',
        'Aguardando confirmação de encerramento': 'text-violet-400',
      };
      return m[s] || 'text-gray-400';
    },

    formatQualitorDate(str) {
      if (!str) return '—';
      const parts = str.split(/[-T ]/);
      if (parts.length >= 3) return `${String(parts[2]).substring(0,2)}/${parts[1]}/${parts[0]}`;
      return str;
    },

    agentDisplayName() {
      if (this.bothReports) {
        const hd = this.bothReports.helpdesk;
        const qt = this.bothReports.qualitor;
        return hd?.agent?.name || qt?.agent?.name || qt?.agent?.nome || '';
      }
      if (!this.report) return '';
      return this.report.agent?.name || this.report.agent?.nome || '';
    },

    bothSummary() {
      const hd = this.bothReports?.helpdesk?.summary || {};
      const qt = this.bothReports?.qualitor?.summary || {};
      return {
        hd_interacted:  hd.tickets_interacted || 0,
        hd_closed:      hd.tickets_closed || 0,
        hd_opened:      hd.tickets_opened || 0,
        hd_comments:    hd.comments_made || 0,
        qt_managed:     qt.tickets_managed || 0,
        qt_closed:      qt.tickets_closed || 0,
        qt_comments:    qt.comments_made || 0,
        total_closed:   (hd.tickets_closed || 0) + (qt.tickets_closed || 0),
        total_comments: (hd.comments_made || 0) + (qt.comments_made || 0),
      };
    },
  };
}
