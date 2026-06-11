function ticketViewPage() {
  return {
    selectedTicket: { comments: [], attachments: [] },
    selectedTicketLogs: [],
    ticketViewTab: 'details',
    newComment: '',
    showDescription: false,
    maxDescLength: 400,
    showFinishModal: false,
    finishReason: '',
    showTransferModal: false,
    transferSubcategoryId: '',
    teamSubcategories: [],
    selectedTeamId: '',
    selectedUserId: '',
    teamUsers: [],
    previewAttachment: null,
    attachments: [],
    loadingAttachments: false,
    deletingAttachmentId: null,

    init() {
      const stored = Alpine.store("app").selectedTicket;
      if (stored) this.selectedTicket = stored;
    },

    goTo(page) {
      if (!validateToken()) return;
      Alpine.store("app").navigate(page);
    },

    async getTicketById(ticketId) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.selectedTicket = await res.json();
        Alpine.store("app").selectedTicket = this.selectedTicket;
      } catch {
        showToast("Erro ao carregar ticket", "error");
      }
    },

    async getSelectedTicketLogs(ticketId) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/ticket-logs/${ticketId}`, {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.selectedTicketLogs = (await res.json()).reverse();
      } catch {
        showToast("Erro ao carregar histórico", "error");
      }
    },

    async refreshSelectedTicket() {
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) return;
      await this.getTicketById(ticketId);
      await this.getSelectedTicketLogs(ticketId);
    },

    async startTicket() {
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast("Nenhum ticket selecionado", "error"); return; }
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/start-ticket/${ticketId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao iniciar ticket", "error");
          return;
        }
        await this.refreshSelectedTicket();
        showToast("Ticket iniciado!", "success");
      } catch {
        showToast("Erro inesperado ao iniciar ticket", "error");
      }
    },

    async closeTicket() {
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/close-ticket/${ticketId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao encerrar ticket", "error");
          return;
        }
        await this.refreshSelectedTicket();
        showToast("Ticket finalizado", "success");
      } catch {
        showToast("Erro inesperado ao encerrar ticket", "error");
      }
    },

    async reopenTicket() {
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast("Nenhum ticket selecionado", "error"); return; }
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/reopen-ticket/${ticketId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao reabrir ticket", "error");
          return;
        }
        await this.refreshSelectedTicket();
        showToast("Ticket reaberto!", "success");
      } catch {
        showToast("Erro inesperado ao reabrir ticket", "error");
      }
    },

    async returnTicketToQueue() {
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast("Nenhum ticket selecionado", "error"); return; }
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/return-ticket/${ticketId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao retornar ticket", "error");
          return;
        }
        await this.refreshSelectedTicket();
        showToast("Ticket retornado para fila!", "success");
      } catch {
        showToast("Erro inesperado ao retornar ticket", "error");
      }
    },

    get orderedComments() {
      if (!this.selectedTicket?.comments) return [];
      return [...this.selectedTicket.comments].reverse();
    },

    async submitComment() {
      if (!this.newComment?.trim()) { showToast('Comentário vazio!', 'error'); return; }
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast('Nenhum ticket selecionado', 'error'); return; }
      try {
        await this.createComment({
          ticket_id: ticketId,
          user_id: Alpine.store('app').userId,
          comment: this.newComment
        });
        this.newComment = '';
        await this.getTicketById(ticketId);
        showToast('Comentário enviado!', 'success');
      } catch {
        showToast('Erro ao enviar comentário', 'error');
      }
    },

    async createComment(commentData) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      const res = await fetch('/api/comments/', {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(commentData)
      });
      if (!res.ok) throw new Error("Erro ao criar comentário");
      return await res.json();
    },

    async confirmFinishTicket() {
      if (!this.finishReason.trim()) { alert("Informe a conclusão antes de encerrar."); return; }
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast("Ticket não encontrado", "error"); return; }
      const token = localStorage.getItem("access_token");
      try {
        await this.createComment({
          ticket_id: ticketId,
          user_id: Alpine.store("app").userId,
          comment: this.finishReason
        });
        const res = await fetch(`/api/tickets/${ticketId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ progress: "awaiting_confirmation" })
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao atualizar ticket", "error");
          return;
        }
        await this.refreshSelectedTicket();
        showToast("Ticket enviado para encerramento", "success");
        this.showFinishModal = false;
        this.finishReason = '';
      } catch {
        showToast("Erro ao encerrar ticket", "error");
      }
    },

    validateAttachment(file) {
      const ALLOWED_EXTS = [".jpg",".jpeg",".png",".gif",".webp",".pdf",".doc",".docx",
        ".xls",".xlsx",".txt",".csv",".zip"];
      const MAX_SIZE = 10 * 1024 * 1024;
      if (!file) return false;
      if (file.size > MAX_SIZE) {
        showToast("Arquivo muito grande. Máximo: 10 MB.", "error");
        return false;
      }
      const ext = ("." + file.name.split(".").pop()).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        showToast(`Tipo não permitido: ${ext}. Use: imagem, PDF, Word, Excel, CSV ou ZIP.`, "error");
        return false;
      }
      return true;
    },

    async loadAttachments(ticketId) {
      if (!ticketId || !validateToken()) return;
      this.loadingAttachments = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
          headers: { Authorization: "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.attachments = await res.json();
      } catch {
        showToast("Erro ao carregar anexos", "error");
      } finally {
        this.loadingAttachments = false;
      }
    },

    async uploadAttachment(ticketId, file, inputEl) {
      if (!file || !this.validateAttachment(file)) {
        if (inputEl) inputEl.value = '';
        return;
      }
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao realizar upload", "error");
          return;
        }
        await this.loadAttachments(ticketId);
        showToast("Arquivo enviado!", "success");
      } catch {
        showToast("Erro ao realizar upload", "error");
      } finally {
        if (inputEl) inputEl.value = '';
      }
    },

    async deleteAttachment(attachmentId) {
      const ticketId = this.selectedTicket?.id;
      if (!ticketId || !validateToken()) return;
      this.deletingAttachmentId = attachmentId;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/${ticketId}/attachments/${attachmentId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token }
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erro ao excluir anexo", "error");
          return;
        }
        this.attachments = this.attachments.filter(a => a.id !== attachmentId);
        showToast("Anexo excluído", "success");
      } catch {
        showToast("Erro ao excluir anexo", "error");
      } finally {
        this.deletingAttachmentId = null;
      }
    },

    fileIcon(mimeType) {
      if (!mimeType) return "📎";
      if (mimeType.startsWith("image/"))          return "🖼️";
      if (mimeType === "application/pdf")          return "📄";
      if (mimeType.includes("word"))               return "📝";
      if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
      if (mimeType === "text/plain")               return "📃";
      if (mimeType === "text/csv")                 return "📊";
      if (mimeType.includes("zip"))                return "🗜️";
      return "📎";
    },

    formatFileSize(bytes) {
      if (!bytes) return "—";
      if (bytes < 1024)        return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    },

    async downloadAttachment(att) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(att.url, { headers: { Authorization: "Bearer " + token } });
        if (!res.ok) { showToast("Erro ao baixar arquivo", "error"); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = att.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch {
        showToast("Erro ao baixar arquivo", "error");
      }
    },

    async fetchTeamUsers() {
      if (!validateToken()) return;
      const teamId = this.selectedTicket?.assigned_team_id;
      if (!teamId) return;
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/teams/${teamId}/users/`, {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) { showToast("Erro ao listar usuários do time", "error"); return; }
      this.teamUsers = await res.json();
    },

    async fetchTeamSubcategories(categoryId) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/subcategories/?category_id=${categoryId}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) { showToast("Erro ao buscar subcategorias", "error"); return; }
      this.teamSubcategories = await res.json();
    },

    validateTransfer() {
      if (!this.selectedTeamId && !this.selectedUserId) {
        showToast("Selecione um destino para a transferência", "error");
        return;
      }
      if (this.selectedUserId) {
        this.submitTicketTransfer();
        return;
      }
      if (this.selectedTeamId) {
        this.transferSubcategoryId = '';
        this.fetchTeamSubcategories(this.selectedTeamId);
        this.showTransferModal = true;
      }
    },

    async submitTicketTransfer(subcategoryId = null) {
      if (!validateToken()) return;
      const ticketId = this.selectedTicket?.id;
      if (!ticketId) { showToast("Nenhum ticket selecionado", "error"); return; }
      const token = localStorage.getItem("access_token");

      if (this.selectedUserId) {
        if (this.selectedTicket.progress === 'waiting') {
          showToast("Inicie o atendimento antes de transferir para outro usuário", "error");
          return;
        }
        try {
          const res = await fetch(`/api/tickets/${ticketId}/assign-agent/${this.selectedUserId}`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
          });
          if (!res.ok) { showToast("Erro ao transferir para usuário", "error"); return; }
          showToast("Ticket transferido!", "success");
        } catch { return; }

      } else if (this.selectedTeamId) {
        if (!subcategoryId) { showToast("Selecione uma subcategoria", "error"); return; }
        const res = await fetch(`/api/tickets/${ticketId}/assign-team/${this.selectedTeamId}`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!res.ok) { showToast("Erro ao transferir para equipe", "error"); return; }
        await this.changeTicketSubcategory(ticketId, subcategoryId);
        showToast("Ticket enviado para fila da equipe!", "success");

      } else {
        showToast("Selecione um time ou usuário", "error");
        return;
      }

      await this.refreshSelectedTicket();
      this.selectedTeamId = '';
      this.selectedUserId = '';
      this.transferSubcategoryId = '';
    },

    async confirmTransferWithSubcategory() {
      if (!this.transferSubcategoryId) { showToast("Selecione uma subcategoria", "error"); return; }
      await this.submitTicketTransfer(this.transferSubcategoryId);
      this.showTransferModal = false;
    },

    async changeTicketSubcategory(ticketId, subcategoryId) {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`/api/tickets/${ticketId}/subcategory`, {
          method: "PUT",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ subcategory_id: subcategoryId })
        });
        if (!res.ok) showToast("Erro ao trocar subcategoria", "error");
      } catch {
        showToast("Erro ao trocar subcategoria", "error");
      }
    },

    logMeta(log) {
      const map = {
        created:             { label: 'Chamado aberto',        icon: '🎫', color: 'emerald' },
        ticket_started:      { label: 'Atendimento iniciado',  icon: '▶️',  color: 'blue'    },
        ticket_closed:       { label: 'Chamado encerrado',     icon: '✅',  color: 'emerald' },
        ticket_reopened:     { label: 'Chamado reaberto',      icon: '🔄',  color: 'amber'   },
        ticket_cancelled:    { label: 'Chamado cancelado',     icon: '🚫',  color: 'red'     },
        ticket_returned:     { label: 'Retornado para fila',   icon: '↩️',  color: 'amber'   },
        status_changed:      { label: 'Status alterado',       icon: '🔁',  color: 'blue'    },
        progress_changed:    { label: 'Progresso alterado',    icon: '📊',  color: 'blue'    },
        assigned_changed:    { label: 'Responsável alterado',  icon: '👤',  color: 'purple'  },
        priority_changed:    { label: 'Prioridade alterada',   icon: '⚡',  color: 'amber'   },
        team_changed:        { label: 'Equipe alterada',       icon: '👥',  color: 'purple'  },
        category_changed:    { label: 'Categoria alterada',    icon: '📂',  color: 'blue'    },
        subcategory_changed: { label: 'Subcategoria alterada', icon: '📁',  color: 'blue'    },
        comment_updated:     { label: 'Comentário editado',    icon: '✏️',  color: 'gray'    },
        comment_deleted:     { label: 'Comentário removido',   icon: '🗑️',  color: 'red'     },
        agent_joined:        { label: 'Agente entrou',         icon: '➕',  color: 'emerald' },
        agent_left:          { label: 'Agente removido',       icon: '➖',  color: 'red'     },
        time_started:        { label: 'Cronômetro iniciado',   icon: '⏱️',  color: 'cyan'    },
        time_paused:         { label: 'Cronômetro pausado',    icon: '⏸️',  color: 'amber'   },
        time_resumed:        { label: 'Cronômetro retomado',   icon: '▶️',  color: 'cyan'    },
        time_stopped:        { label: 'Cronômetro encerrado',  icon: '⏹️',  color: 'gray'    },
        sla_started:         { label: 'SLA iniciado',          icon: '🟢',  color: 'emerald' },
        sla_paused:          { label: 'SLA pausado',           icon: '🟡',  color: 'amber'   },
        sla_resumed:         { label: 'SLA retomado',          icon: '🟢',  color: 'emerald' },
        sla_breached:        { label: 'SLA violado',           icon: '🔴',  color: 'red'     },
        sla_stopped:         { label: 'SLA encerrado',         icon: '⭕',  color: 'gray'    },
      };
      return map[log.action] || { label: log.action, icon: '•', color: 'gray' };
    },

    translateValue(value) {
      if (!value) return '';
      const map = {
        open:                  'Aberto',
        closed:                'Encerrado',
        cancelled:             'Cancelado',
        waiting:               'Aguardando atendimento',
        in_progress:           'Em atendimento',
        feedback:              'Retorno solicitante',
        awaiting_confirmation: 'Aguardando confirmação',
        done:                  'Concluído',
        low:                   'Baixa',
        medium:                'Média',
        high:                  'Alta',
        admin:                 'Admin',
        agent:                 'Suporte',
        client_manager:        'Gerente',
        client_receptionist:   'Recepcionista',
      };
      return map[value] || value;
    },

    translateRole(role) {
      return {
        admin:               'Admin',
        agent:               'Suporte',
        client_manager:      'Gerente',
        client_receptionist: 'Recepcionista',
      }[role] || role;
    },

    dotColorClass(color) {
      return {
        blue:    'bg-blue-500',
        emerald: 'bg-emerald-500',
        amber:   'bg-amber-500',
        red:     'bg-red-500',
        purple:  'bg-purple-500',
        cyan:    'bg-cyan-500',
        gray:    'bg-gray-500',
      }[color] || 'bg-gray-500';
    }
  };
}
