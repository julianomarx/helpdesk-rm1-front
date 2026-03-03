document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    currentView: "loading",
    userId: '',
    role: null,
    menus: [],
    hotels: [],
    tokenExpire: '',


    async init() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        this.currentView = "login";
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error();

        const payload = JSON.parse(atob(token.split(".")[1]));

        this.userId = payload.sub;
        this.role = payload.role;
        this.menus = payload.menus;
        this.hotels = payload.hotels;

        this.currentView = "dashboard";

      } catch (e) {
        localStorage.removeItem("access_token");
        this.currentView = "login";
      }
    }
  });
});
