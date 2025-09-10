document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    currentView:  "login", 
    role: null,

    init() {

      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.exp <= new Date.now()) {
            console.log("Token inválido")
            localStorage.removeItem("acces_token");
            this.currentView = "login";
          }

          //atribuir role
          this.role = payload.role;

          //salvar rotas do usuário em localStorage (ainda tem que criar isso e enviar via token)
          
          //Manda pra dash
          this.currentView = "dashboard"
          console.log(payload)

        } catch (e) {
          console.error("Token inválido: ", e);
          localStorage.removeItem("acces_token");
          this.currentView = "login";
        }
      }
    }
  })
})
