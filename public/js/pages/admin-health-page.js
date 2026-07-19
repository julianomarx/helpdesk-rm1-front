function adminHealth() {
  return {
    loading: false,
    data: null,
    generatedAt: null,

    async load() {
      this.loading = true;
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('/api/admin/health', { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) { showToast('Erro ao carregar status', 'error'); return; }
        const d = await res.json();
        d.backups = (d.backups || []).map(b => ({ ...b, _expanded: false }));
        this.data = d;
        this.generatedAt = d.generated_at;
      } catch { showToast('Erro de conexão', 'error'); }
      finally { this.loading = false; }
    },

    serviceLabel(name) {
      return { qualitor_api: 'Qualitor API', qualitor_sync: 'Qualitor Sync', helpdesk_api: 'Helpdesk API' }[name] || name;
    },

    formatDate(iso) {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      } catch { return iso; }
    },

    formatDateOnly(dateStr) {
      if (!dateStr) return '—';
      try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      } catch { return dateStr; }
    },
  };
}
