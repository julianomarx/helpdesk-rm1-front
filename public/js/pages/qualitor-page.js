function qualitorPage() {
  return {
    loading: false,
    loadingDetail: false,
    loadingHistory: false,
    tickets: [],
    status: null,

    filters: {
      situacao: '',
      equipe: '',
      search: '',
    },

    selectedTicket: null,
    ticketHistory: [],
    showDetail: false,
    detailTab: 'detalhes',

    // Estado de ações
    actionMode: null,   // null | 'iniciar' | 'encerrar'
    actionNota: '',
    actionLoading: false,
    refreshLoading: false,
    transferMode: false,
    transferEquipe: '',
    transferLoading: false,
    novoAcomp: {
      descricao: '',
      solicitante: 'N',
      privado: 'N',
      loading: false,
    },

    situacaoOptions: [
      { value: '', label: 'Todas as situações' },
      { value: 'Aguardando atendimento', label: 'Aguardando atendimento' },
      { value: 'Em atendimento', label: 'Em atendimento' },
    ],

    equipeOptions: [
      { value: '', label: 'Todas as equipes' },
      { value: 'RM1', label: 'RM1' },
      { value: 'RM1 SAP', label: 'RM1 SAP' },
      { value: 'ATRIO - SISTEMAS', label: 'ATRIO - SISTEMAS' },
    ],

    async init() {
      this.$watch('showDetail', val => {
        const bar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = val ? 'hidden' : '';
        document.body.style.paddingRight = val ? bar + 'px' : '';
      });
      await Promise.all([this.fetchStatus(), this.fetchTickets()]);
    },

    async fetchStatus() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/qualitor/status', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) this.status = await res.json();
        // status shape: { total_tickets, por_situacao, ultimo_sync }
      } catch {}
    },

    async fetchTickets() {
      if (!validateToken()) return;
      this.loading = true;
      const token = localStorage.getItem('access_token');
      try {
        const params = new URLSearchParams();
        if (this.filters.situacao) params.set('situacao', this.filters.situacao);
        if (this.filters.equipe)   params.set('equipe',   this.filters.equipe);
        const qs = params.toString();
        const res = await fetch(`/api/qualitor/tickets${qs ? '?' + qs : ''}`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) { showToast('Erro ao buscar tickets Qualitor', 'error'); return; }
        const data = await res.json();
        // shape: { total, tickets: [...] }
        this.tickets = Array.isArray(data) ? data : (data.tickets || []);
      } catch {
        showToast('Erro ao buscar tickets Qualitor', 'error');
      } finally {
        this.loading = false;
      }
    },

    async openTicket(ticket) {
      this.selectedTicket = ticket;
      this.ticketHistory = [];
      this.showDetail = true;
      this.loadingDetail = true;
      this.loadingHistory = true;
      this.actionMode = null;
      this.actionNota = '';
      this.detailTab = 'detalhes';
      this.novoAcomp = { descricao: '', solicitante: 'N', privado: 'N', loading: false };
      const token = localStorage.getItem('access_token');
      try {
        const [detailRes, historyRes] = await Promise.all([
          fetch(`/api/qualitor/tickets/${ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
          fetch(`/api/qualitor/tickets/${ticket.id}/history`, { headers: { Authorization: 'Bearer ' + token } }),
        ]);
        if (detailRes.ok) this.selectedTicket = await detailRes.json();
        if (historyRes.ok) {
          const h = await historyRes.json();
          // shape: { ticket_id, total, history: [...] }
          this.ticketHistory = Array.isArray(h) ? h : (h.history || []);
        }
      } catch {} finally {
        this.loadingDetail = false;
        this.loadingHistory = false;
      }
    },

    closeDetail() {
      this.showDetail = false;
      this.selectedTicket = null;
      this.ticketHistory = [];
      this.actionMode = null;
      this.actionNota = '';
      this.transferMode = false;
      this.transferEquipe = '';
      this.detailTab = 'detalhes';
      this.novoAcomp = { descricao: '', solicitante: 'N', privado: 'N', loading: false };
    },

    async reloadHistory() {
      this.loadingHistory = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/history`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          const h = await res.json();
          this.ticketHistory = Array.isArray(h) ? h : (h.history || []);
        }
      } catch {} finally {
        this.loadingHistory = false;
      }
    },

    async refreshTicket() {
      if (this.refreshLoading || !this.selectedTicket) return;
      this.refreshLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/refresh`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao atualizar chamado', 'error'); return; }
        if (data.ticket) {
          this.selectedTicket = data.ticket;
          const idx = this.tickets.findIndex(t => t.id === data.ticket.id);
          if (idx !== -1) this.tickets[idx] = { ...this.tickets[idx], situacao: data.ticket.situacao };
        }
        if (data.history && data.history.length) {
          this.ticketHistory = data.history;
        }
        showToast('Chamado atualizado', 'success');
      } catch {
        showToast('Erro ao atualizar chamado', 'error');
      } finally {
        this.refreshLoading = false;
      }
    },

    async iniciarAtendimento() {
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/start`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nota: this.actionNota }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao iniciar atendimento', 'error'); return; }
        if (data.status_qualitor_mudou) {
          this.selectedTicket.situacao = 'Em atendimento';
          const idx = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
          if (idx !== -1) this.tickets[idx].situacao = 'Em atendimento';
          showToast('Atendimento iniciado com sucesso', 'success');
        } else {
          showToast('Comentário adicionado. Status no Qualitor não mudou — tente novamente ou ajuste manualmente.', 'error');
        }
        this.actionMode = null;
        this.actionNota = '';
        await this.reloadHistory();
      } catch {
        showToast('Erro ao iniciar atendimento', 'error');
      } finally {
        this.actionLoading = false;
      }
    },

    async encerrarChamado() {
      if (!this.actionNota.trim()) {
        showToast('Descreva o encerramento antes de confirmar', 'error');
        return;
      }
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/close`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nota: this.actionNota }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao encerrar chamado', 'error'); return; }
        const novaSit = data.nova_situacao || 'Aguardando confirmação de encerramento';
        this.selectedTicket.situacao = novaSit;
        const idx = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
        if (idx !== -1) this.tickets[idx].situacao = novaSit;
        this.actionMode = null;
        this.actionNota = '';
        showToast('Chamado encerrado com sucesso', 'success');
        this.detailTab = 'historico';
        if (data.history && data.history.length) {
          this.ticketHistory = data.history;
        } else {
          await this.reloadHistory();
        }
      } catch {
        showToast('Erro ao encerrar chamado', 'error');
      } finally {
        this.actionLoading = false;
      }
    },

    get equipeDestinoOptions() {
      // Matriz espelhando a configuração categoria×equipe do Qualitor (extraída dos dialogs)
      const matrix = {
        'rm1': [
          'ATRIO - INFRA', 'Concept Prime Back', 'Capere', 'Concept Prime PDV',
          'Netlogic', 'Unic System', 'TCPOS', 'ATRIO - SISTEMAS',
        ],
        'rm1 sap': [
          'ATRIO - INFRA', 'Unic System', 'ATRIO - SISTEMAS',
          'Cobrança', 'MDM', 'COE', 'Fiscal',
        ],
        'atrio - sistemas': [
          'ATRIO - INFRA', 'Capere', 'Unic System', 'RM1',
        ],
      };
      const atual = (this.selectedTicket?.equipe || '').trim().toLowerCase();
      return (matrix[atual] || []).map(nm => ({ value: nm, label: nm }));
    },

    async transferirChamado() {
      if (!this.transferEquipe) { showToast('Selecione a equipe de destino', 'error'); return; }
      this.transferLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/transfer`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nmequipe: this.transferEquipe }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao transferir chamado', 'error'); return; }
        if (data.ticket) {
          this.selectedTicket = data.ticket;
          const idx = this.tickets.findIndex(t => t.id === data.ticket.id);
          if (idx !== -1) this.tickets[idx] = { ...this.tickets[idx], equipe: data.ticket.equipe, situacao: data.ticket.situacao };
        }
        if (data.history && data.history.length) this.ticketHistory = data.history;
        this.transferMode = false;
        this.transferEquipe = '';
        showToast(`Chamado transferido para ${data.nova_equipe || this.transferEquipe}`, 'success');
      } catch {
        showToast('Erro ao transferir chamado', 'error');
      } finally {
        this.transferLoading = false;
      }
    },

    async enviarAcompanhamento() {
      if (!this.novoAcomp.descricao.trim()) {
        showToast('Texto do acompanhamento é obrigatório', 'error');
        return;
      }
      this.novoAcomp.loading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/history`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricao: this.novoAcomp.descricao,
            idsolicitante: this.novoAcomp.solicitante,
            idprivado: this.novoAcomp.privado,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao enviar acompanhamento', 'error'); return; }
        this.novoAcomp.descricao = '';
        this.novoAcomp.solicitante = 'N';
        this.novoAcomp.privado = 'N';
        showToast('Acompanhamento enviado', 'success');
        if (data.history && data.history.length) {
          this.ticketHistory = data.history;
        } else {
          await this.reloadHistory();
        }
      } catch {
        showToast('Erro ao enviar acompanhamento', 'error');
      } finally {
        this.novoAcomp.loading = false;
      }
    },

    get filteredTickets() {
      const q = this.filters.search.toLowerCase();
      if (!q) return this.tickets;
      return this.tickets.filter(t =>
        String(t.id).includes(q) ||
        (t.titulo       || '').toLowerCase().includes(q) ||
        (t.contato      || '').toLowerCase().includes(q) ||
        (t.responsavel  || '').toLowerCase().includes(q) ||
        (t.categoria    || '').toLowerCase().includes(q)
      );
    },

    situacaoBadge(s) {
      const map = {
        'Aguardando atendimento': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        'Em atendimento':         'bg-blue-500/15  text-blue-300  border-blue-500/30',
        'Encerrado':              'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        'Cancelado':              'bg-red-500/15   text-red-300   border-red-500/30',
      };
      return map[s] || 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    },

    severidadeBadge(s) {
      if (!s) return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      if (s.startsWith('P1')) return 'bg-red-500/20 text-red-300 border-red-500/30';
      if (s.startsWith('P2')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      if (s.startsWith('P3')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    },

    formatDate(iso) {
      if (!iso) return '—';
      return dayjs(iso).format('DD/MM/YYYY HH:mm');
    },

    lastSyncRelative() {
      const ts = this.status?.ultimo_sync?.em;
      if (!ts) return '—';
      return dayjs(ts).format('DD/MM [às] HH:mm');
    },
  };
}
