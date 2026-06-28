function usersPage() {
  return {
    loadingUsers: false,
    listedUsers: [],
    allTeams: [],

    usersPagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      pages: 0
    },

    userFilters: {
      search: '',
      hotelId: '',
      role: ''
    },

    showUserModal: false,
    showCreateUserModal: false,
    hotelSearch: '',

    editor: {
      enabled: false,
      user: null,
      password: ''
    },

    creator: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
      phone: '',
      hotels: [],
      teams: []
    },

    creatorErrors: {
      name: false,
      email: false,
      password: false,
      confirmPassword: false,
      role: false,
      phone: false
    },

    async init() {
      await this.fetchAllTeams();
    },

    async fetchAllTeams() {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/teams/', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) this.allTeams = await res.json();
      } catch {}
    },

    async fetchUsers(resetPage = false) {
      if (!validateToken()) return;
      this.loadingUsers = true;
      if (resetPage) this.usersPagination.page = 1;
      const token = localStorage.getItem("access_token");

      try {
        const params = new URLSearchParams();
        if (this.userFilters.search)  params.append('search',   this.userFilters.search);
        if (this.userFilters.hotelId) params.append('hotel_id', this.userFilters.hotelId);
        if (this.userFilters.role)    params.append('role',     this.userFilters.role);
        params.append('page',      this.usersPagination.page);
        params.append('page_size', this.usersPagination.pageSize);

        const res = await fetch(`/api/users/?${params.toString()}`, {
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!res.ok) { showToast('Erro ao buscar usuários', 'error'); return; }

        const data = await res.json();
        this.listedUsers           = data.items;
        this.usersPagination.total = data.total;
        this.usersPagination.page  = data.page;
        this.usersPagination.pages = data.pages;

      } catch {
        showToast('Erro ao buscar usuários', 'error');
      } finally {
        this.loadingUsers = false;
      }
    },

    nextUsersPage() {
      if (this.usersPagination.page >= this.usersPagination.pages) return;
      this.usersPagination.page++;
      this.fetchUsers();
    },

    previousUsersPage() {
      if (this.usersPagination.page <= 1) return;
      this.usersPagination.page--;
      this.fetchUsers();
    },

    async selectUser(user) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!res.ok) { showToast("Erro ao buscar usuário", "error"); return; }
        const data = await res.json();
        this.editor.enabled  = false;
        this.editor.password = '';
        this.editor.user = {
          id:     user.id,
          name:   user.name,
          email:  user.email,
          role:   user.role,
          phone:  data.phone || '',
          hotels: [...(data.hotels || [])],
          teams:  [...(data.teams  || [])]
        };
        this.showUserModal = true;
      } catch {
        showToast("Erro ao buscar dados do usuário", "error");
      }
    },

    async saveUser() {
      if (!validateToken()) return;
      if (this.editor.user.role === 'client_manager' && !this.editor.user.phone?.trim()) {
        showToast("Telefone é obrigatório para Gerente.", "error");
        return;
      }
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/users/${this.editor.user.id}`, {
          method: 'PUT',
          headers: { "Authorization": "Bearer " + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:     this.editor.user.name,
            email:    this.editor.user.email,
            password: this.editor.user.password,
            role:     this.editor.user.role,
            phone:    this.editor.user.phone || null
          })
        });
        if (!res.ok) { showToast('Erro ao salvar usuário', 'error'); return; }

        await fetch(`/api/users/${this.editor.user.id}/hotels`, {
          method: 'PUT',
          headers: { "Authorization": "Bearer " + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotel_ids: this.editor.user.hotels.map(h => h.id) })
        });

        await fetch(`/api/users/${this.editor.user.id}/teams`, {
          method: 'PUT',
          headers: { "Authorization": "Bearer " + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_ids: this.editor.user.teams.map(t => t.id) })
        });

        showToast('Usuário atualizado', 'success');
        this.editor.enabled = false;
        await this.fetchUsers();
        this.showUserModal = false;

      } catch {
        showToast('Erro ao salvar usuário', 'error');
      }
    },

    hasTeam(teamId) {
      return this.editor.user?.teams?.some(t => t.id === teamId);
    },

    toggleTeam(team) {
      const exists = this.editor.user.teams.find(t => t.id === team.id);
      if (exists) {
        this.editor.user.teams = this.editor.user.teams.filter(t => t.id !== team.id);
      } else {
        this.editor.user.teams.push(team);
      }
    },

    get filteredHotelsEdit() {
      const query = this.hotelSearch.toLowerCase();
      return Alpine.store('app').hotels.filter(hotel => {
        const exists = this.editor.user?.hotels.find(h => h.id === hotel.id);
        return !exists && (
          hotel.name.toLowerCase().includes(query) ||
          hotel.code.toLowerCase().includes(query)
        );
      });
    },

    addHotel(hotel)    { this.editor.user.hotels.push(hotel); },
    removeHotel(hotel) { this.editor.user.hotels = this.editor.user.hotels.filter(h => h.id !== hotel.id); },

    roleMeta(role) {
      return {
        admin:               { label: 'ADMIN',         class: 'bg-red-500/20 text-red-300' },
        agent:               { label: 'SUPORTE',       class: 'bg-blue-500/20 text-blue-300' },
        client_manager:      { label: 'GERENTE',       class: 'bg-amber-500/20 text-amber-300' },
        client_receptionist: { label: 'RECEPCIONISTA', class: 'bg-emerald-500/20 text-emerald-300' }
      }[role];
    },

    openCreateUserModal() {
      this.resetCreateUser();
      if (Alpine.store('app').role === 'client_manager') {
        this.creator.role = 'client_receptionist';
      }
      this.showCreateUserModal = true;
    },

    resetCreateUser() {
      this.creator = { name: '', email: '', password: '', confirmPassword: '', role: '', phone: '', hotels: [], teams: [] };
      this.creatorErrors = { name: false, email: false, password: false, confirmPassword: false, role: false, phone: false };
      this.hotelSearch = '';
    },

    hasCreatorTeam(teamId) {
      return this.creator.teams?.some(t => t.id === teamId);
    },

    toggleCreatorTeam(team) {
      const exists = this.hasCreatorTeam(team.id);
      if (exists) {
        this.creator.teams = this.creator.teams.filter(t => t.id !== team.id);
      } else {
        this.creator.teams.push(team);
      }
    },

    get filteredHotelsCreate() {
      const query = this.hotelSearch.toLowerCase();
      return Alpine.store('app').hotels.filter(hotel => {
        const exists = this.creator.hotels?.find(h => h.id === hotel.id);
        return !exists && (
          hotel.name.toLowerCase().includes(query) ||
          hotel.code.toLowerCase().includes(query)
        );
      });
    },

    addCreatorHotel(hotel)    { this.creator.hotels.push(hotel); },
    removeCreatorHotel(hotel) { this.creator.hotels = this.creator.hotels.filter(h => h.id !== hotel.id); },

    async createUser() {
      if (!validateToken()) return false;

      this.creatorErrors = { name: false, email: false, password: false, confirmPassword: false, role: false, phone: false };

      if (!this.creator.name || !this.creator.email || !this.creator.password || !this.creator.role) {
        showToast("Preencha todos os campos obrigatórios!", "error");
        return false;
      }
      if (this.creator.password !== this.creator.confirmPassword) {
        showToast("As senhas não coincidem", "error");
        return false;
      }
      const phoneRoles = ['client_manager', 'client_receptionist'];
      if (this.creator.role === 'client_manager' && !this.creator.phone?.trim()) {
        this.creatorErrors.phone = true;
        showToast("Telefone é obrigatório para Gerente.", "error");
        return false;
      }

      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch('/api/users/', {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({
            name:      this.creator.name,
            email:     this.creator.email,
            password:  this.creator.password,
            role:      this.creator.role,
            phone:     phoneRoles.includes(this.creator.role) ? (this.creator.phone?.trim() || null) : null,
            hotel_ids: this.creator.hotels.map(h => h.id),
            team_ids:  this.creator.teams.map(t => t.id)
          })
        });
        if (!res.ok) { showToast("Erro ao criar usuário", "error"); return false; }
        showToast("Usuário criado com sucesso!", "success");
        return await res.json();
      } catch {
        showToast("Erro ao criar usuário", "error");
        return false;
      }
    },

    async submitUserCreation() {
      const created = await this.createUser();
      if (created) {
        this.resetCreateUser();
        this.showCreateUserModal = false;
        this.listedUsers = [created];
      }
    }
  };
}
