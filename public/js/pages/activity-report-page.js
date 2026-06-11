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
      window.print();
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
