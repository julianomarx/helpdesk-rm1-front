function hotelsPage() {
  return {
    hotelList: [],
    loadingHotels: false,
    hotelSearch: '',

    // ── Detail view ───────────────────────────────────────────────────
    detailHotel: null,
    detailTab: 'info',
    editEnabled: false,
    editForm: { code: '', name: '' },
    deleteConfirm: false,
    statsLoading: false,
    stats: null,

    // ── Create modal ──────────────────────────────────────────────────
    showCreateModal: false,
    newHotel: { code: '', name: '' },

    async init() {
      await this.fetchHotels();
    },

    get filteredHotels() {
      if (!this.hotelSearch.trim()) return this.hotelList;
      const q = this.hotelSearch.toLowerCase();
      return this.hotelList.filter(h =>
        h.name.toLowerCase().includes(q) || (h.code || '').toLowerCase().includes(q)
      );
    },

    async fetchHotels() {
      if (!validateToken()) return;
      this.loadingHotels = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/hotels/', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        this.hotelList = await res.json();
      } catch {
        showToast('Erro ao carregar hotéis', 'error');
      } finally {
        this.loadingHotels = false;
      }
    },

    // ── Detail navigation ─────────────────────────────────────────────
    openDetail(hotel) {
      this.detailHotel = hotel;
      this.detailTab = 'info';
      this.editEnabled = false;
      this.deleteConfirm = false;
      this.editForm = { code: hotel.code, name: hotel.name };
      this.stats = null;
    },

    closeDetail() {
      this.detailHotel = null;
      this.stats = null;
    },

    async switchDetailTab(tab) {
      this.detailTab = tab;
      if (tab === 'dashboard' && !this.stats) {
        await this.loadStats();
      }
    },

    async loadStats() {
      if (!this.detailHotel || !validateToken()) return;
      this.statsLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/hotels/${this.detailHotel.id}/stats`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        this.stats = await res.json();
      } catch {
        showToast('Erro ao carregar estatísticas', 'error');
      } finally {
        this.statsLoading = false;
      }
    },

    // ── Save / Delete ─────────────────────────────────────────────────
    async saveHotel() {
      if (!this.editForm.code?.trim() || !this.editForm.name?.trim()) {
        showToast('Código e nome são obrigatórios', 'error');
        return;
      }
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/hotels/${this.detailHotel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ code: this.editForm.code.trim(), name: this.editForm.name.trim() })
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || 'Erro ao atualizar hotel', 'error');
          return;
        }
        const updated = await res.json();
        this.detailHotel = updated;
        this.editEnabled = false;
        showToast('Hotel atualizado!', 'success');
        await this.fetchHotels();
      } catch {
        showToast('Erro ao atualizar hotel', 'error');
      }
    },

    async deleteHotel() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/hotels/${this.detailHotel.id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || 'Erro ao excluir hotel', 'error');
          return;
        }
        showToast('Hotel excluído', 'success');
        this.closeDetail();
        await this.fetchHotels();
      } catch {
        showToast('Erro ao excluir hotel', 'error');
      }
    },

    // ── Create ────────────────────────────────────────────────────────
    openCreateModal() {
      this.newHotel = { code: '', name: '' };
      this.showCreateModal = true;
    },

    async createHotel() {
      if (!this.newHotel.code?.trim() || !this.newHotel.name?.trim()) {
        showToast('Código e nome são obrigatórios', 'error');
        return;
      }
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/hotels/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ code: this.newHotel.code.trim(), name: this.newHotel.name.trim() })
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || 'Erro ao criar hotel', 'error');
          return;
        }
        showToast('Hotel criado com sucesso!', 'success');
        this.showCreateModal = false;
        await this.fetchHotels();
      } catch {
        showToast('Erro ao criar hotel', 'error');
      }
    },

    // ── Helpers ───────────────────────────────────────────────────────
    progressLabel(p) {
      return {
        waiting:               'Aguardando',
        in_progress:           'Em atendimento',
        feedback:              'Retorno solicitante',
        awaiting_confirmation: 'Aguard. confirmação',
        done:                  'Concluído',
      }[p] || p;
    },

    priorityBadge(priority) {
      return {
        high:   'bg-red-500/20 text-red-300 border-red-500/30',
        medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        low:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
      }[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    },

    priorityLabel(p) {
      return { high: 'Alta', medium: 'Média', low: 'Baixa' }[p] || p;
    },

    statusBadge(status) {
      return {
        open:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
        closed:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      }[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    },

    statusLabel(s) {
      return { open: 'Aberto', closed: 'Encerrado', cancelled: 'Cancelado' }[s] || s;
    },

    timeAgo(dateStr) {
      if (!dateStr) return '—';
      const diff = Date.now() - new Date(dateStr).getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'agora';
      if (h < 24) return `${h}h atrás`;
      return `${Math.floor(h / 24)}d atrás`;
    },

    printReport() {
      window.print();
    },
  };
}
