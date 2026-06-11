function manageCategoriesPage() {
  return {
    loading: true,
    categories: [],
    subcategories: [],
    policies: [],
    openCats: [],
    pending: {},   // sub.id → policy_id (string) or ""
    saving: {},    // sub.id → bool
    toast: { visible: false, message: '', error: false, _timer: null },

    async init() {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      const [subsRes, polRes] = await Promise.all([
        fetch('/api/subcategories/', { headers }).then(r => r.json()),
        fetch('/api/sla-policies/', { headers }).then(r => r.json()),
      ]);

      this.subcategories = subsRes;
      this.policies = polRes;
      this.categories = Alpine.store('app').categories || [];
      this.openCats = this.categories.map(c => c.id);

      for (const sub of this.subcategories) {
        this.pending[sub.id] = sub.sla_policy_id ? String(sub.sla_policy_id) : '';
      }

      this.loading = false;
    },

    subcategoriesOf(catId) {
      return this.subcategories.filter(s => s.category_id === catId);
    },

    toggleCat(catId) {
      const idx = this.openCats.indexOf(catId);
      if (idx === -1) this.openCats.push(catId);
      else this.openCats.splice(idx, 1);
    },

    pendingPolicy(subId) {
      return this.pending[subId] ?? '';
    },

    setPending(subId, value) {
      this.pending[subId] = value;
    },

    isDirty(subId) {
      const sub = this.subcategories.find(s => s.id === subId);
      if (!sub) return false;
      const current = sub.sla_policy_id ? String(sub.sla_policy_id) : '';
      return this.pending[subId] !== current;
    },

    async saveSubcategory(sub) {
      if (!this.isDirty(sub.id) || this.saving[sub.id]) return;
      this.saving[sub.id] = true;

      const token = localStorage.getItem('access_token');
      const newPolicyId = this.pending[sub.id] ? Number(this.pending[sub.id]) : null;

      try {
        const res = await fetch(`/api/subcategories/${sub.id}/`, {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sla_policy_id: newPolicyId }),
        });

        if (!res.ok) throw new Error(await res.text());

        const updated = await res.json();
        const idx = this.subcategories.findIndex(s => s.id === sub.id);
        if (idx !== -1) {
          this.subcategories[idx] = updated;
          this.pending[sub.id] = updated.sla_policy_id ? String(updated.sla_policy_id) : '';
        }

        this.showToast(`Política SLA atualizada para "${sub.name}"`);
      } catch (e) {
        this.showToast('Erro ao salvar. Tente novamente.', true);
      } finally {
        this.saving[sub.id] = false;
      }
    },

    policyBadgeClass(priority) {
      const map = {
        critical: 'bg-red-500/15    border-red-500/40    text-red-300',
        high:     'bg-orange-500/15 border-orange-500/40 text-orange-300',
        medium:   'bg-blue-500/15   border-blue-500/40   text-blue-300',
        low:      'bg-gray-500/15   border-gray-500/40   text-gray-300',
        planned:  'bg-purple-500/15 border-purple-500/40 text-purple-300',
      };
      return map[priority] || map.medium;
    },

    showToast(message, error = false) {
      if (this.toast._timer) clearTimeout(this.toast._timer);
      this.toast.message = message;
      this.toast.error = error;
      this.toast.visible = true;
      this.toast._timer = setTimeout(() => { this.toast.visible = false; }, 3000);
    },
  };
}
