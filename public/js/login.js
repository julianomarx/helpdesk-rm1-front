document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const API_BASE  = "/api";

  if (!loginForm) return;

  let submitting = false;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    const btn = document.getElementById("login-btn");
    const errEl = document.getElementById("login-error");
    submitting = true;
    btn.disabled = true;
    btn.textContent = "Entrando...";
    errEl.textContent = "";

    const email    = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!res.ok) {
        errEl.textContent = "Email e/ou senha inválidos!";
        btn.disabled = false;
        btn.textContent = "Entrar";
        submitting = false;
        return;
      }

      const data  = await res.json();
      const token = data.access_token;
      localStorage.setItem("access_token", token);

      const payload = JSON.parse(atob(token.split(".")[1]));
      const store   = Alpine.store("app");

      store.userId        = payload.sub;
      store.userName      = payload.name;
      store.userEmail     = payload.email;
      store.role          = payload.role;
      store.avatarUrl     = payload.avatar_url    || '';
      store.menus         = payload.menus         || [];
      store.hotels        = payload.hotels        || [];
      store.teams         = payload.teams         || [];
      store.qualitorTeams = payload.qualitor_teams || [];
      store.categories    = payload.categories    || [];
      store.subcategories = payload.subcategories || [];
      store.tokenExpire   = payload.exp;
      const landingPage = ["admin", "agent"].includes(payload.role) ? "dashboard" : "tickets";
      store.currentPage = landingPage;
      store.currentView = "dashboard";
      await store.navigate(landingPage);
      sessionWatcher.start();
      store.startHeartbeat();
      window.dispatchEvent(new CustomEvent('auth:login'));

    } catch (e) {
      console.error("Erro no login:", e);
      document.getElementById("login-error").textContent = "Erro de conexão..";
      btn.disabled = false;
      btn.textContent = "Entrar";
      submitting = false;
    }
  });
});
