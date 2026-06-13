function muralPage() {
  return {
    posts: [],
    loading: false,
    page: 1,
    pages: 1,
    total: 0,
    pageSize: 10,

    // Date filter (last 7 days default)
    startDate: '',
    endDate: '',

    // New post
    postInput: '',
    postSubmitting: false,
    postMentionOpen: false,
    postMentionResults: [],
    _postMentionStart: -1,

    // Comment state per post: { [postId]: { input, submitting, open } }
    commentState: {},

    // Mention autocomplete
    mentionUsers: [],

    async init() {
      const now = new Date();
      const week = new Date(now);
      week.setDate(week.getDate() - 7);
      this.endDate = now.toISOString().slice(0, 10);
      this.startDate = week.toISOString().slice(0, 10);

      await this.loadMentionUsers();
      await this.loadPosts(1);
    },

    async loadMentionUsers() {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/users/mentionable', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) this.mentionUsers = await res.json();
      } catch {}
    },

    async loadPosts(p = 1) {
      if (!validateToken()) return;
      this.loading = true;
      this.page = p;
      const token = localStorage.getItem('access_token');
      try {
        const params = new URLSearchParams({
          page: p,
          page_size: this.pageSize,
          start_date: new Date(this.startDate + 'T00:00:00').toISOString(),
          end_date: new Date(this.endDate + 'T23:59:59').toISOString(),
        });
        const res = await fetch(`/api/mural?${params}`, { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) {
          const data = await res.json();
          this.posts = data.items;
          this.total = data.total;
          this.pages = data.pages;
          this.page = data.page;
        }
      } catch {} finally { this.loading = false; }
    },

    async applyFilter() {
      await this.loadPosts(1);
    },

    // ── Post input mention autocomplete ──────────────────────────
    onPostInput(event) {
      const val = this.postInput;
      const pos = event.target.selectionStart;
      const before = val.slice(0, pos);
      const match = before.match(/@(\w*)$/);
      if (match) {
        this._postMentionStart = before.length - match[0].length;
        const q = match[1].toLowerCase();
        this.postMentionResults = this.mentionUsers.filter(u =>
          u.name.toLowerCase().startsWith(q)
        ).slice(0, 5);
        this.postMentionOpen = this.postMentionResults.length > 0 || q === 'all' || q === 'todos';
        if (q === 'all' || q === 'todos') {
          this.postMentionResults = [{ id: '__all__', name: '@todos (todos os agentes)' }, ...this.postMentionResults];
        }
      } else {
        this.postMentionOpen = false;
        this.postMentionResults = [];
      }
    },

    insertPostMention(user) {
      if (user.id === '__all__') {
        const before = this.postInput.slice(0, this._postMentionStart);
        const after = this.postInput.slice(this._postMentionStart).replace(/@\w*/, '@all ');
        this.postInput = before + after;
      } else {
        const firstName = user.name.split(' ')[0];
        const before = this.postInput.slice(0, this._postMentionStart);
        const after = this.postInput.slice(this._postMentionStart).replace(/@\w*/, '@' + firstName + ' ');
        this.postInput = before + after;
      }
      this.postMentionOpen = false;
    },

    async submitPost() {
      if (this.postSubmitting || !this.postInput.trim()) return;
      if (!validateToken()) return;
      this.postSubmitting = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('/api/mural', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: this.postInput.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao publicar', 'error');
          return;
        }
        const post = await res.json();
        this.posts.unshift(post);
        this.total++;
        this.postInput = '';
        showToast('Publicado no Mural!', 'success');
      } catch { showToast('Erro ao publicar', 'error'); }
      finally { this.postSubmitting = false; }
    },

    // ── Comments ─────────────────────────────────────────────────
    toggleComments(postId) {
      if (!this.commentState[postId]) {
        this.commentState[postId] = { input: '', submitting: false, open: true };
      } else {
        this.commentState[postId].open = !this.commentState[postId].open;
      }
    },

    async submitComment(post) {
      const state = this.commentState[post.id];
      if (!state || state.submitting || !state.input.trim()) return;
      if (!validateToken()) return;
      state.submitting = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/mural/${post.id}/comments`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: state.input.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao comentar', 'error');
          return;
        }
        const comment = await res.json();
        post.comments.push(comment);
        state.input = '';
      } catch { showToast('Erro ao comentar', 'error'); }
      finally { state.submitting = false; }
    },

    // ── ACK ──────────────────────────────────────────────────────
    async ackPost(post) {
      if (post.acked_by_me) return;
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/mural/${post.id}/ack`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          const data = await res.json();
          post.acked_by_me = true;
          post.ack_count = data.ack_count;
          if (data.new_ack) {
            post.acks = post.acks || [];
            post.acks.push(data.new_ack);
          }
        }
      } catch {}
    },

    async deletePost(post) {
      if (!validateToken()) return;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/mural/${post.id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          this.posts = this.posts.filter(p => p.id !== post.id);
          this.total--;
          showToast('Post removido', 'success');
        }
      } catch { showToast('Erro ao remover', 'error'); }
    },

    // ── Helpers ──────────────────────────────────────────────────
    formatDateTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const day   = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year  = d.getFullYear();
      const hour  = String(d.getHours()).padStart(2, '0');
      const min   = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${min}`;
    },

    ackNames(post) {
      const acks = post.acks || [];
      if (!acks.length) return '';
      const MAX = 3;
      const names = acks.slice(0, MAX).map(a => a.user.name.split(' ')[0]);
      const extra = acks.length - MAX;
      return names.join(', ') + (extra > 0 ? ` e +${extra}` : '');
    },

    initials(name) {
      if (!name) return '?';
      return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    },

    highlightMentions(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/@(\w+)/g, '<span class="text-blue-400 font-medium">@$1</span>');
    },

    isMyPost(post) {
      return String(post.author.id) === String(Alpine.store('app').userId);
    },

    isAdmin() {
      return Alpine.store('app').role === 'admin';
    },
  };
}
