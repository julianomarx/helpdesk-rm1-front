function hotelsPage() {
  return {
    hotelList: [],
    loadingHotels: false,
    hotelSearch: '',

    showCreateModal: false,
    showEditModal: false,
    deleteConfirmId: null,

    newHotel: { code: '', name: '' },

    selectedHotel: null,
    editForm: { code: '', name: '' },
    editEnabled: false,

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

    openEditModal(hotel) {
      this.selectedHotel = hotel;
      this.editForm = { code: hotel.code, name: hotel.name };
      this.editEnabled = false;
      this.showEditModal = true;
    },

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

    async saveHotel() {
      if (!this.editForm.code?.trim() || !this.editForm.name?.trim()) {
        showToast('Código e nome são obrigatórios', 'error');
        return;
      }
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/hotels/${this.selectedHotel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ code: this.editForm.code.trim(), name: this.editForm.name.trim() })
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || 'Erro ao atualizar hotel', 'error');
          return;
        }
        showToast('Hotel atualizado!', 'success');
        this.showEditModal = false;
        await this.fetchHotels();
      } catch {
        showToast('Erro ao atualizar hotel', 'error');
      }
    },

    async deleteHotel() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/hotels/${this.selectedHotel.id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || 'Erro ao excluir hotel', 'error');
          return;
        }
        showToast('Hotel excluído', 'success');
        this.showEditModal = false;
        this.deleteConfirmId = null;
        await this.fetchHotels();
      } catch {
        showToast('Erro ao excluir hotel', 'error');
      }
    },
  };
}
