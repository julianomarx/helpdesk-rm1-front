document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!res.ok) {
        document.getElementById("login-error").textContent =
          "Email e/ou senha inválidos!";
        return;
      }

      const data = await res.json();
      const token = data.access_token;
      localStorage.setItem("access_token", token);

      const payload = JSON.parse(atob(token.split(".")[1]));

      console.log(payload)


      //aqui iremos guardar as informações de hoteis e permissões em localstorage

      // Atualiza store do Alpine
      Alpine.store("app").role = payload.role;
      Alpine.store("app").menus = payload.menus;
      Alpine.store("app").hotels = payload.hotels;

      Alpine.store("app").currentPage = "dashboard";  
      Alpine.store("app").currentTab = "all";
      Alpine.store("app").selectedTicket = "null";

      //muda a view para dashboard
      Alpine.store("app").currentView = "dashboard";

      console.log(Alpine.store("app"))

    } catch (e) {
      console.error("Erro no login:", e);
      document.getElementById("login-error").textContent =
        "Erro de conexão..";
    }
  });
});
