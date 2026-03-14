const API_BASE = "/api";

function dashboard() {
  return {
    currentPage: "dashboard",
    currentTab: "all",
    ticketViewTab: 'details',
    loadingTickets: false,
    ticketList: [],
    selectedTicket: { comments: [] },
    selectedTicketLogs: [],
    newComment: '',
    showDescription: false,
    maxDescLength: 400,

    showFinishModal: false,
    finishReason: '',

    teams: [],
    teamUsers: [],
    selectedTeamId: '',
    selectedUserId: '',

    showTransferModal: false,
    transferSubcategoryId: '',
    teamSubcategories: [],

    previewAttachment: null,

    async fetchTeams() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Token não localizado");
        return;
      }

      if (this.teams.length === 0) {
        const res = await fetch(`${API_BASE}/teams/`, {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          }
        })

        if (!res.ok) {
          console.error("Erro ao listar times", "error");
          return;
        }

        this.teams = await res.json();
        console.log("resposta da API:", res);
        console.log("VARIAVEL TEAMS", this.teams)
      }
    },

    async fetchTeamUsers() {
      const token = localStorage.getItem("access_token");

      const teamId = this.selectedTicket?.assigned_team_id

      if (!token || !teamId) return;

      const res = await fetch(`${API_BASE}/teams/${teamId}/users/`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      })

      if (!res.ok) {
        this.showToast("Erro ao listar usuários do time responsável", "error");
        console.error("Erro na requisição -> ", res.status)
      }

      this.teamUsers = await res.json()

      console.log(this.teamUsers);
    },

    async submitTicketTransfer(subcategoryId = null) {
      const token = localStorage.getItem("access_token");

      if (!token) {
        this.showToast("Token inválido", "error");
        return;
      }

      const ticketId = this.selectedTicket?.id;

      if (!ticketId) {
        this.showToast("Nenhum ticket selecionado", "error");
        return;
      }

      // 🔥 PRIORIDADE: se selecionou usuário, vai pra usuário
      if (this.selectedUserId) {

        const res = await fetch(
          `${API_BASE}/tickets/${ticketId}/assign-agent/${this.selectedUserId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
            }
          }
        );

        if (!res.ok) {
          this.showToast("Erro ao transferir para usuário", "error");
          return;
        }
        this.showToast("Ticket transferido para usuário!", "success");

      }
      // 🔥 SENÃO: se selecionou time
      else if (this.selectedTeamId) {
        const res = await fetch(
          `${API_BASE}/tickets/${ticketId}/assign-team/${this.selectedTeamId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
            }
          }
        );

        if (!res.ok) {
          this.showToast("Erro ao transferir para equipe", "error");
          return;
        }

        this.showToast("Ticket enviado para fila da equipe!", "success");

        await this.changeTicketSubcategory(this.selectedTicket.id, subcategoryId);


      } else {
        this.showToast("Selecione um time ou um usuário", "error");
        return;
      }

      // 🔥 Atualiza tela
      await this.getTicketById(ticketId);
      await this.getSelectedTicketLogs(ticketId);

      // 🔥 limpa seleção
      this.selectedTeamId = '';
      this.selectedUserId = '';
    },

    validateTransfer() {
      if (!this.selectedTeamId && !this.selectedUserId) {
        this.showToast("Selecione um destino para a transferência", "error");
        return
      }

      console.log(this.selectedTeamId)

      if (this.selectedTeamId && this.selectedTeamId != this.selectedTicket.assigned_team_id) {
        this.fetchTeamSubcategories(this.selectedTeamId);
        this.showTransferModal = true;
        return;
      }


      this.submitTicketTransfer();

    },

    async fetchTeamSubcategories(categoryId) {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Token não localizado")
      }

      console.log(`${API_BASE}/subcategories/?category_id=${categoryId}`);

      const res = await fetch(`${API_BASE}/subcategories/?category_id=${categoryId}`, {
        method: 'GET',
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      })
      if (!res.ok) {
        console.error("Erro ao buscar subcategorias do time");
        this.showToast("Erro ao buscar subcategorias", "error");
        return
      }

      this.teamSubcategories = await res.json();
    },

    async confirmTransferWithSubcategory() {

      if (!this.transferSubcategoryId) {
        this.showToast("Selecione uma subcategoria", "error");
        return;
      }

      await this.submitTicketTransfer(this.transferSubcategoryId);

      this.showTransferModal = false;
    },

    async changeTicketSubcategory(ticketId, transferSubcategoryId) {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Token not found");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}/subcategory`, {
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subcategory_id: transferSubcategoryId
          })
        })

        if (!res.ok) {
          console.error("Erro ao efetuar a mudança de subcategoria");
          this.showToast("Erro ao transferir ticket", "error");
          return
        }
      } catch (error) {
        console.error("Erro ao trocar subcategoria do ticket", error);
      }
    },

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

        // if (page === "create-user") {
        //   this.initCreateUser(); // ex: função dentro do dashboard.js
        // }

      } catch (error) {
        container.innerHTML = `<p class="text-red-500">Erro ao carregar a página: ${error.message}</p>`;
      }
    },

    loadCss(href) { // não to usando isso nesse momento
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
      Alpine.store("app").userId = '';
      Alpine.store("app").categories = '';
      Alpine.store("app").subcategories = '';

      this.teams = [];
      this.teamUsers = [];
      this.selectedTeamId = '';
      this.selectedUserId = '';
      this.transferMode = '';
      this.loadingUsers = false

      // reset do estado do dashboard
      this.currentPage = "dashboard";
      this.currentTab = "all";
      this.ticketList = [];

      //limpa a DOM 
      const container = document.getElementById("page-container");
      if (container) container.innerHTML = "";
    },

    async getTickets() {

      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
      }

      this.loadingTickets = true;

      if (token) {
        try {
          let res = await fetch(`${API_BASE}/tickets/`, {
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

          console.log(data)

          this.ticketList = data;

        } catch (error) {
          console.error("Erro ao buscar tickets:", error);
          this.showToast("Erro ao carregar tickets", "error");
        } finally {
          this.loadingTickets = false;
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

    async viewTicket(ticket) {
      //busca o ticket completo
      this.getTicketById(ticket.id);

      // limpa logs antigos
      this.selectedTicketLogs = [];

      //Define como details a tab para sempre abrir na aba detalhes
      this.ticketViewTab = 'details';

      await this.getSelectedTicketLogs(ticket.id)

      this.goTo("ticket-view");

    },

    async getTicketById(ticketId) {
      const token = localStorage.getItem("access_token");
      if (!token) {
        Alpine.store("app").currentView = "login";
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers: { "Authorization": "Bearer " + token }
        });

        if (!res.ok) {
          throw new Error("Erro ao buscar ticket");
        }

        const data = await res.json();
        this.selectedTicket = data; // já inclui comments

        console.log("Ticket carregado:", data);

        return data;

      } catch (error) {
        console.error("Não foi possível buscar o ticket:", error);
        this.showToast("Erro ao carregar ticket", "error");
      }

    },

    // refreshTicket() {
    //   this.getTicket(this.selectedTicket.id);
    // },

    async getSelectedTicketLogs(ticketId) {
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        return
      }

      try {
        const res = await fetch(`${API_BASE}/ticket-logs/${ticketId}`, {
          headers: {
            "Authorization": "Bearer " + token
          }
        });

        if (!res.ok) {
          throw new Error("Erro ao buscar logs")
        }

        const data = await res.json();

        console.log(data)
        this.selectedTicketLogs = data.reverse();


      } catch (error) {
        console.error("Erro ao buscar logs: ", error);
        this.showToast("Erro ao carregar histórico", "error");
      }

    },

    async startTicket() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        return;
      }

      const ticketId = this.selectedTicket?.id;

      if (!ticketId) {
        this.showToast("Nenhum ticket selecionado", "error");
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/tickets/start-ticket/${ticketId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
            }
          }
        );

        if (!res.ok) {
          const error = await res.json();
          this.showToast(error.detail || "Erro ao iniciar ticket", "error");
          return;
        }

        const updatedTicket = await res.json();

        // Atualiza ticket na tela
        this.selectedTicket = updatedTicket;

        // Atualiza logs
        await this.getSelectedTicketLogs(ticketId);

        this.showToast("Ticket iniciado com sucesso!", "success");

      } catch (error) {
        console.error("Erro ao iniciar ticket:", error);
        this.showToast("Erro inesperado ao iniciar ticket", "error");
      }
    },

    get orderedComments() {
      if (!this.selectedTicket?.comments) return [];
      return [...this.selectedTicket.comments].reverse();
    },

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
      }, 4200);

    },

    async createTicket(title, description, priority, hotelId, categoryId, subcategoryId) {
      const token = localStorage.getItem("access_token");
      if (token) {

        if (title.length > 100) {
          this.showToast("Título muito longo(max 100), seja mais breve!", "error");
          return;
        }

        try {
          const res = await fetch(`${API_BASE}/tickets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
              title,
              description,
              priority,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              hotel_id: hotelId
            })
          })


          if (!res.ok) {
            this.showToast("Erro ao criar Ticket", "error");
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
        Alpine.store("app").currentView = "login";
      }
    },

    async createUser(userData) {
      const token = localStorage.getItem("access_token");

      console.log(userData)
      if (token) {
        try {
          const body = userData
          const res = await fetch(`${API_BASE}/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(userData)
          });

          if (!res.ok) {

            const errorData = await res.json();
            console.error("Erro detalhado:", errorData)

            this.showToast("Erro ao criar usuário", "error");
          }


          console.log(res)
          this.showToast("Usuário criado com sucesso!", "success");

        } catch (error) {
          console.error("Erro nessa merda :", error)
        }
      }
    },

    async submitComment() {
      // valida
      if (!this.newComment || !this.newComment.trim()) {
        this.showToast('Comentário vazio!', 'error');
        return;
      }

      const ticketId = this.selectedTicket?.id;
      if (!ticketId) {
        this.showToast('Nenhum ticket selecionado', 'error');
        return;
      }

      try {
        // tentamos criar o comentário via método já existente
        await this.createComment({
          ticket_id: ticketId,
          // pega userId do store (ajuste conforme sua store)
          user_id: (Alpine.store('app')?.user?.userId ?? Alpine.store('app')?.userId ?? null),
          comment: this.newComment
        });

        // limpa texto local
        this.newComment = '';

        // recarrega o ticket com os comentários atualizados
        await this.getTicketById(ticketId);

      } catch (err) {
        console.error('Erro em submitComment:', err);
        this.showToast('Erro ao enviar comentário', 'error');
      }
    },

    async createComment(commentData, showToast = true) {
      const token = localStorage.getItem("access_token");

      console.log(commentData)

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/comments/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(commentData)
          })

          if (!res.ok) {
            console.error("Erro ao criar comentário!", res.status)
          }

          const data = await res.json();

          if (showToast) {
            this.showToast("Comentário criado com sucesso!", "success");
          }

          return data;

        } catch (error) {
          console.error("Erro ao criar comentário", error)
        }

      }
    },

    async InitStayAlive() {

      stayAlive(Alpine.store("app").tokenExpire);

    },

    async confirmFinishTicket() {
      if (!this.finishReason.trim()) {
        alert("Informe a conclusão antes de encerrar.");
        return;
      }

      const token = localStorage.getItem("access_token");
      const ticketId = this.selectedTicket?.id;

      if (!token || !ticketId) {
        this.showToast("Erro ao localixar o ticket", "error");
        return;
      }

      try {
        await this.createComment({
          ticket_id: ticketId,
          user_id: Alpine.store("app").userId,
          comment: this.finishReason
        }, false
        );

        //cria o comentario 
        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            progress: "awaiting_confirmation"
          })
        });

        if (!res.ok) {
          const error = await res.json();
          this.showToast(error.detail || "Erro ao atualizar o ticket", "error");
          return;
        }

        await this.getTicketById(ticketId);

        await this.getSelectedTicketLogs(ticketId);

        this.showToast("Ticket enviado para encerramento", "success");

        this.showFinishModal = false;
        this.finishReason = '';

      } catch (err) {
        this.showToast("Erro ao adicionar mensagem de encerramento ao ticket", "error");
      }
    },

    async uploadAttachment(ticketId, file) {
      const token = localStorage.getItem("access_token");

      if (!file) return;

      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token
        },
        body: formData
      })

      if (!res.ok) {
        const error = await res.json();
        this.showToast("Erro ao realizar upload do arquivo", "error");
        return;
      }

      const data = await res.json();

      console.log(data);

      await this.getTicketById(this.selectedTicket.id);
      this.showToast("Arquivo enviado com sucesso", "success");
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
    },


  }
}

