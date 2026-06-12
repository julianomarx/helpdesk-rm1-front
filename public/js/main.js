document.addEventListener("alpine:init", () => {
  const API_BASE = "/api";

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

    async navigate(page) {
      this.currentPage = page;
      const container = document.getElementById("page-container");
      if (!container) return;
      try {
        const res = await fetch(`/templates/${page}.html`);
        if (!res.ok) throw new Error("Template não encontrado");
        container.innerHTML = await res.text();
        Alpine.initTree(container);
      } catch (err) {
        container.innerHTML = `<p class="text-red-500 p-4">Erro ao carregar página: ${err.message}</p>`;
      }
    },

    async init() {
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
        this.categories    = payload.categories    || [];
        this.subcategories = payload.subcategories || [];
        this.tokenExpire   = payload.exp;

        this.currentView = "dashboard";
        await this.navigate(this.currentPage);
        sessionWatcher.start();

      } catch {
        localStorage.removeItem("access_token");
        this.currentView = "login";
      }
    }
  });
});
