// /js/services.js
// Singleton para gerenciar sessão e refresh de token.
// Ajuste endpoints conforme sua API (ex.: /auth/refresh)
(function () {
  const apiBase = "http://127.0.0.1:8000";
  let refreshTimer = null;

  function getToken() {
    return localStorage.getItem("access_token");
  }

  function setToken(token) {
    localStorage.setItem("access_token", token);
    const payload = parseToken(token);
    if (payload && payload.exp) {
      scheduleRefresh(payload.exp);
    }
  }

  function clearToken() {
    localStorage.removeItem("access_token");
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function parseToken(token) {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch (e) {
      console.error("Token inválido ao parsear:", e);
      return null;
    }
  }

  function scheduleRefresh(expUnixSeconds) {
    // agenda um refresh 60s antes do expirar (ajuste conforme necessário)
    if (!expUnixSeconds) return;
    const now = Date.now();
    const expireMs = expUnixSeconds * 1000;
    const msUntilRefresh = expireMs - now - 60 * 1000; // 1 minuto antes

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    if (msUntilRefresh <= 0) {
      // Já passou do tempo de renovar — tenta renovar agora
      refreshToken().catch(() => {
        // Se falhar, limpa
        clearToken();
      });
      return;
    }

    refreshTimer = setTimeout(async () => {
      try {
        await refreshToken();
      } catch (e) {
        console.warn("Refresh do token falhou", e);
        clearToken();
        // opcional: notificar store / UI para deslogar
      }
    }, msUntilRefresh);
  }

  async function refreshToken() {
    const token = getToken();
    if (!token) throw new Error("Sem token para refresh");

    // === Ajuste o endpoint abaixo conforme seu backend ===
    // assume que existe POST /auth/refresh que retorna { access_token: "..." }
    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      // body: JSON.stringify({}) // se sua API requer body
    });

    if (!res.ok) {
      throw new Error("Refresh falhou: " + res.status);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error("Resposta de refresh sem access_token");

    setToken(data.access_token);
    return data.access_token;
  }

  // Inicia o serviço e atualiza a store (passar a store Alpine)
  async function init(store) {
    const token = getToken();
    if (!token) {
      // não tem token
      store.currentView = "login";
      return { ok: false, reason: "no_token" };
    }

    const payload = parseToken(token);
    if (!payload) {
      clearToken();
      store.currentView = "login";
      return { ok: false, reason: "invalid_token" };
    }

    // popula store com dados do token
    store.tokenExpire = payload.exp;
    store.role = payload.role ?? store.role;
    store.menus = payload.menus ?? store.menus;
    store.hotels = payload.hotels ?? store.hotels;
    // se seu payload tem userId
    if (payload.userId) store.userId = payload.userId;

    // agenda o refresh
    scheduleRefresh(payload.exp);

    // define view como dashboard
    store.currentView = "dashboard";

    return { ok: true, payload };
  }

  // Expor para o global para uso em outros scripts (login.js, dashboard.js, etc.)
  window.AppService = {
    getToken,
    setToken,
    clearToken,
    parseToken,
    refreshToken,
    scheduleRefresh,
    init
  };
})();
