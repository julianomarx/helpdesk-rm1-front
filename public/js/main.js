document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    currentView: "login",
    role: null,
    menus: [],
    hotels: [],

    init() {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));

          // verifica expiração (payload.exp é em segundos)
          if (payload.exp * 1000 <= Date.now()) {
            console.log("Token expirado");
            localStorage.removeItem("access_token");
            this.currentView = "login";
            return;
          }

          // atualiza store com dados do token
          this.role = payload.role;
          this.menus = payload.menus;
          this.hotels = payload.hotels;
          this.currentView = "dashboard";
          
        } catch (e) {
          console.error("Token inválido:", e);
          localStorage.removeItem("access_token");
          this.currentView = "login";
        }
      }
    }
  });
});
