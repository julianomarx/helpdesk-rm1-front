document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const API_BASE  = "/api";

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email    = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!res.ok) {
        document.getElementById("login-error").textContent = "Email e/ou senha inválidos!";
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
      store.categories    = payload.categories    || [];
      store.subcategories = payload.subcategories || [];
      store.tokenExpire   = payload.exp;
      store.currentPage   = "dashboard";

      store.currentView = "dashboard";
      await store.navigate("dashboard");

    } catch (e) {
      console.error("Erro no login:", e);
      document.getElementById("login-error").textContent = "Erro de conexão..";
    }
  });
});
