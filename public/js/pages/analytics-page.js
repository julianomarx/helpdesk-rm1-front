function analyticsPage() {
  return {
    source: 'all',    // 'helpdesk' | 'qualitor' | 'all'
    period: '30d',    // '7d' | '30d' | '90d'

    loading: false,
    summary: null,
    volume: null,
    topTech: null,
    byTeam: null,
    stalled: null,
    sla: null,
    stalledVisible: 15,
    stalledHasMore: false,
    stalledLoadingAll: false,

    get stalledShown() {
      return (this.stalled?.tickets || []).slice(0, this.stalledVisible);
    },
    get stalledHidden() {
      return Math.max(0, (this.stalled?.tickets || []).length - this.stalledVisible);
    },

    async loadAllStalled() {
      if (this.stalledLoadingAll) return;
      this.stalledLoadingAll = true;
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/dashboard/unified/stalled?source=${this.source}&days=5&limit=200`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) return;
        const data = await res.json();
        this.stalled = data;
        this.stalledHasMore = data.has_more || false;
        this.stalledVisible = Infinity;
      } catch {}
      finally { this.stalledLoadingAll = false; }
    },

    async init() {
      await this.fetchAll();
    },

    setSource(s) { this.source = s; this.fetchAll(); },
    setPeriod(p) { this.period = p; this.fetchAll(); },

    async fetchAll() {
      this.loading = true;
      this.summary = null;
      this.volume = null;
      this.topTech = null;
      this.byTeam = null;
      this.stalled = null;
      this.sla = null;
      this.stalledVisible = 15;
      this.stalledHasMore = false;
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: 'Bearer ' + token };
      const qs = `source=${this.source}&period=${this.period}`;

      try {
        const [sumRes, volRes, techRes, teamRes, stalRes, slaRes] = await Promise.all([
          fetch(`/api/dashboard/unified/summary?${qs}`,         { headers }),
          fetch(`/api/dashboard/unified/volume?${qs}`,          { headers }),
          fetch(`/api/dashboard/unified/top-technicians?${qs}`, { headers }),
          fetch(`/api/dashboard/unified/by-team?${qs}`,         { headers }),
          fetch(`/api/dashboard/unified/stalled?source=${this.source}&days=5`, { headers }),
          fetch(`/api/dashboard/unified/sla?${qs}`,             { headers }),
        ]);

        if (sumRes.ok)  this.summary  = await sumRes.json();
        if (volRes.ok)  this.volume   = await volRes.json();
        if (techRes.ok) this.topTech  = await techRes.json();
        if (teamRes.ok) this.byTeam   = await teamRes.json();
        if (stalRes.ok) {
          this.stalled = await stalRes.json();
          this.stalledHasMore = this.stalled?.has_more || false;
        }
        if (slaRes.ok)  this.sla      = await slaRes.json();
      } catch (e) {
        showToast('Erro ao carregar dados do painel', 'error');
      } finally {
        this.loading = false;
        this.$nextTick(() => this.renderVolume());
      }
    },

    renderVolume() {
      const canvas = document.getElementById('volumeChart');
      if (!canvas || !this.volume) return;
      const ctx = canvas.getContext('2d');

      // Coleta todos os dias
      const diasSet = new Set();
      (this.volume.abertos  || []).forEach(d => diasSet.add(d.dia));
      (this.volume.fechados || []).forEach(d => diasSet.add(d.dia));
      const dias = Array.from(diasSet).sort();

      const abMap  = Object.fromEntries((this.volume.abertos  || []).map(d => [d.dia, d.total]));
      const feMap  = Object.fromEntries((this.volume.fechados || []).map(d => [d.dia, d.total]));
      const labels = dias.map(d => { const p = d.split('-'); return `${p[2]}/${p[1]}`; });

      if (window._volumeChartInstance) {
        window._volumeChartInstance.destroy();
      }
      window._volumeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Abertos',
              data: dias.map(d => abMap[d] || 0),
              backgroundColor: 'rgba(99,102,241,0.5)',
              borderColor: 'rgba(99,102,241,1)',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Encerrados',
              data: dias.map(d => feMap[d] || 0),
              backgroundColor: 'rgba(16,185,129,0.5)',
              borderColor: 'rgba(16,185,129,1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          },
        },
      });
    },

    slaHdPct(key) {
      const hd = this.sla?.portais?.helpdesk;
      if (!hd) return 0;
      return hd[key] ?? 0;
    },
    slaQtPct(key) {
      const qt = this.sla?.portais?.qualitor;
      if (!qt) return 0;
      return qt[key] ?? 0;
    },

    barWidth(value, max) {
      if (!max || max === 0) return '0%';
      return Math.round((value / max) * 100) + '%';
    },

    maxTopTech(list) {
      if (!list || !list.length) return 1;
      return Math.max(...list.map(t => t.total), 1);
    },

    tempoMedioLabel() {
      if (!this.summary) return '—';
      if (this.source === 'all') {
        const hd = this.summary.hd_tempo_medio;
        const qt = this.summary.qt_tempo_medio;
        const parts = [];
        if (hd != null) parts.push(`HD: ${hd}h`);
        if (qt != null) parts.push(`QT: ${qt}h`);
        return parts.length ? parts.join(' / ') : '—';
      }
      const v = this.summary.tempo_medio_resolucao_horas;
      return v != null ? `${v}h` : '—';
    },

    sourceLabel() {
      return { all: 'Todos os portais', helpdesk: 'Helpdesk', qualitor: 'Qualitor' }[this.source] || '';
    },

    formatDate(s) {
      if (!s) return '—';
      const d = s.slice(0, 10).split('-');
      return `${d[2]}/${d[1]}/${d[0]}`;
    },
  };
}