function stayAlive(expireTimestamp) {

  const expireAt = expireTimestamp * 1000;
  const now = Date.now();
  const timeleft = expireAt - now;

  //mostrar alerta 2 min antes
  const alertBefore = 2 * 60 * 1000;
  const showAlertAt = timeleft - alertBefore

  if (showAlertAt <= 0) {
    Alpine.store("app").currentView = "login";
    localStorage.removeItem("access_token");
    return;
  }

  console.log(`⏱ Sessão ativa. Mostrará alerta em ${(showAlertAt / 1000 / 60).toFixed(1)} min`);

  setTimeout(async () => {
    const keep = confirm("Sua sessão irá expirar em breve. Deseja manter ativa?");
    if (keep) {

      console.log("Sessão mantida pelo usuário.");


      //lógica para renovar o token e atualizar o payload
      console.log("Renovando o token...");
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        localStorage.removeItem("access_token");
      }

      try {

        //chama o back pra renovar o token
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
        });

        if (!res.ok) {
          console.error("Erro ao renovar token!", res.status)
        }

        const data = await res.json();
        const newToken = data.access_token;
        localStorage.setItem("access_token", newToken);

        const payload = JSON.parse(atob(newToken.split(".")[1]));

        //atualiza dados 
        Alpine.store("app").userId = payload.sub
        Alpine.store("app").role = payload.role;
        Alpine.store("app").menus = payload.menus;
        Alpine.store("app").hotels = payload.hotels;
        Alpine.store("app").tokenExpire = payload.exp;

        console.log("Token renovado com sucesso!");

        stayAlive(Alpine.store("app").tokenExpire);; // passa os token renovado pra função pra extender o tempo.

      } catch (error) {
        console.error("Erro na renovação do token", error);
      }

    } else {
      logout();
    }
  }, showAlertAt)
}
