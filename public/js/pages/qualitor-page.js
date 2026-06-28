function qualitorPage() {
  return {
    loading: false,
    loadingDetail: false,
    loadingHistory: false,
    tickets: [],
    status: null,
    ticketAttachments: [],
    loadingAttachments: false,
    uploadLoading: false,

    filters: {
      situacao: '',
      equipe: '',
      search: '',
      mine: false,
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
    assignInternMode: false,
    assignInternAgentId: '',
    assignInternLoading: false,
    agentList: [],
    visitMode: false,
    visitDate: '',
    visitTime: '09:00',
    visitLoading: false,
    novoAcomp: {
      descricao: '',
      solicitante: 'N',
      privado: 'N',
      loading: false,
    },

    mentionUsers: [],
    mentionMatches: [],
    showMentionDropdown: false,
    _mentionStart: -1,
    _mentionEnd: -1,

    situacaoOptions: [
      { value: '', label: 'Todas as situações' },
      { value: 'Aguardando atendimento', label: 'Aguardando atendimento' },
      { value: 'Em atendimento', label: 'Em atendimento' },
    ],

    equipeOptions: [],

    async init() {
      this.$watch('showDetail', val => {
        const bar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = val ? 'hidden' : '';
        document.body.style.paddingRight = val ? bar + 'px' : '';
      });

      const qt = Alpine.store('app').qualitorTeams || [];
      if (qt.length > 1) {
        this.equipeOptions = [
          { value: '', label: 'Todas as equipes' },
          ...qt.map(t => ({ value: t, label: t })),
        ];
      } else if (qt.length === 1) {
        // Single team — backend enforces it; pre-select and hide dropdown
        this.equipeOptions = [{ value: qt[0], label: qt[0] }];
        this.filters.equipe = qt[0];
      }

      await Promise.all([this.fetchStatus(), this.fetchTickets(), this.loadMentionUsers()]);
    },

    async loadMentionUsers() {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/users/mentionable', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) this.mentionUsers = await res.json();
      } catch {}
    },

    onAcompInput(event) {
      const ta = event.target;
      const val = ta.value;
      const cursor = ta.selectionStart;
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/@(\w*)$/);
      if (match) {
        this._mentionStart = cursor - match[0].length;
        this._mentionEnd = cursor;
        const query = match[1].toLowerCase();
        this.mentionMatches = query.length === 0
          ? this.mentionUsers.slice(0, 6)
          : this.mentionUsers.filter(u =>
              u.name.toLowerCase().startsWith(query) ||
              u.name.toLowerCase().includes(' ' + query)
            ).slice(0, 6);
        this.showMentionDropdown = this.mentionMatches.length > 0;
      } else {
        this.showMentionDropdown = false;
        this._mentionStart = -1;
        this._mentionEnd = -1;
      }
    },

    selectMentionAcomp(user) {
      const firstName = user.name.split(' ')[0];
      const before = this.novoAcomp.descricao.slice(0, this._mentionStart);
      const after  = this.novoAcomp.descricao.slice(this._mentionEnd > -1 ? this._mentionEnd : this.novoAcomp.descricao.length);
      this.novoAcomp.descricao = before + '@' + firstName + ' ' + after;
      this.showMentionDropdown = false;
      this._mentionStart = -1;
      this._mentionEnd = -1;
      this.$nextTick(() => {
        const ta = document.getElementById('qualitor-acomp-textarea');
        if (ta) {
          const pos = before.length + firstName.length + 2;
          ta.focus();
          ta.selectionStart = ta.selectionEnd = pos;
        }
      });
    },

    toggleMine() {
      this.filters.mine = !this.filters.mine;
      this.fetchTickets();
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
        if (this.filters.mine)     params.set('responsavel_interno_id', Alpine.store('app').userId);
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
      this.ticketAttachments = [];
      this.loadingAttachments = false;
      this.uploadLoading = false;
      this.assignInternMode = false;
      this.assignInternAgentId = '';
      this.visitMode = false;
      this.visitDate = '';
      this.visitTime = '09:00';
      const token = localStorage.getItem('access_token');
      try {
        const [detailRes, historyRes] = await Promise.all([
          fetch(`/api/qualitor/tickets/${ticket.id}`, { headers: { Authorization: 'Bearer ' + token } }),
          fetch(`/api/qualitor/tickets/${ticket.id}/history`, { headers: { Authorization: 'Bearer ' + token } }),
        ]);
        if (detailRes.ok) this.selectedTicket = await detailRes.json();
        if (historyRes.ok) {
          const h = await historyRes.json();
          this.ticketHistory = Array.isArray(h) ? h : (h.history || []);
        }
      } catch {} finally {
        this.loadingDetail = false;
        this.loadingHistory = false;
      }

      // Se o histórico veio vazio do cache, sincronizar com o Qualitor silenciosamente
      if (!this.ticketHistory.length && this.selectedTicket) {
        this.loadingHistory = true;
        try {
          const res = await fetch(`/api/qualitor/tickets/${ticket.id}/refresh`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ticket) this.selectedTicket = data.ticket;
            if (data.history?.length) this.ticketHistory = data.history;
          }
        } catch {} finally {
          this.loadingHistory = false;
        }
      }
    },

    closeDetail() {
      this.showDetail = false;
      this.selectedTicket = null;
      this.ticketHistory = [];
      this.ticketAttachments = [];
      this.loadingAttachments = false;
      this.uploadLoading = false;
      this.actionMode = null;
      this.actionNota = '';
      this.transferMode = false;
      this.transferEquipe = '';
      this.assignInternMode = false;
      this.assignInternAgentId = '';
      this.visitMode = false;
      this.visitDate = '';
      this.visitTime = '09:00';
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
          if (idx !== -1) this.tickets[idx] = { ...this.tickets[idx], situacao: data.ticket.situacao, equipe: data.ticket.equipe };
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
          body: JSON.stringify({
            nota: this.actionNota,
            responsavel_interno_id: Alpine.store('app').userId,
            responsavel_interno_nome: Alpine.store('app').userName,
          }),
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
          body: JSON.stringify({
            nota: this.actionNota,
            interno_user_id: Alpine.store('app').userId,
            interno_user_nome: Alpine.store('app').userName,
          }),
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
        // O Qualitor demora alguns segundos para registrar o evento de sistema
        // ">> Chamado aguardando confirmação de encerramento". Se ainda não veio
        // no retorno, injeta um evento sintético para exibição imediata.
        const hasClosingEvent = this.ticketHistory.some(h =>
          /aguardando confirm/i.test(h.descricao || '')
        );
        if (!hasClosingEvent) {
          const now = new Date();
          const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          this.ticketHistory.push({
            id: `synthetic_closing_${Date.now()}`,
            tipo: null,
            descricao: '>> Chamado aguardando confirmação de encerramento',
            usuario: Alpine.store('app').userName || 'Sistema',
            interno_user_nome: null,
            data: dateStr,
            is_solucao: false,
            is_privado: false,
            is_solicitante: false,
            subsituacao: null,
            duracao: null,
          });
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
            interno_user_id: Alpine.store('app').userId,
            interno_user_nome: Alpine.store('app').userName,
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

    async loadAgentList() {
      if (this.agentList.length) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/reports/agents', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) this.agentList = await res.json();
      } catch {}
    },

    async transferirResponsavelInterno() {
      if (!this.assignInternAgentId) { showToast('Selecione o agente', 'error'); return; }
      this.assignInternLoading = true;
      const token = localStorage.getItem('access_token');
      const agent = this.agentList.find(a => String(a.id) === String(this.assignInternAgentId));
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/assign-interno`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(this.assignInternAgentId),
            user_nome: agent?.name || '',
            motivo: 'transferencia_interna',
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao transferir responsável', 'error'); return; }
        this.selectedTicket.responsavel_interno_id   = data.responsavel_interno_id;
        this.selectedTicket.responsavel_interno_nome = data.responsavel_interno_nome;
        this.assignInternMode = false;
        this.assignInternAgentId = '';
        showToast(`Chamado transferido para ${data.responsavel_interno_nome}`, 'success');
      } catch {
        showToast('Erro ao transferir responsável', 'error');
      } finally {
        this.assignInternLoading = false;
      }
    },

    async agendarVisita() {
      if (!this.visitDate) { showToast('Selecione a data da visita', 'error'); return; }
      this.visitLoading = true;
      const token = localStorage.getItem('access_token');
      const dateTimeStr = `${this.visitDate}T${this.visitTime || '09:00'}:00`;
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/schedule-visit`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ date_time: dateTimeStr }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao agendar visita', 'error'); return; }
        this.selectedTicket.scheduled_visit_at = data.scheduled_visit_at;
        this.visitMode = false;
        this.visitDate = '';
        showToast('Visita agendada com sucesso', 'success');
        if (data.history && data.history.length) {
          this.ticketHistory = data.history;
        } else {
          await this.reloadHistory();
        }
      } catch {
        showToast('Erro ao agendar visita', 'error');
      } finally {
        this.visitLoading = false;
      }
    },

    parseHistoryEntry(entry) {
      const raw = this.cleanText(entry.descricao || '');
      if (!raw.startsWith('>>')) {
        return { ...entry, kind: 'comment', eventType: null, systemLabel: null, humanText: raw };
      }
      // Separa texto do sistema do comentário humano embutido (>> sistema <<comentário)
      const inner = raw.replace(/^>>/, '').replace(/<<$/, '').trim();
      const split = inner.indexOf('<<');
      let sysText = split > -1 ? inner.substring(0, split).trim() : inner;
      const humanText = split > -1 ? inner.substring(split + 2).trim() || null : null;

      let eventType = 'info', systemLabel = sysText;

      if (/^Chamado em atendimento/i.test(sysText)) {
        eventType = 'status-active';   systemLabel = 'Em atendimento';
      } else if (/^Chamado aguardando atendimento/i.test(sysText)) {
        eventType = 'status-waiting';  systemLabel = 'Aguardando atendimento';
      } else if (/^Chamado aguardando confirmação/i.test(sysText)) {
        eventType = 'status-closing';  systemLabel = 'Aguardando confirmação de encerramento';
      } else if (/^Chamado repassado para outra equipe/i.test(sysText)) {
        eventType = 'transfer';
        const m = sysText.match(/De "(.+?)" para "(.+?)"/);
        systemLabel = m ? `${m[1]} → ${m[2]}` : 'Transferência de equipe';
      } else if (/^Chamado repassado para outro responsável/i.test(sysText)) {
        eventType = 'assign';
        const m = sysText.match(/responsável:\s*(.+)/i);
        systemLabel = m ? `Responsável: ${m[1].trim()}` : 'Responsável alterado';
      } else if (/^O arquivo/i.test(sysText)) {
        eventType = 'attachment';
        const m = sysText.match(/O arquivo "(.+?)" foi anexado/i);
        if (m) { const p = m[1].split(/[/\\]/); systemLabel = `Anexo: ${p[p.length - 1]}`; }
        else systemLabel = 'Arquivo anexado';
      } else if (/^Acompanhamento iniciado em/i.test(sysText)) {
        eventType = 'time';
        const m = sysText.match(/iniciado em:\s*[\d/]+\s*(\d{2}:\d{2})?,?\s*finalizado em:\s*[\d/]+\s*(\d{2}:\d{2})?/i);
        const st = m?.[1], en = m?.[2];
        systemLabel = st && en ? `Tempo registrado: ${st} → ${en}` : 'Tempo registrado';
      } else if (/^Chamado reaberto/i.test(sysText)) {
        eventType = 'reopen';
        const m = sysText.match(/reaberto por:\s*(.+?)(?:\s*Motivo:\s*(.+))?$/i);
        const who = m ? m[1].split(/[/\\]/).pop().trim() : null;
        const why = m?.[2]?.trim();
        systemLabel = who ? `Reaberto por ${who}${why ? ` — ${why}` : ''}` : 'Chamado reaberto';
      } else if (/^Registro efetuado por/i.test(sysText)) {
        eventType = 'register';
        const m = sysText.match(/por:\s*(.+)/i);
        systemLabel = m ? `Registro: ${m[1].split(/[/\\]/).pop().trim()}` : 'Registro efetuado';
      }

      return { ...entry, kind: 'event', eventType, systemLabel, humanText };
    },

    eventStyle(eventType) {
      const map = {
        'status-active':  { dot: 'bg-blue-500/20 border border-blue-500/40 text-blue-400',   label: 'text-blue-300' },
        'status-waiting': { dot: 'bg-amber-500/20 border border-amber-500/40 text-amber-400', label: 'text-amber-300' },
        'status-closing': { dot: 'bg-violet-500/20 border border-violet-500/40 text-violet-400',   label: 'text-violet-300' },
        'status-closed':  { dot: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400', label: 'text-emerald-300' },
        'transfer':       { dot: 'bg-violet-500/20 border border-violet-500/40 text-violet-400', label: 'text-violet-300' },
        'assign':         { dot: 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400', label: 'text-indigo-300' },
        'attachment':     { dot: 'bg-white/5 border border-white/10 text-gray-500',           label: 'text-gray-400' },
        'time':           { dot: 'bg-white/5 border border-white/10 text-gray-500',           label: 'text-gray-500' },
        'reopen':         { dot: 'bg-orange-500/20 border border-orange-500/40 text-orange-400', label: 'text-orange-300' },
        'register':       { dot: 'bg-white/5 border border-white/10 text-gray-500',           label: 'text-gray-400' },
        'info':           { dot: 'bg-white/5 border border-white/10 text-gray-500',           label: 'text-gray-400' },
      };
      return map[eventType] || map['info'];
    },

    get parsedHistory() {
      const parsed = this.ticketHistory.slice().reverse().map(e => this.parseHistoryEntry(e));
      if (['Encerrado', 'Cancelado'].includes(this.selectedTicket?.situacao)) {
        const idx = parsed.findIndex(e => e.eventType === 'status-closing');
        if (idx !== -1) parsed[idx] = { ...parsed[idx], eventType: 'status-closed', systemLabel: 'Encerrado' };
      }
      // Eventos de encerramento (aguardando/encerrado) devem sempre aparecer no topo.
      // O Qualitor pode gerar o cdacompanhamento do evento de sistema com ID menor que
      // o comentário do atendente adicionado na mesma ação, causando inversão na ordenação.
      const closingIdx = parsed.findIndex(e =>
        e.eventType === 'status-closing' || e.eventType === 'status-closed'
      );
      if (closingIdx > 0) {
        const [ev] = parsed.splice(closingIdx, 1);
        parsed.unshift(ev);
      }
      return parsed;
    },

    cleanText(str) {
      if (!str) return '';
      // Decodifica entidades HTML (ex: &gt;&gt; → >>)
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      let out = txt.value;
      // Remove ponto inicial isolado (artefato do Qualitor em alguns campos)
      out = out.replace(/^\.\s*/, '');
      return out.trim();
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

    async fetchAttachments() {
      if (!this.selectedTicket) return;
      this.loadingAttachments = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/attachments`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          const data = await res.json();
          this.ticketAttachments = data.attachments || [];
        } else {
          showToast('Erro ao buscar anexos', 'error');
        }
      } catch { showToast('Erro ao buscar anexos', 'error'); }
      finally { this.loadingAttachments = false; }
    },

    async downloadAttachment(nrsequencia, nmanexo, cdclassificacao, filename) {
      const token = localStorage.getItem('access_token');
      try {
        const params = new URLSearchParams({ nmanexo, cdclassificacao: cdclassificacao || '' });
        const res = await fetch(
          `/api/qualitor/tickets/${this.selectedTicket.id}/attachments/${nrsequencia}/download?${params}`,
          { headers: { Authorization: 'Bearer ' + token } }
        );
        if (!res.ok) { showToast('Erro ao baixar arquivo', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } catch { showToast('Erro ao baixar arquivo', 'error'); }
    },

    async uploadAttachment(event) {
      const file = event.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file, file.name);
      const token = localStorage.getItem('access_token');
      this.uploadLoading = true;
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.selectedTicket.id}/attachments`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao fazer upload', 'error'); return; }
        showToast('Arquivo enviado com sucesso', 'success');
        await this.fetchAttachments();
      } catch { showToast('Erro ao fazer upload', 'error'); }
      finally { this.uploadLoading = false; event.target.value = ''; }
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
