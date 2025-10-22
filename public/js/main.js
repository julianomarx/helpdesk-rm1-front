document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    currentView: localStorage.getItem("access_token") ? "dashboard" : "login",
    userId: '',
    role: null,
    menus: [],
    hotels: [],
    tokenExpire: '',

    
    init() {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          this.tokenExpire = payload.exp;
          
          console.log("Sessão restaurada meo");

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
