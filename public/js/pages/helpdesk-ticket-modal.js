function helpdeskTicketModal() {
  return {
    open: false,
    loading: false,
    ticket: null,
    logs: [],
    tab: 'details',
    readOnly: false,

    // Comentário
    newComment: '',
    submittingComment: false,

    // Ações
    actionMode: '',   // 'iniciar' | 'finalizar' | ''
    finishReason: '',
    finishing: false,
    actionLoading: false,

    // Transferir chamado
    transferMode: false,
    selectedTeamId: '',
    selectedUserId: '',
    teamUsers: [],
    teamSubcategories: [],
    transferSubcategoryId: '',
    transferLoading: false,

    // Agendar visita
    scheduleMode: false,
    scheduleDate: '',
    schedulingVisit: false,

    // Anexos
    attachments: [],
    loadingAttachments: false,
    deletingAttachmentId: null,
    uploadLoading: false,

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
      this.actionMode = '';
      this.finishReason = '';
      this.transferMode = false;
      this.selectedTeamId = '';
      this.selectedUserId = '';
      this.teamUsers = [];
      this.teamSubcategories = [];
      this.transferSubcategoryId = '';
      this.scheduleMode = false;
      this.scheduleDate = '';
      this.attachments = [];

      const token = localStorage.getItem('access_token');
      try {
        const [tRes, lRes, aRes] = await Promise.all([
          fetch(`/api/tickets/${id}`, { headers: { Authorization: 'Bearer ' + token } }),
          fetch(`/api/ticket-logs/${id}`, { headers: { Authorization: 'Bearer ' + token } }),
          fetch(`/api/tickets/${id}/attachments`, { headers: { Authorization: 'Bearer ' + token } }),
        ]);
        if (tRes.ok) this.ticket = await tRes.json();
        if (lRes.ok) this.logs = (await lRes.json()).reverse();
        if (aRes.ok) this.attachments = await aRes.json();
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
      this.transferMode = false;
      this.scheduleMode = false;
      this.actionMode = '';
    },

    async _refreshTicket() {
      if (!this.ticket?.id) return;
      const token = localStorage.getItem('access_token');
      const [tRes, lRes, aRes] = await Promise.all([
        fetch(`/api/tickets/${this.ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
        fetch(`/api/ticket-logs/${this.ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
        fetch(`/api/tickets/${this.ticket.id}/attachments`, { headers: { Authorization: 'Bearer ' + token } }),
      ]);
      if (tRes.ok) this.ticket = await tRes.json();
      if (lRes.ok) this.logs = (await lRes.json()).reverse();
      if (aRes.ok) this.attachments = await aRes.json();
    },

    get availableTeams() {
      return Alpine.store('app').teams || [];
    },

    // ── AÇÕES ──────────────────────────────────────────────────────────

    async startTicket() {
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/start-ticket/${this.ticket.id}`, {
          method: 'PUT', headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          this.actionMode = '';
          await this._refreshTicket();
          showToast('Atendimento iniciado!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao iniciar', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.actionLoading = false; }
    },

    async confirmFinishTicket() {
      if (!this.finishReason.trim()) { showToast('Descreva a conclusão antes de finalizar', 'error'); return; }
      this.finishing = true;
      const token = localStorage.getItem('access_token');
      try {
        await fetch('/api/comments/', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: this.ticket.id, comment: this.finishReason }),
        });
        const res = await fetch(`/api/tickets/${this.ticket.id}`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: 'awaiting_confirmation' }),
        });
        if (res.ok) {
          this.actionMode = '';
          this.finishReason = '';
          await this._refreshTicket();
          showToast('Enviado para confirmação do cliente!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao finalizar', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.finishing = false; }
    },

    async reopenTicket() {
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/reopen-ticket/${this.ticket.id}`, {
          method: 'PUT', headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          await this._refreshTicket();
          showToast('Chamado reaberto!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao reabrir', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.actionLoading = false; }
    },

    async closeTicket() {
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/close-ticket/${this.ticket.id}`, {
          method: 'PUT', headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          await this._refreshTicket();
          showToast('Chamado encerrado!', 'success');
        } else {
          const e = await res.json();
          showToast(e.detail || 'Erro ao encerrar', 'error');
        }
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.actionLoading = false; }
    },

    // ── TRANSFERIR ─────────────────────────────────────────────────────

    async fetchTeamUsers() {
      if (this.teamUsers.length) return;
      const teamId = this.ticket?.assigned_team?.id || this.ticket?.assigned_team_id;
      if (!teamId) return;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/teams/${teamId}/users/`, { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) this.teamUsers = await res.json();
    },

    async onTeamChange() {
      this.selectedUserId = '';
      this.transferSubcategoryId = '';
      this.teamSubcategories = [];
      if (!this.selectedTeamId) return;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/subcategories/?category_id=${this.selectedTeamId}`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) this.teamSubcategories = await res.json();
    },

    async confirmTransfer() {
      if (!this.selectedTeamId && !this.selectedUserId) {
        showToast('Selecione um destino', 'error');
        return;
      }
      this.transferLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        if (this.selectedUserId) {
          if (this.ticket.progress === 'waiting') {
            showToast('Inicie o atendimento antes de transferir para outro usuário', 'error');
            return;
          }
          const res = await fetch(`/api/tickets/${this.ticket.id}/assign-agent/${this.selectedUserId}`, {
            method: 'PUT', headers: { Authorization: 'Bearer ' + token },
          });
          if (!res.ok) { showToast('Erro ao atribuir atendente', 'error'); return; }
          showToast('Atendente alterado!', 'success');
        } else {
          if (!this.transferSubcategoryId) {
            showToast('Selecione a subcategoria da equipe destino', 'error');
            return;
          }
          const res = await fetch(`/api/tickets/${this.ticket.id}/assign-team/${this.selectedTeamId}`, {
            method: 'PUT', headers: { Authorization: 'Bearer ' + token },
          });
          if (!res.ok) { showToast('Erro ao transferir equipe', 'error'); return; }
          await fetch(`/api/tickets/${this.ticket.id}/subcategory`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ subcategory_id: parseInt(this.transferSubcategoryId) }),
          });
          showToast('Chamado transferido!', 'success');
        }
        this.transferMode = false;
        this.selectedTeamId = '';
        this.selectedUserId = '';
        this.transferSubcategoryId = '';
        this.teamUsers = [];
        this.teamSubcategories = [];
        await this._refreshTicket();
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.transferLoading = false; }
    },

    // ── AGENDAR VISITA ─────────────────────────────────────────────────

    openScheduleMode() {
      if (this.ticket?.scheduled_visit_at) {
        const d = new Date(this.ticket.scheduled_visit_at);
        const pad = n => String(n).padStart(2, '0');
        this.scheduleDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } else {
        this.scheduleDate = '';
      }
      this.scheduleMode = true;
    },

    async confirmScheduleVisit() {
      if (!this.scheduleDate) { showToast('Selecione a data', 'error'); return; }
      this.schedulingVisit = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/${this.ticket.id}/schedule-visit`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduled_at: new Date(this.scheduleDate).toISOString() }),
        });
        if (!res.ok) { const e = await res.json(); showToast(e.detail || 'Erro ao agendar', 'error'); return; }
        this.scheduleMode = false;
        await this._refreshTicket();
        showToast('Visita agendada!', 'success');
      } catch { showToast('Erro ao agendar visita', 'error'); }
      finally { this.schedulingVisit = false; }
    },

    // ── COMENTÁRIO ─────────────────────────────────────────────────────

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

    // ── ANEXOS ─────────────────────────────────────────────────────────

    validateAttachment(file) {
      const ALLOWED = ['.jpg','.jpeg','.png','.gif','.webp','.pdf','.doc','.docx',
        '.xls','.xlsx','.txt','.csv','.zip'];
      const MAX = 10 * 1024 * 1024;
      if (!file) return false;
      if (file.size > MAX) { showToast('Arquivo muito grande. Máximo: 10 MB.', 'error'); return false; }
      const ext = ('.' + file.name.split('.').pop()).toLowerCase();
      if (!ALLOWED.includes(ext)) {
        showToast(`Tipo não permitido: ${ext}. Use: imagem, PDF, Word, Excel, CSV ou ZIP.`, 'error');
        return false;
      }
      return true;
    },

    async uploadAttachment(file, inputEl) {
      if (!file || !this.validateAttachment(file)) {
        if (inputEl) inputEl.value = '';
        return;
      }
      this.uploadLoading = true;
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/tickets/${this.ticket.id}/attachments`, {
          method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: formData,
        });
        if (!res.ok) { const e = await res.json(); showToast(e.detail || 'Erro no upload', 'error'); return; }
        const aRes = await fetch(`/api/tickets/${this.ticket.id}/attachments`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (aRes.ok) this.attachments = await aRes.json();
        showToast('Arquivo enviado!', 'success');
      } catch { showToast('Erro ao realizar upload', 'error'); }
      finally { this.uploadLoading = false; if (inputEl) inputEl.value = ''; }
    },

    async deleteAttachment(attachmentId) {
      if (!confirm('Excluir este anexo?')) return;
      this.deletingAttachmentId = attachmentId;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/tickets/${this.ticket.id}/attachments/${attachmentId}`, {
          method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) { const e = await res.json(); showToast(e.detail || 'Erro ao excluir', 'error'); return; }
        this.attachments = this.attachments.filter(a => a.id !== attachmentId);
        showToast('Anexo excluído', 'success');
      } catch { showToast('Erro ao excluir anexo', 'error'); }
      finally { this.deletingAttachmentId = null; }
    },

    async downloadAttachment(att) {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(att.url, { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) { showToast('Erro ao baixar arquivo', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = att.file_name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch { showToast('Erro ao baixar arquivo', 'error'); }
    },

    fileIcon(mimeType) {
      if (!mimeType) return 'file';
      if (mimeType.startsWith('image/')) return 'img';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('word')) return 'doc';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xls';
      if (mimeType === 'text/plain') return 'txt';
      if (mimeType === 'text/csv') return 'csv';
      if (mimeType.includes('zip')) return 'zip';
      return 'file';
    },

    formatFileSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // ── TIMELINE ───────────────────────────────────────────────────────

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

    // ── HELPERS ────────────────────────────────────────────────────────

    dotColor(color) {
      return {
        blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
        red: 'bg-red-500', purple: 'bg-purple-500', cyan: 'bg-cyan-500', gray: 'bg-gray-500',
      }[color] || 'bg-gray-500';
    },

    get isAdminOrAgent() {
      return ['admin', 'agent'].includes(Alpine.store('app').role);
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
        scheduled_visit:       'Visita agendada',
        done:                  'Concluído',
      }[p] || p || '—';
    },

    translateValue(v) {
      const m = {
        open: 'Aberto', closed: 'Encerrado', cancelled: 'Cancelado',
        waiting: 'Aguardando', in_progress: 'Em atendimento',
        feedback: 'Retorno do solicitante', awaiting_confirmation: 'Ag. confirmação',
        scheduled_visit: 'Visita agendada', done: 'Concluído',
        low: 'Baixa', medium: 'Média', high: 'Alta',
      };
      return m[v] || v || '';
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

    renderMentions(text) {
      if (!text) return '';
      const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return safe.replace(/@([\wÀ-ſ]+)/g, '<span class="text-blue-400 font-medium">@$1</span>');
    },

    formatDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    },
  };
}
