function dashboard() {
  return {
    currentPage: "dashboard",
    currentTab: "all",
    ticketList: [],
    selectedTicket: null,

    //esses menus serão carregados dinamicamente depois quando eu implementar o token

    async goTo(page, cssPath) {
      if (this.currentPage === page) return
      this.currentPage = page;
      if (cssPath) this.loadCss(cssPath);
      if (page === "tickets") this.getTickets();

      const container = document.getElementById("page-container");
      try {

        const role = Alpine.store("app").role
        const res = await fetch(`/templates/${role}/${page}.html`);
        if (!res.ok) throw new Error("Template não encontrado");
        const html = await res.text();
        container.innerHTML = html;

        Alpine.initTree(container);

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
      this.selectedTicket = null;

      //limpa a DOM 
      const container = document.getElementById("page-container");
      if (container) container.innerHTML = "";
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

    viewTicket(ticket) {
      //busca o ticket completo
      this.getTicketById(ticket.id);
      this.goTo("ticket-view")
    },

    async getTicketById(ticketId) {
      const token = localStorage.getItem("access_token");
      if (!token) {
        Alpine.store("app").currentView = "login";
        return;
      }

      try {
        const res = await fetch(`http://127.0.0.1:8000/tickets/${ticketId}`, {
          headers: { "Authorization": "Bearer " + token }
        });

        if (!res.ok) {
          throw new Error("Erro ao buscar ticket");
        }

        const data = await res.json();
        this.selectedTicket = data; // já inclui comments

        console.log("Ticket carregado:", data);
      } catch (error) {
        console.error("Não foi possível buscar o ticket:", error);
        this.showToast("Erro ao carregar ticket", "error");
      }
    },

    // showToast função 
    showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      if (!container) return;

      const toast = document.createElement("div");

      toast.className = `
        flex items-center gap-2 px-4 py-2 mb-2 rounded-md shadow-lg text-sm
        transform translate-x-full opacity-0 transition-all duration-500 ease-out
          ${type === "success" ? "bg-gray-800 border border-green-500 text-green-400" :
          type === "error" ? "bg-gray-800 border border-red-500 text-red-400" :
            "bg-gray-800 border border-blue-500 text-blue-400"}
      `;

      // ícone bonitinho por tipo
      const icon = document.createElement("span");
      icon.innerHTML = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";

      const text = document.createElement("span");
      text.textContent = message;

      toast.appendChild(icon);
      toast.appendChild(text);

      container.appendChild(toast);

      // animação de entrada (slide-in + fade-in)
      requestAnimationFrame(() => {
        toast.classList.remove("translate-x-full", "opacity-0");
        toast.classList.add("translate-x-0", "opacity-100");
      });

      // desaparece na neblina do zabuza 
      setTimeout(() => {
        toast.classList.remove("translate-x-0", "opacity-100");
        toast.classList.add("opacity-0", "translate-x-full");
        setTimeout(() => toast.remove(), 500); // tempo da transição
      }, 3000);

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
            this.showToast("Erro ao criar usuário", "error");
            console.log("Não foi possível criar o chamado", res.status);
            return;
          }


          const data = await res.json();
          console.log("Chamado aberto: ", data)

          this.showToast("Chamado aberto com sucesso!", "success");

        } catch (error) {
          console.error("Erro na abertura do chamado", error);
        }

      } else {
        console.log("Token não loclaizado, redirecionando para o login");
        Alpine.store.currentView = "login";
      }
    },

    async createUser(userData) {
      const token = localStorage.getItem("access_token");

      console.log(userData)
      if (token) {
        try {
          const body = userData
          const res = await fetch("http://127.0.0.1:8000/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(userData)
          });

          if (!res.ok) {
            console.Error("Erro ao criar usuário: ", res.status);
            this.showToast("Erro ao criar usuário", "error");
          }


          console.log(res)
          this.showToast("Usuário criado com sucesso!", "success");

        } catch (error) {
          console.Error("Erro nessa merda :", error)
        }
      }
    }
  };
}

function hotelSelector(allHotels) {
  return {
    search: '',
    selectedHotels: [],
    get filteredHotels() {
      if (!allHotels) return []; // se ainda não veio nada, retorna lista vazia
      return allHotels.filter(hotel => {
        const query = this.search.toLowerCase();
        const notSelected = !this.selectedHotels.find(h => h.id === hotel.id);
        return notSelected && (
          hotel.name.toLowerCase().includes(query) ||
          hotel.code.toLowerCase().includes(query)
        );
      });
    },
    addHotel(hotel) {
      if (!this.selectedHotels.find(h => h.id === hotel.id)) {
        this.selectedHotels.push(hotel);
      }
    },
    removeHotel(hotel) {
      this.selectedHotels = this.selectedHotels.filter(h => h.id !== hotel.id);
    }
  }
}
