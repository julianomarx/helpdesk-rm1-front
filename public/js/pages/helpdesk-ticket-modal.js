function helpdeskTicketModal() {
  return {
    open: false,
    loading: false,
    ticket: null,
    logs: [],
    newComment: '',
    submittingComment: false,
    tab: 'details',
    readOnly: false,

    // Transferir equipe
    transferTeamMode: false,
    transferTeamId: '',
    transferTeamLoading: false,

    // Atribuir responsável
    assignMode: false,
    assignAgentId: '',
    assignLoading: false,
    agentList: [],

    init() {
      window._hdModalInstance = this;
    },

    async openTicket(id, opts = {}) {
      this.readOnly = opts.readOnly === true;
      this.open = true;
      this.loading = true;
      this.ticket = null;
      this.logs = [];
      this.tab = 'details';
      this.newComment = '';
      this.transferTeamMode = false;
      this.transferTeamId = '';
      this.assignMode = false;
      this.assignAgentId = '';

      const token = localStorage.getItem('access_token');
      try {
        const [tRes, lRes] = await Promise.all([
          fetch(`/api/tickets/${id}`, { headers: { Authorization: 'Bearer ' + token } }),
          fetch(`/api/ticket-logs/${id}`, { headers: { Authorization: 'Bearer ' + token } }),
        ]);
        if (tRes.ok) this.ticket = await tRes.json();
        if (lRes.ok) this.logs = (await lRes.json()).reverse();
      } catch {
        showToast('Erro ao carregar ticket', 'error');
        this.open = false;
      } finally {
        this.loading = false;
      }
    },

    close() {
      this.open = false;
      this.ticket = null;
      this.logs = [];
      this.transferTeamMode = false;
      this.assignMode = false;
    },

    get availableTeams() {
      return Alpine.store('app').teams || [];
    },

    async loadAgents() {
      if (this.agentList.length) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/reports/agents', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) this.agentList = await res.json();
      } catch {}
    },

    async transferTeam() {
      if (!this.transferTeamId) { showToast('Selecione a equipe', 'error'); return; }
      this.transferTeamLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/${this.ticket.id}`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: parseInt(this.transferTeamId) }),
        });
        if (res.ok) {
          this.transferTeamMode = false;
          this.transferTeamId = '';
          await this._refreshTicket();
          showToast('Equipe transferida!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao transferir equipe', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.transferTeamLoading = false; }
    },

    async assignTicket() {
      if (!this.assignAgentId) { showToast('Selecione o responsável', 'error'); return; }
      this.assignLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/${this.ticket.id}`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_to: parseInt(this.assignAgentId) }),
        });
        if (res.ok) {
          this.assignMode = false;
          this.assignAgentId = '';
          await this._refreshTicket();
          showToast('Responsável atribuído!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao atribuir', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.assignLoading = false; }
    },

    async _refreshTicket() {
      if (!this.ticket?.id) return;
      const token = localStorage.getItem('access_token');
      const [tRes, lRes] = await Promise.all([
        fetch(`/api/tickets/${this.ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
        fetch(`/api/ticket-logs/${this.ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
      ]);
      if (tRes.ok) this.ticket = await tRes.json();
      if (lRes.ok) this.logs = (await lRes.json()).reverse();
    },

    // Timeline unificada: comments + logs, ordenados por data decrescente
    get timeline() {
      if (!this.ticket) return [];
      const comments = (this.ticket.comments || []).map(c => ({
        kind: 'comment',
        id: 'c' + c.id,
        date: new Date(c.created_at),
        author: c.author,
        text: c.comment,
      }));
      const events = (this.logs || []).map(l => ({
        kind: 'event',
        id: 'l' + l.id,
        date: new Date(l.created_at),
        action: l.action,
        value: l.value,
        user: l.user,
        meta: this._logMeta(l.action),
      }));
      return [...comments, ...events].sort((a, b) => b.date - a.date);
    },

    _logMeta(action) {
      const map = {
        created:             { label: 'Chamado aberto',        color: 'emerald' },
        ticket_started:      { label: 'Atendimento iniciado',  color: 'blue'    },
        ticket_closed:       { label: 'Chamado encerrado',     color: 'emerald' },
        ticket_reopened:     { label: 'Chamado reaberto',      color: 'amber'   },
        ticket_cancelled:    { label: 'Chamado cancelado',     color: 'red'     },
        ticket_returned:     { label: 'Retornado para fila',   color: 'amber'   },
        status_changed:      { label: 'Status alterado',       color: 'blue'    },
        progress_changed:    { label: 'Progresso alterado',    color: 'blue'    },
        assigned_changed:    { label: 'Responsável alterado',  color: 'purple'  },
        priority_changed:    { label: 'Prioridade alterada',   color: 'amber'   },
        team_changed:        { label: 'Equipe alterada',       color: 'purple'  },
        category_changed:    { label: 'Categoria alterada',    color: 'blue'    },
        subcategory_changed: { label: 'Subcategoria alterada', color: 'blue'    },
        comment_updated:     { label: 'Comentário editado',    color: 'gray'    },
        comment_deleted:     { label: 'Comentário removido',   color: 'red'     },
        sla_started:         { label: 'SLA iniciado',          color: 'emerald' },
        sla_breached:        { label: 'SLA violado',           color: 'red'     },
        agent_joined:        { label: 'Agente entrou',         color: 'emerald' },
        agent_left:          { label: 'Agente removido',       color: 'red'     },
      };
      return map[action] || { label: action, color: 'gray' };
    },

    dotColor(color) {
      return {
        blue:    'bg-blue-500',
        emerald: 'bg-emerald-500',
        amber:   'bg-amber-500',
        red:     'bg-red-500',
        purple:  'bg-purple-500',
        cyan:    'bg-cyan-500',
        gray:    'bg-gray-500',
      }[color] || 'bg-gray-500';
    },

    statusClass(s) {
      return {
        open:      'bg-blue-500/15 text-blue-300 border border-blue-500/30',
        closed:    'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
        cancelled: 'bg-red-500/15 text-red-300 border border-red-500/30',
      }[s] || 'bg-gray-500/15 text-gray-300 border border-gray-500/30';
    },

    statusLabel(s) {
      return { open: 'Aberto', closed: 'Encerrado', cancelled: 'Cancelado' }[s] || s;
    },

    priorityClass(p) {
      return {
        high:   'bg-red-500/15 text-red-300 border border-red-500/30',
        medium: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        low:    'bg-blue-500/15 text-blue-300 border border-blue-500/30',
      }[p] || 'bg-gray-500/15 text-gray-300 border border-gray-500/30';
    },

    priorityLabel(p) {
      return { high: 'Alta', medium: 'Média', low: 'Baixa' }[p] || p;
    },

    progressLabel(p) {
      return {
        waiting:               'Aguardando',
        in_progress:           'Em atendimento',
        feedback:              'Retorno do solicitante',
        awaiting_confirmation: 'Ag. confirmação',
        done:                  'Concluído',
      }[p] || p || '—';
    },

    translateValue(v) {
      const m = {
        open: 'Aberto', closed: 'Encerrado', cancelled: 'Cancelado',
        waiting: 'Aguardando', in_progress: 'Em atendimento',
        feedback: 'Retorno do solicitante', awaiting_confirmation: 'Ag. confirmação',
        done: 'Concluído', low: 'Baixa', medium: 'Média', high: 'Alta',
      };
      return m[v] || v || '';
    },

    formatDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    },

    renderMentions(text) {
      if (!text) return '';
      const safe = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return safe.replace(/@([\wÀ-ſ]+)/g, '<span class="text-blue-400 font-medium">@$1</span>');
    },

    get isAdminOrAgent() {
      return ['admin', 'agent'].includes(Alpine.store('app').role);
    },

    get slaLabel() {
      const sla = this.ticket?.sla;
      if (!sla) return null;
      if (sla.resolved_at) return { text: 'Resolvido no prazo', color: 'emerald' };
      if (sla.breached_at) return { text: 'SLA violado', color: 'red' };
      if (!sla.due_at) return null;
      const hoursLeft = (new Date(sla.due_at) - new Date()) / 36e5;
      if (hoursLeft < 0) return { text: 'SLA violado', color: 'red' };
      if (hoursLeft < 4) return { text: `Vence em ${Math.round(hoursLeft)}h`, color: 'amber' };
      return { text: `Vence em ${Math.round(hoursLeft)}h`, color: 'emerald' };
    },

    // Actions
    async startTicket() {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/tickets/start-ticket/${this.ticket.id}`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) { await this._refreshTicket(); showToast('Atendimento iniciado!', 'success'); }
      else { const e = await res.json(); showToast(e.detail || 'Erro ao iniciar', 'error'); }
    },

    async closeTicket() {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/tickets/close-ticket/${this.ticket.id}`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) { await this._refreshTicket(); showToast('Chamado encerrado!', 'success'); }
      else { const e = await res.json(); showToast(e.detail || 'Erro ao encerrar', 'error'); }
    },

    async reopenTicket() {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/tickets/reopen-ticket/${this.ticket.id}`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) { await this._refreshTicket(); showToast('Chamado reaberto!', 'success'); }
      else { const e = await res.json(); showToast(e.detail || 'Erro ao reabrir', 'error'); }
    },

    async markDone() {
      if (!this.newComment.trim()) {
        showToast('Descreva a resolução antes de enviar para confirmação', 'error');
        return;
      }
      const token = localStorage.getItem('access_token');
      this.submittingComment = true;
      try {
        await fetch('/api/comments/', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: this.ticket.id, comment: this.newComment }),
        });
        const res = await fetch(`/api/tickets/${this.ticket.id}`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: 'awaiting_confirmation' }),
        });
        if (res.ok) {
          this.newComment = '';
          await this._refreshTicket();
          showToast('Enviado para confirmação do cliente', 'success');
        } else showToast('Erro ao atualizar ticket', 'error');
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.submittingComment = false; }
    },

    async submitComment() {
      if (!this.newComment.trim()) { showToast('Comentário vazio', 'error'); return; }
      this.submittingComment = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/comments/', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: this.ticket.id, comment: this.newComment }),
        });
        if (res.ok) {
          this.newComment = '';
          await this._refreshTicket();
          showToast('Comentário enviado!', 'success');
        } else showToast('Erro ao enviar comentário', 'error');
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.submittingComment = false; }
    },
  };
}
