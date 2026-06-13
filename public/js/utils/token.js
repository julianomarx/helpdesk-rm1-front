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
  sessionWatcher.stop();
  window.dispatchEvent(new CustomEvent('auth:logout'));
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

const sessionWatcher = (() => {
  let _interval = null;
  let _modalShown = false;
  const WARN_SECONDS = 5 * 60;
  const CHECK_INTERVAL = 30 * 1000;

  function _getPayload() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }

  function _showModal() {
    if (_modalShown) return;
    _modalShown = true;
    const modal = document.getElementById("session-modal");
    if (modal) modal.style.display = "flex";
  }

  function _hideModal() {
    _modalShown = false;
    const modal = document.getElementById("session-modal");
    if (modal) modal.style.display = "none";
  }

  async function _renew() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        _hideModal();
        showToast("Sessão renovada com sucesso.", "success");
      } else {
        logoutUser();
      }
    } catch {
      logoutUser();
    }
  }

  function _check() {
    const payload = _getPayload();
    if (!payload) { logoutUser(); return; }

    const now = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - now;

    if (remaining <= 0) {
      _hideModal();
      logoutUser();
      return;
    }

    if (remaining <= WARN_SECONDS) {
      _showModal();
    }
  }

  function start() {
    if (_interval) return;
    _interval = setInterval(_check, CHECK_INTERVAL);

    window.addEventListener("storage", (e) => {
      if (e.key === "access_token" && !e.newValue) {
        _hideModal();
        logoutUser();
      }
    });
  }

  function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _hideModal();
  }

  return { start, stop, renew: _renew, logout: () => { _hideModal(); logoutUser(); } };
})();
