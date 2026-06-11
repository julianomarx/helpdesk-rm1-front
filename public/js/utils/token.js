function validateToken() {
  const token = localStorage.getItem("access_token");
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - 60 <= now) {
      logoutUser();
      return false;
    }
    return true;
  } catch {
    logoutUser();
    return false;
  }
}

function logoutUser() {
  localStorage.removeItem("access_token");
  const store = Alpine.store("app");
  if (!store) return;
  store.currentView  = "login";
  store.role         = '';
  store.menus        = [];
  store.hotels       = [];
  store.teams        = [];
  store.userId       = '';
  store.userName     = '';
  store.userEmail    = '';
  store.categories   = [];
  store.subcategories = [];
  store.currentPage  = "dashboard";
  store.selectedTicket = null;
  const container = document.getElementById("page-container");
  if (container) container.innerHTML = "";
}
