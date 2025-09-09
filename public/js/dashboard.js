function dashboard() {
  return {
    currentPage: "dashboard",
    ticketList: [],

    menus: {
      admin: [
        { label: "Dashboard", page: "dashboard", css: "/css/dashboard.css" },
        { label: "Usuários", page: "users", css: "/css/users.css" },
        { label: "Chamados", page: "tickets", css: "/css/tickets.css" },
      ],
      agent: [
        { label: "Chamados", page: "tickets", css: "/css/tickets.css" },
      ],
      client_manager: [
        { label: "Dashboard", page: "dashboard", css: "/css/dashboard.css" },
        { label: "Abrir chamado", page: "tickets", css: "/css/tickets.css" },
      ],
      client_receptionist: [
        { label: "Abrir chamado", page: "tickets", css: "/css/tickets.css" },
      ],
    },

    goTo(page, cssPath) {
      if (this.currentPage === page) return
      this.currentPage = page;
      if (cssPath) this.loadCss(cssPath);
      if (page === "tickets") this.getTickets();
    },

    loadCss(href) {
      // Remove todos os CSS dinâmicos anteriores
      document.querySelectorAll('link[data-dynamic="true"]').forEach(link => link.remove());

      // Adiciona o CSS novo
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.dynamic = "true"; // marca como dinâmico
      document.head.appendChild(link);
    },

    logout() {
      localStorage.removeItem("access_token");
      Alpine.store("app").currentView = "login";
    },

    async getTickets() {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          let res = await fetch("http://127.0.0.1:8000/tickets", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
          });

          if (!res.ok) {
            throw new Error("Erro ao buscar tickets");
          }

          const data = await res.json();
          console.log("Tickets recebidos: ", data)
          this.ticketList = data;
        } catch (e) {

        }
      } else {
        Alpine.store("app").currentView = "login";
      }
    }
  };
}
