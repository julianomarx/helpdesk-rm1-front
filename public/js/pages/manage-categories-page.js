function manageCategoriesPage() {
  return {
    loading: true,
    categories: [],
    subcategories: [],
    policies: [],
    teams: [],
    openCats: [],
    pending: {},
    saving: {},
    deleting: {},
    confirmDeleteCat: null,
    confirmDeleteSub: null,

    showCreateModal: false,
    createTab: 'subcategory',
    creating: false,
    createForm: {
      catName: '',
      catTeamId: '',
      subName: '',
      subCategoryId: '',
      subPolicyId: '',
    },
    createError: '',

    async init() {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      const [catsRes, subsRes, polRes] = await Promise.all([
        fetch('/api/categories/', { headers }).then(r => r.json()),
        fetch('/api/subcategories/', { headers }).then(r => r.json()),
        fetch('/api/sla-policies', { headers }).then(r => r.json()),
      ]);

      this.categories = Array.isArray(catsRes) ? catsRes : [];
      this.subcategories = Array.isArray(subsRes) ? subsRes : [];
      this.policies = Array.isArray(polRes) ? polRes : [];
      this.teams = Alpine.store('app').teams || [];
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

    isDirty(subId) {
      const sub = this.subcategories.find(s => s.id === subId);
      if (!sub) return false;
      const current = sub.sla_policy_id ? String(sub.sla_policy_id) : '';
      return this.pending[subId] !== current;
    },

    async saveSubcategory(sub) {
      if (!this.isDirty(sub.id) || this.saving[sub.id]) return;
      this.saving = { ...this.saving, [sub.id]: true };

      const token = localStorage.getItem('access_token');
      const newPolicyId = this.pending[sub.id] ? Number(this.pending[sub.id]) : null;

      try {
        const res = await fetch(`/api/subcategories/${sub.id}`, {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sla_policy_id: newPolicyId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao salvar. Tente novamente.', 'error');
          return;
        }

        const updated = await res.json();
        const idx = this.subcategories.findIndex(s => s.id === sub.id);
        if (idx !== -1) {
          this.subcategories.splice(idx, 1, updated);
          this.pending = { ...this.pending, [sub.id]: updated.sla_policy_id ? String(updated.sla_policy_id) : '' };
        }

        showToast(`Política SLA atualizada para "${sub.name}"`, 'success');
      } catch (e) {
        showToast('Erro inesperado. Tente novamente.', 'error');
      } finally {
        this.saving = { ...this.saving, [sub.id]: false };
      }
    },

    async deleteCategory(cat) {
      this.deleting = { ...this.deleting, ['cat_' + cat.id]: true };
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/categories/${cat.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao excluir categoria', 'error');
          return;
        }
        const subIds = this.subcategories.filter(s => s.category_id === cat.id).map(s => s.id);
        this.subcategories = this.subcategories.filter(s => s.category_id !== cat.id);
        const newPending = { ...this.pending };
        subIds.forEach(id => { delete newPending[id]; });
        this.pending = newPending;
        this.categories = this.categories.filter(c => c.id !== cat.id);
        this.openCats = this.openCats.filter(id => id !== cat.id);
        this.confirmDeleteCat = null;
        showToast(`Categoria "${cat.name}" excluída`, 'success');
      } catch {
        showToast('Erro ao excluir categoria', 'error');
      } finally {
        this.deleting = { ...this.deleting, ['cat_' + cat.id]: false };
      }
    },

    async deleteSubcategory(sub) {
      this.deleting = { ...this.deleting, ['sub_' + sub.id]: true };
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/subcategories/${sub.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Erro ao excluir subcategoria', 'error');
          return;
        }
        this.subcategories = this.subcategories.filter(s => s.id !== sub.id);
        const newPending = { ...this.pending };
        delete newPending[sub.id];
        this.pending = newPending;
        this.confirmDeleteSub = null;
        showToast(`Subcategoria "${sub.name}" excluída`, 'success');
      } catch {
        showToast('Erro ao excluir subcategoria', 'error');
      } finally {
        this.deleting = { ...this.deleting, ['sub_' + sub.id]: false };
      }
    },

    openCreateModal(tab = 'subcategory') {
      this.createTab = tab;
      this.createForm = { catName: '', catTeamId: '', subName: '', subCategoryId: '', subPolicyId: '' };
      this.createError = '';
      this.showCreateModal = true;
    },

    async submitCreate() {
      this.createError = '';
      this.creating = true;
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      try {
        if (this.createTab === 'category') {
          if (!this.createForm.catName.trim()) {
            this.createError = 'Nome é obrigatório';
            return;
          }
          if (!this.createForm.catTeamId) {
            this.createError = 'Selecione uma equipe';
            return;
          }

          const res = await fetch('/api/categories/', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: this.createForm.catName.trim(),
              team_id: Number(this.createForm.catTeamId),
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            this.createError = err.detail || 'Erro ao criar categoria';
            return;
          }

          const newCat = await res.json();
          this.categories.push(newCat);
          this.openCats.push(newCat.id);
          this.showCreateModal = false;
          showToast(`Categoria "${newCat.name}" criada com sucesso!`, 'success');

        } else {
          if (!this.createForm.subName.trim()) {
            this.createError = 'Nome é obrigatório';
            return;
          }
          if (!this.createForm.subCategoryId) {
            this.createError = 'Selecione uma categoria';
            return;
          }

          const createRes = await fetch('/api/subcategories/', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: this.createForm.subName.trim(),
              category_id: Number(this.createForm.subCategoryId),
            }),
          });

          if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            this.createError = err.detail || 'Erro ao criar subcategoria';
            return;
          }

          let newSub = await createRes.json();

          if (this.createForm.subPolicyId) {
            const updateRes = await fetch(`/api/subcategories/${newSub.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ sla_policy_id: Number(this.createForm.subPolicyId) }),
            });
            if (updateRes.ok) {
              newSub = await updateRes.json();
            }
          }

          this.subcategories.push(newSub);
          this.pending = { ...this.pending, [newSub.id]: newSub.sla_policy_id ? String(newSub.sla_policy_id) : '' };
          this.showCreateModal = false;
          showToast(`Subcategoria "${newSub.name}" criada com sucesso!`, 'success');
        }
      } catch (e) {
        this.createError = 'Erro inesperado. Tente novamente.';
      } finally {
        this.creating = false;
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
  };
}
