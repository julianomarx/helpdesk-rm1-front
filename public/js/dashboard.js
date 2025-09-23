function dashboard() {
  return {
    currentPage: "dashboard",
    currentTab: "all",
    ticketList: [],

    //esses menus serão carregados dinamicamente depois quando eu implementar o token

    async goTo(page, cssPath) {
      if (this.currentPage === page) return
      this.currentPage = page;
      if (cssPath) this.loadCss(cssPath);
      if (page === "tickets") this.getTickets();

      const container = document.getElementById("page-container");
      try {
        const res = await fetch(`/templates/dashboard/${page}.html`);
        if (!res.ok) throw new Error("Template não encontrado");
        const html = await res.text();
        container.innerHTML = html;

        Alpine.initTree(container)

        if (page === "create-user") {
          this.initCreateUser(); // ex: função dentro do dashboard.js
        }

      } catch (error) {
        container.innerHTML = `<p class="text-red-500">Erro ao carregar a página: ${e.message}</p>`;
      }
    },

    initCreateUser() {
      // Aqui você pode inicializar os x-data ou eventos do create-user
      console.log("Tela de criar usuário inicializada");
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
      Alpine.store("app").role = '';
      Alpine.store("app").menus = '';
      Alpine.store("app").hotels = '';

      // reset do estado do dashboard
      this.currentPage = "dashboard";
      this.currentTab = "all";
      this.ticketList = [];
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

    get filteredTickets() {
      if (this.currentTab === "all") {
        return this.ticketList;
      }
      return this.ticketList.filter(ticket => ticket.progress === this.currentTab);
    },


    async createTicket(title, description, priority, createdBy, assignedTo, hotelId) {
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

        } catch (error) {
          console.error("Erro na abertura do chamado", error);
        }

      } else {
        console.log("Token não loclaizado, redirecionando para o login");
        Alpine.store.currentView = "login";
      }
    }
  };
}
