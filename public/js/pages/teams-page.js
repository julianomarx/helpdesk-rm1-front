function teamsPage() {
  return {
    teams: [],
    allAgents: [],
    loading: false,

    // Create team
    showCreateModal: false,
    newTeamName: '',
    creating: false,

    // Add member panel state: { [teamId]: { open: bool, search: '', adding: bool } }
    memberPanel: {},

    async init() {
      await Promise.all([this.load(), this.loadAgents()]);
    },

    async load() {
      if (!validateToken()) return;
      this.loading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/teams/overview', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        this.teams = await res.json();
        // init memberPanel entries for new teams
        this.teams.forEach(t => {
          if (!this.memberPanel[t.id]) {
            this.memberPanel[t.id] = { open: false, search: '', adding: false };
          }
        });
      } catch {
        showToast('Erro ao carregar equipes', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadAgents() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/users/?role=agent&page_size=100', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        const agents = data.items || [];
        // also fetch admins
        const res2 = await fetch('/api/users/?role=admin&page_size=100', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data2 = res2.ok ? await res2.json() : {};
        const admins = data2.items || [];
        const seen = new Set();
        this.allAgents = [...agents, ...admins].filter(u => {
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
      } catch {}
    },

    availableAgents(teamId) {
      const team = this.teams.find(t => t.id === teamId);
      if (!team) return [];
      const memberIds = new Set(team.members.map(m => m.id));
      const q = (this.memberPanel[teamId]?.search || '').toLowerCase();
      return this.allAgents.filter(a => !memberIds.has(a.id) && (!q || a.name.toLowerCase().includes(q)));
    },

    async createTeam() {
      if (!this.newTeamName.trim()) return;
      this.creating = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/teams/', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.newTeamName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Erro ao criar equipe', 'error'); return; }
        showToast('Equipe criada', 'success');
        this.showCreateModal = false;
        this.newTeamName = '';
        await this.load();
      } catch {
        showToast('Erro ao criar equipe', 'error');
      } finally {
        this.creating = false;
      }
    },

    async deleteTeam(teamId, teamName) {
      if (!confirm(`Excluir equipe "${teamName}"? Os membros não serão deletados, apenas desassociados.`)) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/teams/${teamId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) { showToast('Erro ao excluir equipe', 'error'); return; }
        showToast('Equipe excluída', 'success');
        await this.load();
      } catch {
        showToast('Erro ao excluir equipe', 'error');
      }
    },

    async addMember(teamId, userId) {
      if (!this.memberPanel[teamId]) return;
      this.memberPanel[teamId].adding = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/teams/${teamId}/add-user/${userId}/`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) { showToast('Erro ao adicionar membro', 'error'); return; }
        showToast('Membro adicionado', 'success');
        this.memberPanel[teamId].search = '';
        await this.load();
      } catch {
        showToast('Erro ao adicionar membro', 'error');
      } finally {
        if (this.memberPanel[teamId]) this.memberPanel[teamId].adding = false;
      }
    },

    async removeMember(teamId, userId, userName) {
      if (!confirm(`Remover "${userName}" da equipe?`)) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/teams/${teamId}/remove-user/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) { showToast('Erro ao remover membro', 'error'); return; }
        showToast('Membro removido', 'success');
        await this.load();
      } catch {
        showToast('Erro ao remover membro', 'error');
      }
    },

    toggleMemberPanel(teamId) {
      if (!this.memberPanel[teamId]) this.memberPanel[teamId] = { open: false, search: '', adding: false };
      this.memberPanel[teamId].open = !this.memberPanel[teamId].open;
    },

    onlineCount(team) {
      return team.members.filter(m => m.online).length;
    },

    initials(name) {
      return (name || 'U')
        .split(' ')
        .filter(p => p.length)
        .map(p => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    },

    roleLabel(role) {
      const labels = {
        admin: 'Administrador',
        agent: 'Atendente',
        client_manager: 'Gerente',
        client_receptionist: 'Recepcionista',
      };
      return labels[role] || role;
    },
  };
}
