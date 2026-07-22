document.addEventListener("alpine:init", () => {
  const API_BASE = "/api";

  // ── Bridges globais dos modais ────────────────────────────────────────────
  // Registradas IMEDIATAMENTE aqui; o componente preenche _instance quando carrega.
  window._hdModalInstance = null;
  window._qtModalInstance = null;

  window.openHelpdeskTicket = (id, opts = {}) => {
    if (window._hdModalInstance) window._hdModalInstance.openTicket(id, opts);
    else showToast('Modal ainda carregando, tente novamente', 'warning');
  };
  window.openQualitorTicket = (id, opts = {}) => {
    if (window._qtModalInstance) window._qtModalInstance.openTicket(id, opts);
    else showToast('Modal ainda carregando, tente novamente', 'warning');
  };

  Alpine.store("app", {
    currentView:   "loading",
    currentPage:   "dashboard",
    userId:        '',
    userName:      '',
    userEmail:     '',
    role:          null,
    menus:         [],
    hotels:        [],
    teams:         [],
    categories:    [],
    subcategories: [],
    tokenExpire:   '',
    avatarUrl:     '',
    selectedTicket: null,
    theme:         'dark',
    users:         [],
    _heartbeatInterval: null,
    _navigating: false,

    setTheme(t) {
      this.theme = t;
      localStorage.setItem('theme', t);
      document.documentElement.setAttribute('data-theme', t);
      // Notifica componentes que possam ter charts para refazer com as novas cores
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: t } }));
    },

    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },

    async navigate(page) {
      if (this._navigating) return;
      this._navigating = true;
      this.currentPage = page;
      const container = document.getElementById("page-container");
      if (!container) { this._navigating = false; return; }
      try {
        const res = await fetch(`/templates/${page}.html`, { cache: 'no-store' });
        if (!res.ok) throw new Error("Template não encontrado");
        container.innerHTML = await res.text();
        Alpine.initTree(container);
      } catch (err) {
        container.innerHTML = `<p class="text-red-500 p-4">Erro ao carregar página: ${err.message}</p>`;
      } finally {
        this._navigating = false;
      }
    },

    async init() {
      // Sync store theme with what the anti-FOUC script already applied
      const saved = localStorage.getItem('theme') || 'dark';
      this.theme = saved;
      document.documentElement.setAttribute('data-theme', saved);

      const token = localStorage.getItem("access_token");
      if (!token) {
        this.currentView = "login";
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();

        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userId        = payload.sub;
        this.userName      = payload.name;
        this.userEmail     = payload.email;
        this.role          = payload.role;
        this.avatarUrl     = payload.avatar_url    || '';
        this.menus         = payload.menus         || [];
        this.hotels        = payload.hotels        || [];
        this.teams         = payload.teams         || [];
        this.qualitorTeams = payload.qualitor_teams || [];
        this.categories    = payload.categories    || [];
        this.subcategories = payload.subcategories || [];
        this.tokenExpire   = payload.exp;

        this.currentView = "dashboard";
        const landingPage = ["admin", "agent"].includes(this.role) ? "dashboard" : "tickets";
        await this.navigate(landingPage);

        // Modais globais já estão embutidos em index.html e inicializados pelo Alpine.

        sessionWatcher.start();
        this.startHeartbeat();

      } catch {
        localStorage.removeItem("access_token");
        this.currentView = "login";
      }
    },

    startHeartbeat() {
      if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = setInterval(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }, 5 * 60 * 1000);
    },
  });
});
