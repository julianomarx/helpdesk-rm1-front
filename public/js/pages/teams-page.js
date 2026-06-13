function teamsPage() {
  return {
    teams: [],
    loading: false,

    async init() {
      await this.load();
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
      } catch {
        showToast('Erro ao carregar equipes', 'error');
      } finally {
        this.loading = false;
      }
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
