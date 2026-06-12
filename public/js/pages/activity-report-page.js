function activityReportPage() {
  const today = new Date().toISOString().split('T')[0];

  return {
    agents: [],
    loadingAgents: true,
    filters: {
      userId: '',
      startDate: today,
      endDate: today,
    },
    report: null,
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

    async generateReport() {
      if (!this.filters.userId) { this.error = 'Selecione um agente'; return; }
      if (!this.filters.startDate || !this.filters.endDate) { this.error = 'Informe o período completo'; return; }
      if (this.filters.startDate > this.filters.endDate) { this.error = 'Data inicial não pode ser maior que a final'; return; }

      this.error = '';
      this.generating = true;
      this.report = null;

      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({
        user_id: this.filters.userId,
        start_date: this.filters.startDate,
        end_date: this.filters.endDate,
      });

      try {
        const res = await fetch(`/api/reports/activity?${params}`, {
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) {
          const err = await res.json();
          this.error = err.detail || 'Erro ao gerar relatório';
          return;
        }
        this.report = await res.json();
      } catch (e) {
        this.error = 'Erro ao gerar relatório. Tente novamente.';
      } finally {
        this.generating = false;
      }
    },

    printReport() {
      if (!this.report) return;
      const r = this.report;
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório - ${r.agent.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; background: white; padding: 36px 40px; font-size: 13px; }
  .header { background: #1e3a5f; color: white; padding: 24px 28px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .header .sub { font-size: 12px; opacity: 0.75; margin-top: 3px; }
  .header .meta { display: flex; justify-content: space-between; margin-top: 18px; }
  .header .ml { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; opacity: 0.65; margin-bottom: 3px; }
  .header .mv { font-size: 16px; font-weight: 600; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #718096; margin-bottom: 10px; margin-top: 20px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 4px; }
  .stat { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 10px; text-align: center; }
  .stat .v { font-size: 28px; font-weight: 800; margin-bottom: 3px; }
  .stat .l { font-size: 10px; color: #718096; }
  .c1 { color: #2b6cb0; } .c2 { color: #276749; } .c3 { color: #c05621; } .c4 { color: #553c9a; } .c5 { color: #c05621; }
  .breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
  .bcard { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; }
  .bcard h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #718096; margin-bottom: 14px; }
  .bars { display: flex; gap: 0; }
  .bar-item { flex: 1; text-align: center; }
  .bar-item .bv { font-size: 26px; font-weight: 800; margin-bottom: 3px; }
  .bar-item .bl { font-size: 10px; color: #718096; }
  .div { width: 1px; background: #e2e8f0; margin: 0 12px; }
  .high { color: #c53030; } .med { color: #c05621; } .low { color: #2b6cb0; }
  .sopen { color: #2b6cb0; } .sclosed { color: #276749; } .scanc { color: #a0aec0; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0; }
  @media print { @page { margin: 10mm; } }
</style>
</head>
<body>
<div class="header">
  <h1>Relatório de Atividades</h1>
  <div class="sub">${r.agent.email} &middot; ${this.roleLabel(r.agent.role)}</div>
  <div class="meta">
    <div><div class="ml">Atendente</div><div class="mv">${r.agent.name}</div></div>
    <div style="text-align:right"><div class="ml">Período analisado</div><div class="mv">${this.formatDate(r.period.start)} &mdash; ${this.formatDate(r.period.end)}</div></div>
  </div>
</div>

<div class="section-label">Resumo de atendimentos</div>
<div class="stats">
  <div class="stat"><div class="v c1">${r.summary.tickets_interacted}</div><div class="l">Chamados atendidos</div></div>
  <div class="stat"><div class="v c2">${r.summary.tickets_closed}</div><div class="l">Fechados no período</div></div>
  <div class="stat"><div class="v c3">${r.summary.tickets_opened}</div><div class="l">Abertos no período</div></div>
  <div class="stat"><div class="v c4">${r.summary.comments_made}</div><div class="l">Comentários</div></div>
  <div class="stat"><div class="v c5">${r.summary.total_actions}</div><div class="l">Ações registradas</div></div>
</div>

<div class="section-label">Análise por categoria</div>
<div class="breakdown">
  <div class="bcard">
    <h3>Por prioridade</h3>
    <div class="bars">
      <div class="bar-item"><div class="bv high">${r.by_priority.high}</div><div class="bl">Alta</div></div>
      <div class="div"></div>
      <div class="bar-item"><div class="bv med">${r.by_priority.medium}</div><div class="bl">Média</div></div>
      <div class="div"></div>
      <div class="bar-item"><div class="bv low">${r.by_priority.low}</div><div class="bl">Baixa</div></div>
    </div>
  </div>
  <div class="bcard">
    <h3>Por status atual</h3>
    <div class="bars">
      <div class="bar-item"><div class="bv sopen">${r.by_status.open}</div><div class="bl">Abertos</div></div>
      <div class="div"></div>
      <div class="bar-item"><div class="bv sclosed">${r.by_status.closed}</div><div class="bl">Fechados</div></div>
      <div class="div"></div>
      <div class="bar-item"><div class="bv scanc">${r.by_status.cancelled}</div><div class="bl">Cancelados</div></div>
    </div>
  </div>
</div>

<div class="footer">
  <span>RM1 Helpdesk &mdash; Sistema de Gestão de Chamados</span>
  <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
</div>
</body></html>`;
      const win = window.open('', '_blank', 'width=900,height=650');
      if (!win) { alert('Permite pop-ups para baixar o PDF'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
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
  };
}
