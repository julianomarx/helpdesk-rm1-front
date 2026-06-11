function dashboard() {
  return {
    showProfileModal: false,
    savingProfile: false,
    profile: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },

    goTo(page) {
      if (!validateToken()) return;
      Alpine.store("app").navigate(page);
    },

    logout() {
      logoutUser();
    },

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
