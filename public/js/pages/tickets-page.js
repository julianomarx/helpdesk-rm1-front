function ticketsPage() {
  return {
    loadingTickets: false,
    ticketList: [],

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
      category_id: ''
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

    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('pt-BR');
    },

    changeStatus(status) {
      this.ticketFilters.status = status;
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
      const text = `
        *CHAMADO #${ticket.id}*
        *Hotel* ${ticket.hotel?.code || ''} - ${ticket.hotel?.name || ''}
        *Título* ${ticket.title}

        *Categoria* ${ticket.category?.name || ''}
        *Subcategoria* ${ticket.subcategory?.name || ''}
        *Prioridade* ${ticket.priority}
        *Status* ${ticket.progress}

        *Descrição*
        ${ticket.description}
      `;
      try {
        await navigator.clipboard.writeText(text);
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
        showToast("Chamado aberto com sucesso!", "success");
        this.resetNewTicketModal();
        this.showCreateTicketModal = false;
        await this.getTickets();
      } catch {
        showToast("Erro ao abrir chamado", "error");
      }
    }
  };
}
