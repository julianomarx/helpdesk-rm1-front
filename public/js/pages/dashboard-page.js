function dashboardPage() {
  const _charts = {};

  function destroyChart(key) {
    if (_charts[key]) { try { _charts[key].destroy(); } catch (_) {} _charts[key] = null; }
  }

  return {
    dashboardTab: 'operational',

    // ── Overview counters ──────────────────────────────────────────
    dashboardOverview: {
      created_today_tickets: 0,
      open_tickets: 0,
      in_progress_tickets: 0,
      feedback_tickets: 0,
      awaiting_confirmation_tickets: 0,
      unassigned_tickets: 0,
      stale_48h_tickets: 0,
      high_priority_tickets: 0
    },

    // ── Operational ────────────────────────────────────────────────
    operationalLoaded: false,
    operationalLoading: false,
    operational: {
      stale_tickets: [],
      unassigned_tickets: [],
      critical_tickets: [],
      awaiting_confirmation_tickets: [],
      feedback_tickets: []
    },

    // ── Productivity ───────────────────────────────────────────────
    productivityLoaded: false,
    productivityLoading: false,
    productivity: { top_closers: [], top_commenters: [], most_active: [] },

    // ── Bottlenecks ────────────────────────────────────────────────
    bottlenecksLoaded: false,
    bottlenecksLoading: false,
    bottlenecks: { by_team: [], by_category: [], by_hotel: [] },

    // ── Volume ─────────────────────────────────────────────────────
    volumeLoaded: false,
    volumeLoading: false,
    volume: { by_category: [], by_subcategory: [], by_hotel: [] },

    // ── SLA ────────────────────────────────────────────────────────
    slaLoaded: false,
    slaLoading: false,
    sla: {
      summary: { total_with_sla: 0, active_sla: 0, resolution_breached_open: 0, at_risk: 0, overall_compliance_pct: 0, avg_response_hours: null },
      by_team: [],
      by_policy: [],
      at_risk_tickets: [],
      breached_open_tickets: [],
    },

    // ── History ────────────────────────────────────────────────────
    historyLoaded: false,
    historyLoading: false,
    history: { monthly: [] },

    // ── Tab switching ───────────────────────────────────────────────
    async switchTab(tab) {
      this.dashboardTab = tab;
      await this.$nextTick();
      if (tab === 'operational'  && !this.operationalLoaded)   await this.loadOperational();
      if (tab === 'productivity' && !this.productivityLoaded)  await this.loadProductivity();
      if (tab === 'bottlenecks'  && !this.bottlenecksLoaded)   await this.loadBottlenecks();
      if (tab === 'volume'       && !this.volumeLoaded)        await this.loadVolume();
      if (tab === 'sla'          && !this.slaLoaded)           await this.loadSLA();
      if (tab === 'sla'          && this.slaLoaded)            this.initSLACharts();
      if (tab === 'history'      && !this.historyLoaded)       await this.loadHistory();
      if (tab === 'history'      && this.historyLoaded)        this.initHistoryChart();
      if (tab === 'volume'       && this.volumeLoaded)         this.initVolumeCharts();
    },

    // ── Loaders ─────────────────────────────────────────────────────
    async loadDashboardOverview() {
      if (!validateToken()) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/overview", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.dashboardOverview = await res.json();
        this.operationalLoaded = false;
        await this.loadOperational();
      } catch {
        showToast("Erro ao carregar dashboard", "error");
      }
    },

    async loadOperational() {
      if (!validateToken()) return;
      this.operationalLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/operational", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.operational = await res.json();
        this.operationalLoaded = true;
      } catch {
        showToast("Erro ao carregar dados operacionais", "error");
      } finally {
        this.operationalLoading = false;
      }
    },

    async loadProductivity() {
      if (!validateToken()) return;
      this.productivityLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/productivity", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.productivity = await res.json();
        this.productivityLoaded = true;
      } catch {
        showToast("Erro ao carregar produtividade", "error");
      } finally {
        this.productivityLoading = false;
      }
    },

    async loadBottlenecks() {
      if (!validateToken()) return;
      this.bottlenecksLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/bottlenecks", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.bottlenecks = await res.json();
        this.bottlenecksLoaded = true;
      } catch {
        showToast("Erro ao carregar gargalos", "error");
      } finally {
        this.bottlenecksLoading = false;
      }
    },

    async loadVolume() {
      if (!validateToken()) return;
      this.volumeLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/volume", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.volume = await res.json();
        this.volumeLoaded = true;
        await this.$nextTick();
        this.initVolumeCharts();
      } catch {
        showToast("Erro ao carregar volume", "error");
      } finally {
        this.volumeLoading = false;
      }
    },

    async loadSLA() {
      if (!validateToken()) return;
      this.slaLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/sla", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.sla = await res.json();
        this.slaLoaded = true;
        await this.$nextTick();
        this.initSLACharts();
      } catch {
        showToast("Erro ao carregar dados de SLA", "error");
      } finally {
        this.slaLoading = false;
      }
    },

    async loadHistory() {
      if (!validateToken()) return;
      this.historyLoading = true;
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch("/api/dashboard/history", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error();
        this.history = await res.json();
        this.historyLoaded = true;
        await this.$nextTick();
        this.initHistoryChart();
      } catch {
        showToast("Erro ao carregar histórico", "error");
      } finally {
        this.historyLoading = false;
      }
    },

    // ── SLA Charts ───────────────────────────────────────────────────
    initSLACharts() {
      destroyChart('slaDonut');
      destroyChart('slaTeam');
      destroyChart('slaPolicy');

      // Donut — cumprimento geral
      const donutCanvas = document.getElementById('slaDonutChart');
      if (donutCanvas) {
        const pct = this.sla.summary.overall_compliance_pct;
        const breachedPct = Math.max(0, 100 - pct);
        _charts['slaDonut'] = new Chart(donutCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Dentro do SLA', 'Violados'],
            datasets: [{
              data: [pct, breachedPct],
              backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)'],
              borderColor: ['#10b981', '#ef4444'],
              borderWidth: 2,
              hoverOffset: 6,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '72%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 }, padding: 16 } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toFixed(1)}%` } },
            }
          }
        });
      }

      // Barras — por equipe
      const teamCanvas = document.getElementById('slaTeamChart');
      if (teamCanvas && this.sla.by_team.length) {
        const sorted = [...this.sla.by_team].sort((a, b) => b.compliance_pct - a.compliance_pct);
        _charts['slaTeam'] = new Chart(teamCanvas, {
          type: 'bar',
          data: {
            labels: sorted.map(r => r.team_name),
            datasets: [
              {
                label: 'Cumprimento (%)',
                data: sorted.map(r => r.compliance_pct),
                backgroundColor: sorted.map(r => r.compliance_pct >= 80 ? 'rgba(16,185,129,0.7)' : r.compliance_pct >= 60 ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'),
                borderRadius: 6, borderSkipped: false,
              }
            ]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { min: 0, max: 100, ticks: { color: '#6b7280', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } }
            }
          }
        });
      }

      // Barras — por política
      const polCanvas = document.getElementById('slaPolicyChart');
      if (polCanvas && this.sla.by_policy.length) {
        _charts['slaPolicy'] = new Chart(polCanvas, {
          type: 'bar',
          data: {
            labels: this.sla.by_policy.map(r => r.policy_name),
            datasets: [
              {
                label: 'Cumpridos',
                data: this.sla.by_policy.map(r => r.compliant),
                backgroundColor: 'rgba(16,185,129,0.7)',
                borderRadius: 4,
              },
              {
                label: 'Violados',
                data: this.sla.by_policy.map(r => r.breached),
                backgroundColor: 'rgba(239,68,68,0.7)',
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
            scales: {
              x: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } },
              y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
            }
          }
        });
      }
    },

    slaStatusClass(row) {
      if (row.compliance_pct >= 80) return 'text-emerald-400';
      if (row.compliance_pct >= 60) return 'text-amber-400';
      return 'text-red-400';
    },

    slaHoursLabel(h) {
      if (h === null || h === undefined) return '—';
      const abs = Math.abs(h);
      if (abs < 1) return `${Math.round(abs * 60)}min`;
      if (abs < 24) return `${abs.toFixed(1)}h`;
      return `${(abs / 24).toFixed(1)}d`;
    },

    slaDeadlineLabel(isoStr) {
      if (!isoStr) return '—';
      return dayjs(isoStr).format('DD/MM/YY HH:mm');
    },

    slaPriorityBadge(priority) {
      return {
        high:   'bg-red-500/20 text-red-300 border-red-500/30',
        medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        low:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
      }[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    },

    // ── Chart helpers ────────────────────────────────────────────────
    initHistoryChart() {
      destroyChart('history');
      const canvas = document.getElementById('historyChart');
      if (!canvas || !this.history.monthly.length) return;
      _charts['history'] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: this.history.monthly.map(p => p.month),
          datasets: [
            {
              label: 'Criados',
              data: this.history.monthly.map(p => p.created),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.15)',
              tension: 0.4, fill: true, pointRadius: 4,
            },
            {
              label: 'Encerrados',
              data: this.history.monthly.map(p => p.closed),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16,185,129,0.10)',
              tension: 0.4, fill: true, pointRadius: 4,
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#9ca3af', font: { size: 12 } } } },
          scales: {
            x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
          }
        }
      });
    },

    initVolumeCharts() {
      destroyChart('volumeCat');
      destroyChart('volumeHotel');

      const catCanvas = document.getElementById('volumeCategoryChart');
      if (catCanvas && this.volume.by_category.length) {
        _charts['volumeCat'] = new Chart(catCanvas, {
          type: 'bar',
          data: {
            labels: this.volume.by_category.map(i => i.name),
            datasets: [{
              label: 'Chamados',
              data: this.volume.by_category.map(i => i.count),
              backgroundColor: 'rgba(59,130,246,0.7)',
              borderColor: '#3b82f6',
              borderWidth: 1, borderRadius: 6,
            }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
              y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } }
            }
          }
        });
      }

      const hotelCanvas = document.getElementById('volumeHotelChart');
      if (hotelCanvas && this.volume.by_hotel.length) {
        _charts['volumeHotel'] = new Chart(hotelCanvas, {
          type: 'bar',
          data: {
            labels: this.volume.by_hotel.map(i => i.name),
            datasets: [{
              label: 'Chamados',
              data: this.volume.by_hotel.map(i => i.count),
              backgroundColor: 'rgba(168,85,247,0.7)',
              borderColor: '#a855f7',
              borderWidth: 1, borderRadius: 6,
            }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
              y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } }
            }
          }
        });
      }
    },

    // ── Formatters / helpers ─────────────────────────────────────────
    get overviewCards() {
      return [
        { label: "Criados Hoje",           value: this.dashboardOverview.created_today_tickets, color: 'blue'   },
        { label: "Abertos",                value: this.dashboardOverview.open_tickets,           color: 'gray'   },
        { label: "Em Atendimento",         value: this.dashboardOverview.in_progress_tickets,    color: 'cyan'   },
        { label: "Retorno Solicitante",    value: this.dashboardOverview.feedback_tickets,        color: 'amber'  },
        { label: "Aguardando Confirmação", value: this.dashboardOverview.awaiting_confirmation_tickets, color: 'purple' },
        { label: "Sem Responsável",        value: this.dashboardOverview.unassigned_tickets,     color: 'red'    },
        { label: "Parados +48h",           value: this.dashboardOverview.stale_48h_tickets,      color: 'orange' },
        { label: "Alta Prioridade",        value: this.dashboardOverview.high_priority_tickets,  color: 'red'    },
      ];
    },

    cardColor(color) {
      return {
        blue:   'text-blue-400',
        gray:   'text-gray-300',
        cyan:   'text-cyan-400',
        amber:  'text-amber-400',
        purple: 'text-purple-400',
        red:    'text-red-400',
        orange: 'text-orange-400',
      }[color] || 'text-gray-300';
    },

    priorityBadge(priority) {
      return {
        high:   'bg-red-500/20 text-red-300 border-red-500/30',
        medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        low:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
      }[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    },

    priorityLabel(priority) {
      return { high: 'Alta', medium: 'Média', low: 'Baixa' }[priority] || priority;
    },

    progressLabel(progress) {
      return {
        waiting:               'Aguardando',
        in_progress:           'Em atendimento',
        feedback:              'Retorno solicitante',
        awaiting_confirmation: 'Aguardando confirmação',
        done:                  'Concluído',
      }[progress] || progress;
    },

    timeAgo(dateStr) {
      if (!dateStr) return '—';
      const diff = Date.now() - new Date(dateStr).getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'agora';
      if (h < 24) return `${h}h atrás`;
      return `${Math.floor(h / 24)}d atrás`;
    },

    rankMedal(index) {
      return ['🥇','🥈','🥉'][index] || `${index + 1}°`;
    },

    maxCount(arr) {
      return arr.reduce((m, i) => Math.max(m, i.count), 1);
    },

    hoursLabel(h) {
      if (h < 1)   return `${Math.round(h * 60)}min`;
      if (h < 24)  return `${h.toFixed(1)}h`;
      return `${(h / 24).toFixed(1)}d`;
    },
  };
}
