function qualitorTicketModal() {
  return {
    open: false,
    loading: false,
    ticket: null,
    history: [],
    tab: 'detalhes',
    readOnly: false,

    // Ações
    actionMode: null,
    actionNota: '',
    actionLoading: false,

    // Acompanhamento
    novoAcomp: { descricao: '', solicitante: 'N', privado: 'N', loading: false },

    // Transferência de equipe
    transferMode: false,
    transferEquipe: '',
    transferLoading: false,

    // Responsável interno
    assignInternMode: false,
    assignInternAgentId: '',
    assignInternLoading: false,
    agentList: [],

    // Visita
    visitMode: false,
    visitDate: '',
    visitTime: '',
    visitLoading: false,

    // Anexos
    attachments: [],
    loadingAttachments: false,
    uploadLoading: false,

    init() {
      window._qtModalInstance = this;
    },

    async openTicket(id, opts = {}) {
      this.readOnly = opts.readOnly === true;
      this.open = true;
      this.loading = true;
      this.ticket = null;
      this.history = [];
      this.tab = 'detalhes';
      this.actionMode = null;
      this.actionNota = '';
      this.novoAcomp = { descricao: '', solicitante: 'N', privado: 'N', loading: false };
      this.transferMode = false;
      this.transferEquipe = '';
      this.assignInternMode = false;
      this.assignInternAgentId = '';
      this.visitMode = false;
      this.visitDate = '';
      this.visitTime = '';
      this.attachments = [];

      const token = localStorage.getItem('access_token');
      const h = { Authorization: 'Bearer ' + token };
      try {
        const [tRes, hRes] = await Promise.all([
          fetch(`/api/qualitor/tickets/${id}`, { headers: h }),
          fetch(`/api/qualitor/tickets/${id}/history`, { headers: h }),
        ]);
        if (!tRes.ok) { showToast('Chamado não encontrado', 'error'); this.open = false; return; }
        this.ticket = await tRes.json();
        if (hRes.ok) { const d = await hRes.json(); this.history = d.history || []; }
      } catch {
        showToast('Erro ao carregar chamado Qualitor', 'error');
        this.open = false;
      } finally {
        this.loading = false;
      }
    },

    close() {
      this.open = false;
      this.ticket = null;
      this.history = [];
      this.actionMode = null;
      this.novoAcomp = { descricao: '', solicitante: 'N', privado: 'N', loading: false };
      this.transferMode = false;
      this.assignInternMode = false;
      this.visitMode = false;
      this.attachments = [];
    },

    async _refresh() {
      if (!this.ticket?.id) return;
      const token = localStorage.getItem('access_token');
      const h = { Authorization: 'Bearer ' + token };
      const [tRes, hRes] = await Promise.all([
        fetch(`/api/qualitor/tickets/${this.ticket.id}`, { headers: h }),
        fetch(`/api/qualitor/tickets/${this.ticket.id}/history`, { headers: h }),
      ]);
      if (tRes.ok) this.ticket = await tRes.json();
      if (hRes.ok) { const d = await hRes.json(); this.history = d.history || []; }
    },

    historyLoading: false,

    async abrirHistorico() {
      this.tab = 'historico';
      if (!this.ticket?.id) return;
      this.historyLoading = true;
      const token = localStorage.getItem('access_token');
      const h = { Authorization: 'Bearer ' + token };
      try {
        await fetch(`/api/qualitor/tickets/${this.ticket.id}/refresh`, { method: 'POST', headers: h });
        const hRes = await fetch(`/api/qualitor/tickets/${this.ticket.id}/history`, { headers: h });
        if (hRes.ok) { const d = await hRes.json(); this.history = d.history || []; }
      } catch { /* mantém histórico anterior em caso de falha */ }
      finally { this.historyLoading = false; }
    },

    // ── Iniciar atendimento ──────────────────────────────────────────────────
    async iniciarAtendimento() {
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      const user = Alpine.store('app');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/start`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nota: this.actionNota,
            responsavel_interno_id: parseInt(user.userId) || null,
            responsavel_interno_nome: user.userName || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao iniciar', 'error'); return; }
        this.actionMode = null; this.actionNota = '';
        await this._refresh();
        showToast('Atendimento iniciado!', 'success');
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.actionLoading = false; }
    },

    // ── Encerrar chamado ─────────────────────────────────────────────────────
    async encerrarChamado() {
      if (!this.actionNota.trim()) { showToast('Informe a resolução antes de encerrar', 'error'); return; }
      this.actionLoading = true;
      const token = localStorage.getItem('access_token');
      const user = Alpine.store('app');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/close`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nota: this.actionNota,
            interno_user_id: parseInt(user.userId) || null,
            interno_user_nome: user.userName || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao encerrar', 'error'); return; }
        this.actionMode = null; this.actionNota = '';
        await this._refresh();
        showToast('Chamado encerrado!', 'success');
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.actionLoading = false; }
    },

    // ── Acompanhamento ───────────────────────────────────────────────────────
    async enviarAcompanhamento() {
      if (!this.novoAcomp.descricao.trim()) { showToast('Texto obrigatório', 'error'); return; }
      this.novoAcomp.loading = true;
      const token = localStorage.getItem('access_token');
      const user = Alpine.store('app');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/history`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricao: this.novoAcomp.descricao,
            idsolicitante: this.novoAcomp.solicitante,
            idprivado: this.novoAcomp.privado,
            interno_user_id: parseInt(user.userId) || null,
            interno_user_nome: user.userName || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao enviar acompanhamento', 'error'); return; }
        this.novoAcomp.descricao = '';
        this.novoAcomp.solicitante = 'N';
        this.novoAcomp.privado = 'N';
        if (data.history?.length) this.history = data.history;
        else await this._refresh();
        showToast('Acompanhamento enviado!', 'success');
      } catch { showToast('Erro inesperado', 'error'); }
      finally { this.novoAcomp.loading = false; }
    },

    // ── Transferir equipe ────────────────────────────────────────────────────
    get equipeDestinoOptions() {
      const matrix = {
        'rm1':            ['ATRIO - INFRA', 'Concept Prime Back', 'Capere', 'Concept Prime PDV', 'Netlogic', 'Unic System', 'TCPOS', 'ATRIO - SISTEMAS'],
        'rm1 sap':        ['ATRIO - INFRA', 'Unic System', 'ATRIO - SISTEMAS', 'Cobrança', 'MDM', 'COE', 'Fiscal'],
        'atrio - sistemas': ['ATRIO - INFRA', 'Capere', 'Unic System', 'RM1'],
      };
      const atual = (this.ticket?.equipe || '').trim().toLowerCase();
      return (matrix[atual] || []).map(nm => ({ value: nm, label: nm }));
    },

    async transferirChamado() {
      if (!this.transferEquipe) { showToast('Selecione a equipe de destino', 'error'); return; }
      this.transferLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/transfer`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nmequipe: this.transferEquipe }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao transferir', 'error'); return; }
        if (data.ticket) this.ticket = data.ticket;
        if (data.history?.length) this.history = data.history;
        else await this._refresh();
        this.transferMode = false;
        this.transferEquipe = '';
        showToast(`Transferido para ${data.nova_equipe || this.transferEquipe}`, 'success');
      } catch { showToast('Erro ao transferir', 'error'); }
      finally { this.transferLoading = false; }
    },

    // ── Responsável interno ──────────────────────────────────────────────────
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
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/assign-interno`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: parseInt(this.assignInternAgentId), user_nome: agent?.name || '', motivo: 'transferencia_interna' }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao transferir responsável', 'error'); return; }
        this.ticket.responsavel_interno_id   = data.responsavel_interno_id;
        this.ticket.responsavel_interno_nome = data.responsavel_interno_nome;
        this.assignInternMode = false;
        this.assignInternAgentId = '';
        showToast(`Responsável: ${data.responsavel_interno_nome}`, 'success');
      } catch { showToast('Erro ao transferir responsável', 'error'); }
      finally { this.assignInternLoading = false; }
    },

    // ── Visita agendada ──────────────────────────────────────────────────────
    async agendarVisita() {
      if (!this.visitDate) { showToast('Selecione a data da visita', 'error'); return; }
      this.visitLoading = true;
      const token = localStorage.getItem('access_token');
      const dateTimeStr = `${this.visitDate}T${this.visitTime || '09:00'}:00`;
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/schedule-visit`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ date_time: dateTimeStr }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao agendar visita', 'error'); return; }
        this.ticket.scheduled_visit_at = data.scheduled_visit_at;
        this.visitMode = false; this.visitDate = '';
        if (data.history?.length) this.history = data.history;
        else await this._refresh();
        showToast('Visita agendada!', 'success');
      } catch { showToast('Erro ao agendar visita', 'error'); }
      finally { this.visitLoading = false; }
    },

    // ── Anexos ───────────────────────────────────────────────────────────────
    async fetchAttachments() {
      if (!this.ticket) return;
      this.loadingAttachments = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/attachments`, { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) { const d = await res.json(); this.attachments = d.attachments || []; }
        else showToast('Erro ao buscar anexos', 'error');
      } catch { showToast('Erro ao buscar anexos', 'error'); }
      finally { this.loadingAttachments = false; }
    },

    async downloadAttachment(nrsequencia, nmanexo, cdclassificacao, filename) {
      const token = localStorage.getItem('access_token');
      try {
        const params = new URLSearchParams({ nmanexo, cdclassificacao: cdclassificacao || '' });
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/attachments/${nrsequencia}/download?${params}`, { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) { showToast('Erro ao baixar arquivo', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
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
        const res = await fetch(`/api/qualitor/tickets/${this.ticket.id}/attachments`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao fazer upload', 'error'); return; }
        showToast('Arquivo enviado!', 'success');
        await this.fetchAttachments();
      } catch { showToast('Erro ao fazer upload', 'error'); }
      finally { this.uploadLoading = false; event.target.value = ''; }
    },

    // ── Histórico parseado (igual qualitor page) ─────────────────────────────
    cleanText(str) {
      if (!str) return '';
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      let out = txt.value;
      out = out.replace(/^\.\s*/, '');
      return out.trim();
    },

    parseHistoryEntry(entry) {
      const raw = this.cleanText(entry.descricao || '');
      if (!raw.startsWith('>>')) {
        return { ...entry, kind: 'comment', eventType: null, systemLabel: null, humanText: raw };
      }
      const inner = raw.replace(/^>>/, '').replace(/<<$/, '').trim();
      const split = inner.indexOf('<<');
      let sysText = split > -1 ? inner.substring(0, split).trim() : inner;
      const humanText = split > -1 ? inner.substring(split + 2).trim() || null : null;
      let eventType = 'info', systemLabel = sysText;

      if (/^Chamado em atendimento/i.test(sysText))              { eventType = 'status-active';  systemLabel = 'Em atendimento'; }
      else if (/^Chamado aguardando atendimento/i.test(sysText)) { eventType = 'status-waiting'; systemLabel = 'Aguardando atendimento'; }
      else if (/^Chamado aguardando confirmação/i.test(sysText)) { eventType = 'status-closing'; systemLabel = 'Aguardando confirmação de encerramento'; }
      else if (/^Chamado repassado para outra equipe/i.test(sysText)) {
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
        'status-active':  { dot: 'bg-blue-500/20 border border-blue-500/40 text-blue-400',     label: 'text-blue-300' },
        'status-waiting': { dot: 'bg-amber-500/20 border border-amber-500/40 text-amber-400',   label: 'text-amber-300' },
        'status-closing': { dot: 'bg-violet-500/20 border border-violet-500/40 text-violet-400', label: 'text-violet-300' },
        'status-closed':  { dot: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400', label: 'text-emerald-300' },
        'transfer':       { dot: 'bg-violet-500/20 border border-violet-500/40 text-violet-400', label: 'text-violet-300' },
        'assign':         { dot: 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400', label: 'text-indigo-300' },
        'attachment':     { dot: 'bg-white/5 border border-white/10 text-gray-500',             label: 'text-gray-400' },
        'time':           { dot: 'bg-white/5 border border-white/10 text-gray-500',             label: 'text-gray-500' },
        'reopen':         { dot: 'bg-orange-500/20 border border-orange-500/40 text-orange-400', label: 'text-orange-300' },
        'register':       { dot: 'bg-white/5 border border-white/10 text-gray-500',             label: 'text-gray-400' },
        'info':           { dot: 'bg-white/5 border border-white/10 text-gray-500',             label: 'text-gray-400' },
      };
      return map[eventType] || map['info'];
    },

    get parsedHistory() {
      const parsed = this.history.slice().reverse().map(e => this.parseHistoryEntry(e));
      if (['Encerrado', 'Cancelado'].includes(this.ticket?.situacao)) {
        const idx = parsed.findIndex(e => e.eventType === 'status-closing');
        if (idx !== -1) parsed[idx] = { ...parsed[idx], eventType: 'status-closed', systemLabel: 'Encerrado' };
      }
      const closingIdx = parsed.findIndex(e => e.eventType === 'status-closing' || e.eventType === 'status-closed');
      if (closingIdx > 0) { const [ev] = parsed.splice(closingIdx, 1); parsed.unshift(ev); }
      return parsed;
    },

    // ── Helpers ──────────────────────────────────────────────────────────────
    situacaoBadge(s) {
      if (!s) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      const sl = s.toLowerCase();
      if (sl.includes('encerrado') || sl.includes('solucionado')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      if (sl.includes('atendimento')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      if (sl.includes('aguardando')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      if (sl.includes('cancelado')) return 'bg-red-500/20 text-red-400 border-red-500/30';
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    },

    severidadeBadge(s) {
      if (!s) return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      if (s.startsWith('P1')) return 'bg-red-500/20 text-red-300 border-red-500/30';
      if (s.startsWith('P2')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      if (s.startsWith('P3')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    },

    formatDate(val) {
      if (!val) return '—';
      try { return dayjs(val).format('DD/MM/YYYY HH:mm'); } catch { return val; }
    },

    get isClosed() {
      const s = (this.ticket?.situacao || '').toLowerCase();
      return s.includes('encerrado') || s.includes('cancelado');
    },

    get isAdminOrAgent() {
      return ['admin', 'agent'].includes(Alpine.store('app').role);
    },
  };
}
