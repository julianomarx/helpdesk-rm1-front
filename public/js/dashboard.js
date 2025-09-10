function dashboard() {
  return {
    currentPage: "dashboard",
    ticketList: [],

    //esses menus serão carregados dinamicamente depois quando eu implementar o token
    menus: {
      admin: [
        { label: "Dashboards", page: "dashboard", css: "/css/dashboard.css" },
        { label: "Chamados", page: "tickets", css: "/css/tickets.css" },
        { label: "Atendentes online", page: "agents", css: "/css/agents.css" },
        { label: "Gerenciar usuários", page: "users", css: "/css/users.css" },
        { label: "Gerenciar hotéis", page: "hotels", css: "/css/hotels.css" },
      ],
      agent: [
        { label: "Chamados", page: "tickets", css: "/css/tickets.css" },
      ],
      client_manager: [
        { label: "Dashboard", page: "dashboard", css: "/css/dashboard.css" },
        { label: "Abrir chamado", page: "create-ticket", css: "/css/create-ticket.css" },
        { label: "Meus chamados", page: "tickets", css: "/css/tickets.css" },
        { label: "Gerenciar usuários", page: "users", css: "/css/tickets.css" },
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
    },

    async createTicket( title, description, priority, createdBy, assignedTo, hotelId ) {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const res = await fetch("http://127.0.0.1:8000/tickets", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
              },
            body: JSON.stringify({
              title,
              description,
              priority,
              created_by: createdBy,
              assigned_to: assignedTo,
              hotel_id: hotelId
            })
          })

          if (!res.ok) {
            console.log("Não foi possível criar o chamado", res.status);
            return;
          }

          const data = await res.json();
          console.log("Chamado aberto: ", data)

        } catch (e) {
          console.error("Erro na abertura do chamado", e);
        }

      } else {
        console.log("Token não loclaizado, redirecionando para o login");
        Alpine.store.currentView = "login";
      }
    }
  };
}
