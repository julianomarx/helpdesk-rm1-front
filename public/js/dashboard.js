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

    listedUsers: [],

    filters: {
      search: '',
      hotelId: '',
      role: ''
    },

    hotelSearch: '',

    editor: {
      enabled: false,
      user: null,
      password: ''
    },

    showUserModal: false,

    teams: [],
    teamUsers: [],
    selectedTeamId: '',
    selectedUserId: '',

    showTransferModal: false,
    transferSubcategoryId: '',
    teamSubcategories: [],

    previewAttachment: null,


    async fetchUsers() {

      const token =
      localStorage.getItem("access_token");

      if (!token) {
        this.currentPage = 'login';
        return;
      }

      try {

      const params =
        new URLSearchParams();

      if (this.filters.search) {
        params.append(
          'search',
          this.filters.search
        );
      }

      if (this.filters.hotelId) {
        params.append(
          'hotel_id',
          this.filters.hotelId
        );
      }

      if (this.filters.role) {
        params.append(
          'role',
          this.filters.role
        );
      }

      console.log(
        'QUERY:',
        params.toString()
      );

      const response =
      await fetch(
        `${API_BASE}/users/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Authorization":
              "Bearer " + token,
            "Content-Type":
              "application/json"
          }
        }
      );

      if (!response.ok) {
        console.error(
          'Erro API:',
          response.status
        );

      this.showToast(
        'Erro ao buscar usuários',
        'error'
      );

      return;
    }

    const data =
      await response.json();

    console.log(
      'USERS:',
      data
    );

    this.listedUsers = data;

  } catch (err) {

    console.error(err);

    this.showToast(
      'Erro ao buscar usuários',
      'error'
    );
  }
},

    async selectUser(user) {

      const token = localStorage.getItem("access_token");

      if (!token) {
        this.currentPage == 'login';
        return;
      }

      try {

        const res = await fetch(`${API_BASE}/users/${user.id}`, {
          method : "GET",
          headers : {
            "Authorization" : "Bearer " + token,
            "Content-Type" : "application/json"
          }
        });

        if (!res.ok) {
          const data = await res.json();
          console.error("Erro ao buscar informações do usuário", data)
        }

        this.editor.enabled = false
        this.editor.password = ''


        const data = await res.json();

        this.editor.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotels: [...(data.hotels || [])]
        }

        this.showUserModal = true; 


      } catch (e) {
        console.error("Erro ao buscar informações de usuário -> ", e );
        this.showToast("Erro ao buscar dados do usuário", "error");
      }
    },

    async saveUser() {

      const token = localStorage.getItem("access_token");

      if (!token) {
        this.currentPage == 'login';
        return;
      }

      const userUpdate = JSON.stringify({
        name: this.editor.user.name,
        email: this.editor.user.email,
        password: this.editor.user.password,
        role: this.editor.user.role
        })

        console.log(userUpdate)

      try {

        const res = await fetch(
          `${API_BASE}/users/${this.editor.user.id}`,
          {
            method: 'PUT',
            headers: {
              "Authorization" : "Bearer " + token,
              'Content-Type': 'application/json'
            },
            body: userUpdate
          }
        )
        if (!res.ok) {
          this.showToast('Erro ao salvar usuário','error');
          return;
        }

        const data = await res.json();

        console.log(data)

        await fetch(
          `${API_BASE}/users/${this.editor.user.id}/hotels`,
          {
            method: 'PUT',
            headers: {
              "Authorization" : "Bearer " + token,
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({
              hotel_ids:
                this.editor.user.hotels
                  .map(h => h.id)
            })
          }
        ) 

        this.showToast(
          'Usuário atualizado',
          'success'
        )

        this.editor.enabled =
          false

        await this.fetchUsers()

      } catch (err) {

        console.error(err)

        this.showToast(
          'Erro ao salvar usuário',
          'error'
        )
      }
    },


    get filteredHotels() {

      const query =
        this.hotelSearch
          .toLowerCase()

      return Alpine.store('app').hotels
        .filter(hotel => {

          const exists =
            this.editor.user.hotels
              .find(
                h =>
                  h.id === hotel.id
              )

          return (
            !exists &&
            (
              hotel.name
                .toLowerCase()
                .includes(query)
              ||
              hotel.code
                .toLowerCase()
                .includes(query)
            )
          )
        })
    },

    addHotel(hotel) {

      this.editor.user.hotels
        .push(hotel)
    },

    removeHotel(hotel) {

      this.editor.user.hotels =
        this.editor.user.hotels
          .filter(
            h =>
              h.id !== hotel.id
          )
    },

    roleMeta(role) {

      return {

        admin: {
          label: 'ADMIN',
          class:
            'bg-red-500/20 text-red-300'
        },

        agent: {
          label: 'SUPORTE',
          class:
            'bg-blue-500/20 text-blue-300'
        },

        client_manager: {
          label: 'GERENTE',
          class:
            'bg-amber-500/20 text-amber-300'
        },

        client_receptionist: {
          label:
            'RECEPCIONISTA',

          class:
            'bg-emerald-500/20 text-emerald-300'
        }

      }[role]
    },

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

      if (this.selectedUserId) {

        //valida antes se o ticket está em atendimento 
        if (this.selectedTicket.progress == 'waiting') {
          this.showToast("Obrigatório iniciar atendimento antes de transferir o ticket para outro usuário", "error");
          return;
        }

        try {
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

        } catch (error) {
            console.error(error)
        }

      }
      
      else if (this.selectedTeamId) {

        if (!subcategoryId) {
          this.showToast("Selecione uma subcategoria", "error");
          return;
        }

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

        await this.changeTicketSubcategory(ticketId, subcategoryId);
        this.showToast("Ticket enviado para fila da equipe!", "success");


      } else {
        this.showToast("Selecione um time ou um usuário", "error");
        return;
      }

      await this.refreshSelectedTicket();

      this.selectedTeamId = '';
      this.selectedUserId = '';
      this.transferSubcategoryId = '';
    },

    validateTransfer() {

      //Nada selelcionado
      if (!this.selectedTeamId && !this.selectedUserId) {
        this.showToast("Selecione um destino para a transferência", "error");
        return;
      }

      //console.log(this.selectedTeamId)
      console.log({
        selectedTeamId: this.selectedTeamId,
        selectedUserId: this.selectedUserId,
        typeUser: typeof this.selectedUserId,
        typeTeam: typeof this.selectedTeamId,
      })

      //transfer to user
      if (this.selectedUserId) {
        this.submitTicketTransfer();
        return;
      }

      //transfer to team
      if (this.selectedTeamId) {
        this.transferSubcategoryId = '';

        this.fetchTeamSubcategories(this.selectedTeamId);

        this.showTransferModal = true;

        return;
      }
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

      if (page !== "manage-users") {
        this.listedUsers = [];
      }

      if (cssPath) this.loadCss(cssPath);
      
      if (page === "tickets") this.getTickets();

      const container = document.getElementById("page-container");
      try {

        const role = Alpine.store("app").role
        const res = await fetch(`/templates/${page}.html`);
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

    async refreshSelectedTicket() {
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) return;

       await this.getTicketById(ticketId);
       await this.getSelectedTicketLogs(ticketId);
    },

    async viewTicket(ticket) {


       // limpa logs antigos
      this.selectedTicketLogs = [];

      //Define como details a tab para sempre abrir na aba detalhes
      this.ticketViewTab = 'details';

      //busca o ticket completo
      await this.getTicketById(ticket.id);

      //await this.getSelectedTicketLogs(ticket.id)

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
        await this.refreshSelectedTicket();

        this.showToast("Ticket iniciado com sucesso!", "success");

      } catch (error) {
        console.error("Erro ao iniciar ticket:", error);
        this.showToast("Erro inesperado ao iniciar ticket", "error");
      }
    },

    async closeTicket() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        return;
      }

      const ticketId = this.selectedTicket?.id;

      try {
        const res = await fetch(`${API_BASE}/tickets/close-ticket/${ticketId}`, {
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + token
          }
        });

        if(!res.ok) {
          const error = await res.json();
          this.showToast(error.detail || "Erro ao encerrar ticket", "error")
        }

        const updatedTicket = await res.json();

        this.showToast("Ticket finalizado", "success")

        await this.refreshSelectedTicket();
        
      } catch (error) {
        console.error("Erro ao reabrir encerrar:", error);
        this.showToast("Erro inesperado ao encerrar ticket", "error");
      }

    },

    async reopenTicket() {
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
          `${API_BASE}/tickets/reopen-ticket/${ticketId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token
            }
          }
        );

        if (!res.ok) {
          const error = await res.json();
          this.showToast(error.detail || "Erro ao reabrir ticket", "error");
          return;
        }

        const updatedTicket = await res.json();

        // Atualiza ticket na tela
        await this.refreshSelectedTicket();

        this.showToast("Ticket reaberto com sucesso!", "success");

      } catch (error) {
        console.error("Erro ao reabrir ticket:", error);
        this.showToast("Erro inesperado ao reabrir ticket", "error");
      }

    },

    async returnTicketToQueue() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        return;
      }

      const ticketId = this.selectedTicket?.id

      if (!ticketId) {
        this.showToast("Nenhum ticket selecionado", "error");
        return;
      }

      try {

        const res = await fetch(
          `${API_BASE}/tickets/return-ticket/${ticketId}`,
          {
            method: "PUT",
            headers: {
              "Authorization" : "Bearer " + token
            }
          }
        )

        if (!res.ok) {
          const error = await res.json();
          this.showToast(error.detail || "Erro ao retornar ticket", "error")
        }

      } catch (error) {
        console.error("Erro ao retornar ticket", error)
        return;
      }

      await this.refreshSelectedTicket();
      this.showToast("Ticket retornado para fila!", "success"); 
    
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
          const res = await fetch(`${API_BASE}/tickets/`, {
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
          const res = await fetch(`${API_BASE}/users/`, {
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
            return;
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

  console.log(`Sessão ativa. Mostrará alerta em ${(showAlertAt / 1000 / 60).toFixed(1)} min`);

  setTimeout(async () => {
    const keep = confirm("Sua sessão irá expirar em breve. Deseja manter ativa?");
    if (keep) {

      console.log("Sessão mantida pelo usuário.");

      console.log("Renovando o token...");
      const token = localStorage.getItem("access_token");

      if (!token) {
        Alpine.store("app").currentView = "login";
        localStorage.removeItem("access_token");
      }

      try {

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
