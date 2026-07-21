function ticketsPage() {
  return {
    loadingTickets: false,
    ticketList: [],
    ticketStats: null,

    pagination: {
      page: 1,
      pageSize: 50,
      total: 0,
      pages: 0
    },

    ticketFilters: {
      status: 'open',
      search: '',
      hotel_id: '',
      progress: '',
      priority: '',
      team_id: '',
      category_id: '',
      mine: false
    },

    showCreateTicketModal: false,

    newTicket: {
      title: '',
      description: '',
      priority: 'low',
      hotelId: '',
      categoryId: '',
      subcategoryId: ''
    },
    pendingFiles: [],

    get progressBadges() {
      const p = this.ticketStats?.por_progress || {};
      const defs = [
        { key: 'waiting',               label: 'Aguardando',      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
        { key: 'in_progress',           label: 'Em atendimento',  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
        { key: 'feedback',              label: 'Feedback',        cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
        { key: 'awaiting_confirmation', label: 'Ag. confirmação', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
        { key: 'scheduled_visit',       label: 'Visita agend.',   cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
        { key: 'done',                  label: 'Concluído',       cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
      ];
      return defs.filter(d => (p[d.key] || 0) > 0).map(d => ({ ...d, count: p[d.key] || 0 }));
    },

    async fetchStats() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/tickets/stats', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) this.ticketStats = await res.json();
      } catch {}
    },

    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('pt-BR');
    },

    changeStatus(status) {
      this.ticketFilters.status = status;
      this.pagination.page = 1;
      this.getTickets();
      if (status === 'open') this.fetchStats();
    },

    toggleMine() {
      this.ticketFilters.mine = !this.ticketFilters.mine;
      this.pagination.page = 1;
      this.getTickets();
    },

    async nextPage() {
      if (this.pagination.page >= this.pagination.pages) return;
      this.pagination.page++;
      await this.getTickets();
    },

    async previousPage() {
      if (this.pagination.page <= 1) return;
      this.pagination.page--;
      await this.getTickets();
    },

    async getTickets(resetPage = false) {
      if (!validateToken()) return;
      if (resetPage) this.pagination.page = 1;

      this.loadingTickets = true;
      const token = localStorage.getItem("access_token");

      try {
        const params = new URLSearchParams();
        params.append('status',    this.ticketFilters.status);
        params.append('page',      this.pagination.page);
        params.append('page_size', this.pagination.pageSize);
        if (this.ticketFilters.search)      params.append('search',      this.ticketFilters.search);
        if (this.ticketFilters.progress)    params.append('progress',    this.ticketFilters.progress);
        if (this.ticketFilters.priority)    params.append('priority',    this.ticketFilters.priority);
        if (this.ticketFilters.team_id)     params.append('team_id',     this.ticketFilters.team_id);
        if (this.ticketFilters.category_id) params.append('category_id', this.ticketFilters.category_id);
        if (this.ticketFilters.hotel_id)    params.append('hotel_id',    this.ticketFilters.hotel_id);
        if (this.ticketFilters.mine)        params.append('mine',        'true');

        const res = await fetch(`/api/tickets/?${params.toString()}`, {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        this.ticketList      = data.items;
        this.pagination.total = data.total;
        this.pagination.pages = data.pages;

      } catch {
        showToast('Erro ao carregar tickets', 'error');
      } finally {
        this.loadingTickets = false;
      }
    },

    async viewTicket(ticket) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/${ticket.id}`, {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        Alpine.store("app").selectedTicket = await res.json();
        await Alpine.store("app").navigate("ticket-view");
      } catch {
        showToast("Erro ao carregar ticket", "error");
      }
    },

    async copyTicket(ticket) {
      const priorityLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' }[ticket.priority] || ticket.priority;
      const progressLabel = {
        waiting: 'Aguardando',
        in_progress: 'Em atendimento',
        feedback: 'Retorno',
        awaiting_confirmation: 'Ag. confirmação',
        scheduled_visit: 'Visita agendada',
        done: 'Concluído'
      }[ticket.progress] || ticket.progress;

      const text = [
        `*CHAMADO #${ticket.id}*`,
        `*Hotel* ${ticket.hotel?.code || ''} - ${ticket.hotel?.name || ''}`,
        `*Título* ${ticket.title}`,
        ``,
        `*Categoria* ${ticket.category?.name || '-'}`,
        `*Subcategoria* ${ticket.subcategory?.name || '-'}`,
        `*Prioridade* ${priorityLabel}`,
        `*Status* ${progressLabel}`,
        ``,
        `*Descrição*`,
        `${ticket.description || ''}`,
      ].join('\n');

      const writeText = async (t) => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(t);
          return;
        }
        const el = document.createElement('textarea');
        el.value = t;
        el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
        document.body.appendChild(el);
        el.focus();
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('execCommand failed');
      };

      try {
        await writeText(text);
        showToast(`Ticket #${ticket.id} copiado`, 'success');
      } catch {
        showToast('Erro ao copiar ticket', 'error');
      }
    },

    resetNewTicketModal() {
      this.newTicket = {
        title: '',
        description: '',
        priority: 'low',
        hotelId: '',
        categoryId: '',
        subcategoryId: ''
      };
      this.pendingFiles = [];
    },

    addPendingFiles(files) {
      const allowed = new Set(['.jpg','.jpeg','.png','.gif','.webp','.pdf','.doc','.docx','.xls','.xlsx','.txt','.csv','.zip']);
      const maxSize = 10 * 1024 * 1024;
      for (const f of Array.from(files)) {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (!allowed.has(ext)) { showToast(`Tipo não permitido: ${f.name}`, 'error'); continue; }
        if (f.size > maxSize) { showToast(`Arquivo muito grande (máx 10 MB): ${f.name}`, 'error'); continue; }
        if (this.pendingFiles.some(p => p.name === f.name && p.size === f.size)) continue;
        this.pendingFiles.push(f);
      }
    },

    removePendingFile(index) {
      this.pendingFiles.splice(index, 1);
    },

    async submitCreateTicket() {
      const t = this.newTicket;
      if (!t.title || !t.description || !t.hotelId || !t.categoryId || !t.subcategoryId) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
      }
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");

      if (t.title.length > 100) {
        showToast("Título muito longo (max 100 caracteres)", "error");
        return;
      }

      try {
        const res = await fetch('/api/tickets/', {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({
            title:          t.title,
            description:    t.description,
            priority:       t.priority,
            category_id:    t.categoryId,
            subcategory_id: t.subcategoryId,
            hotel_id:       t.hotelId
          })
        });
        if (!res.ok) { showToast("Erro ao criar chamado", "error"); return; }

        const created = await res.json();

        if (this.pendingFiles.length > 0) {
          let uploaded = 0, failed = 0;
          for (const file of this.pendingFiles) {
            const fd = new FormData();
            fd.append('file', file);
            try {
              const ar = await fetch(`/api/tickets/${created.id}/attachments`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: fd
              });
              if (ar.ok) uploaded++; else failed++;
            } catch { failed++; }
          }
          if (failed > 0)
            showToast(`Chamado aberto. ${uploaded} anexo(s) enviado(s), ${failed} falhou.`, 'warning');
          else
            showToast(`Chamado aberto com ${uploaded} anexo(s)!`, 'success');
        } else {
          showToast("Chamado aberto com sucesso!", "success");
        }

        this.resetNewTicketModal();
        this.showCreateTicketModal = false;
        await this.getTickets();
      } catch {
        showToast("Erro ao abrir chamado", "error");
      }
    }
  };
}
