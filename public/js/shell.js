function dashboard() {
  return {
    showProfileModal: false,
    savingProfile: false,
    showNotifPanel: false,
    notifications: [],
    notifUnread: 0,
    notifLoading: false,
    _notifInterval: null,

    // ── TODO ─────────────────────────────────────────────────────────
    showTodoPanel: false,
    todos: [],
    todoLoading: false,
    todoPendingCount: 0,
    todoTab: 'mine',
    todoInput: '',
    todoSubmitting: false,
    todoMentionOpen: false,
    todoMentionResults: [],
    _todoMentionStart: -1,
    _todoInterval: null,

    profile: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },

    init() {
      this.startNotifPolling();
      this.startTodoPolling();
      window.addEventListener('auth:login', () => {
        this.notifUnread = 0;
        this.notifications = [];
        this.todoPendingCount = 0;
        this.todos = [];
        this.startNotifPolling();
        this.startTodoPolling();
      });
      window.addEventListener('auth:logout', () => {
        if (this._notifInterval) { clearInterval(this._notifInterval); this._notifInterval = null; }
        if (this._todoInterval) { clearInterval(this._todoInterval); this._todoInterval = null; }
        this.notifUnread = 0;
        this.notifications = [];
        this.todoPendingCount = 0;
        this.todos = [];
        this.showTodoPanel = false;
      });
      window.addEventListener('notif:refresh', () => this.fetchNotifCount());
    },

    goTo(page) {
      if (!validateToken()) return;
      Alpine.store("app").navigate(page);
    },

    logout() {
      logoutUser();
    },

    // ── NOTIFICATIONS ──────────────────────────────────────────
    startNotifPolling() {
      if (this._notifInterval) { clearInterval(this._notifInterval); this._notifInterval = null; }
      this.fetchNotifCount();
      this._notifInterval = setInterval(() => this.fetchNotifCount(), 30000);
    },

    async fetchNotifCount() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/notifications/unread-count', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) {
          const data = await res.json();
          this.notifUnread = data.count;
        }
      } catch {}
    },

    async toggleNotifPanel() {
      this.showNotifPanel = !this.showNotifPanel;
      if (this.showNotifPanel) await this.loadNotifications();
    },

    async loadNotifications() {
      if (!validateToken()) return;
      this.notifLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) this.notifications = await res.json();
      } catch {} finally {
        this.notifLoading = false;
      }
    },

    async markAllRead() {
      const token = localStorage.getItem('access_token');
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token }
        });
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
        this.notifUnread = 0;
      } catch {}
    },

    async markOneRead(notif) {
      if (notif.read) return;
      const token = localStorage.getItem('access_token');
      try {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token }
        });
        notif.read = true;
        this.notifUnread = Math.max(0, this.notifUnread - 1);
      } catch {}
    },

    async deleteNotif(notif) {
      const token = localStorage.getItem('access_token');
      try {
        await fetch(`/api/notifications/${notif.id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token }
        });
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
        if (!notif.read) this.notifUnread = Math.max(0, this.notifUnread - 1);
      } catch {}
    },

    notifIcon(type) {
      const icons = {
        ticket_assigned: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`,
        ticket_started:  `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        mention:         `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>`,
        client_reply:    `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`,
        mural_mention:   `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
        mural_comment:   `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
        todo_assigned:   `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
        todo_done:       `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
      };
      return icons[type] || `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`;
    },

    notifTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.floor((now - d) / 60000);
      if (diff < 1)   return 'agora';
      if (diff < 60)  return diff + 'min atrás';
      if (diff < 1440) return Math.floor(diff / 60) + 'h atrás';
      return d.toLocaleDateString('pt-BR');
    },

    goToTicketFromNotif(notif) {
      this.markOneRead(notif);
      const store = Alpine.store('app');
      if (notif.mural_post_id) {
        store.navigate('mural');
        this.showNotifPanel = false;
        return;
      }
      if (notif.qualitor_ticket_id) {
        store.navigate('qualitor');
        this.showNotifPanel = false;
        return;
      }
      if (!notif.ticket_id) return;
      store.selectedTicket = { id: notif.ticket_id };
      store.navigate('ticket-view');
      this.showNotifPanel = false;
    },
    // ────────────────────────────────────────────────────────────

    // ── TODO ─────────────────────────────────────────────────────
    startTodoPolling() {
      if (this._todoInterval) { clearInterval(this._todoInterval); this._todoInterval = null; }
      const role = Alpine.store('app').role;
      if (!['admin', 'agent'].includes(role)) return;
      this.fetchTodoPendingCount();
      this._todoInterval = setInterval(() => this.fetchTodoPendingCount(), 30000);
    },

    async fetchTodoPendingCount() {
      if (!validateToken()) return;
      const role = Alpine.store('app').role;
      if (!['admin', 'agent'].includes(role)) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/todos/pending-count', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) { const d = await res.json(); this.todoPendingCount = d.count; }
      } catch {}
    },

    async toggleTodoPanel() {
      this.showTodoPanel = !this.showTodoPanel;
      if (this.showTodoPanel) {
        this.showNotifPanel = false;
        await Promise.all([this.loadTodos(), this.loadTodoMentionUsers()]);
      }
    },

    async loadTodoMentionUsers() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/users/mentionable', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) Alpine.store('app').users = await res.json();
      } catch {}
    },

    async loadTodos() {
      if (!validateToken()) return;
      this.todoLoading = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/todos', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) this.todos = await res.json();
      } catch {} finally { this.todoLoading = false; }
    },

    get filteredTodos() {
      const myId = Alpine.store('app').userId;
      if (this.todoTab === 'mine')
        return this.todos.filter(t => String(t.assignee.id) === String(myId) && !t.done);
      if (this.todoTab === 'sent')
        return this.todos.filter(t => String(t.creator.id) === String(myId) && !t.done);
      if (this.todoTab === 'done') {
        const seen = new Set();
        return this.todos.filter(t => {
          if (!t.done) return false;
          const involved = String(t.assignee.id) === String(myId) || String(t.creator.id) === String(myId);
          if (!involved || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      }
      return [];
    },

    get pendingMine() {
      const myId = Alpine.store('app').userId;
      return this.todos.filter(t => String(t.assignee.id) === String(myId) && !t.done).length;
    },

    onTodoInput(event) {
      const val = this.todoInput;
      const pos = event.target.selectionStart;
      const before = val.slice(0, pos);
      const match = before.match(/@(\w*)$/);
      if (match) {
        this._todoMentionStart = before.length - match[0].length;
        const q = match[1].toLowerCase();
        const allUsers = Alpine.store('app').users || [];
        this.todoMentionResults = allUsers.filter(u => u.name.toLowerCase().startsWith(q)).slice(0, 5);
        this.todoMentionOpen = this.todoMentionResults.length > 0;
      } else {
        this.todoMentionOpen = false;
        this.todoMentionResults = [];
      }
    },

    insertTodoMention(user) {
      const firstName = user.name.split(' ')[0];
      const before = this.todoInput.slice(0, this._todoMentionStart);
      const after = this.todoInput.slice(this._todoMentionStart).replace(/@\w*/, '@' + firstName + ' ');
      this.todoInput = before + after;
      this.todoMentionOpen = false;
    },

    async submitTodo() {
      if (this.todoSubmitting || !this.todoInput.trim()) return;
      if (!validateToken()) return;
      this.todoSubmitting = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: this.todoInput.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao criar TODO', 'error'); return;
        }
        const todo = await res.json();
        this.todos.unshift(todo);
        this.todoInput = '';
        showToast('TODO criado!', 'success');
      } catch { showToast('Erro ao criar TODO', 'error'); } finally { this.todoSubmitting = false; }
    },

    async checkTodo(todo) {
      if (todo.done) return;
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/todos/${todo.id}/done`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao concluir TODO', 'error');
          return;
        }
        todo.done = true;
        todo.done_at = new Date().toISOString();
        this.todoPendingCount = Math.max(0, this.todoPendingCount - 1);
      } catch { showToast('Erro ao concluir TODO', 'error'); }
    },

    todoTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.floor((now - d) / 60000);
      if (diff < 1)    return 'agora';
      if (diff < 60)   return diff + 'min atrás';
      if (diff < 1440) return Math.floor(diff / 60) + 'h atrás';
      return d.toLocaleDateString('pt-BR');
    },
    // ─────────────────────────────────────────────────────────────

    openProfileModal() {
      this.profile = {
        name: Alpine.store("app").userName || '',
        email: Alpine.store("app").userEmail || '',
        password: '',
        confirmPassword: ''
      };
      this.showProfileModal = true;
    },

    async uploadProfilePhoto(event) {
      const file = event.target.files[0];
      if (!file) return;

      const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      const MAX_SIZE = 5 * 1024 * 1024;

      if (!ALLOWED.includes(file.type)) {
        showToast("Formato inválido. Use JPG, PNG, WebP ou GIF.", "error");
        event.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE) {
        showToast("Imagem muito grande. Máximo: 5 MB.", "error");
        event.target.value = '';
        return;
      }

      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/users/me/avatar", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao enviar foto", "error");
          return;
        }
        const data = await res.json();
        Alpine.store("app").avatarUrl = data.avatar_url;
        showToast("Foto de perfil atualizada!", "success");
      } catch {
        showToast("Erro ao enviar foto", "error");
      } finally {
        event.target.value = '';
      }
    },

    async saveProfile() {
      if (!validateToken()) return;

      const { name, email, password, confirmPassword } = this.profile;

      if (!name?.trim()) { showToast("Nome não pode ser vazio", "error"); return; }
      if (!email?.trim()) { showToast("Email não pode ser vazio", "error"); return; }

      if (password && password !== confirmPassword) {
        showToast("As senhas não coincidem", "error");
        return;
      }

      const store = Alpine.store("app");
      const token = localStorage.getItem("access_token");
      this.savingProfile = true;

      const body = { name: name.trim(), email: email.trim() };
      if (password) body.password = password;

      try {
        const res = await fetch(`/api/users/${store.userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao salvar perfil", "error");
          return;
        }
        store.userName  = name.trim();
        store.userEmail = email.trim();
        this.profile.password = '';
        this.profile.confirmPassword = '';
        showToast("Perfil atualizado!", "success");
        this.showProfileModal = false;
      } catch {
        showToast("Erro ao salvar perfil", "error");
      } finally {
        this.savingProfile = false;
      }
    }
  };
}
