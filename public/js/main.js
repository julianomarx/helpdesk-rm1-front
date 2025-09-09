document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    currentView:  "login", 
    role: null,

    init() {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          this.role = payload.role;

          //depois preciso validar o token

          //Manda pra dash
          this.currentView = "dashboard"

        } catch (e) {
          console.error("Token inválido: ", e);
          localStorage.removeItem("acces_token");
          this.currentView = "login";
        }
      }
    }
  })
})
