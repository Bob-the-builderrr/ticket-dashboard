// ----- Config -----
// Use same-origin /api on Vercel; use localhost when developing
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : ''; // production uses relative /api

// ----- State -----
let chart = null;
const state = {
  showPercent: false,
  heatmap: true,
  showTrend: true,
  sortBy: 'count',
  sortOrder: 'desc',
  selectedPlans: [],
  selectedCategories: []
};

// ----- Boot -----
document.addEventListener('DOMContentLoaded', async () => {
  defaultDatesLast7();
  await loadPlans();
  await loadCategories();
  wire();
  await loadAll();
});

// ----- UI wiring -----
function wire() {
  id('quick7').addEventListener('click', () => { defaultDatesLast7(); loadAll(); });
  id('quick30').addEventListener('click', () => { defaultDatesLast30(); loadAll(); });
  id('quick90').addEventListener('click', () => { defaultDatesLast90(); loadAll(); });
  
  id('loadBtn').addEventListener('click', loadAll);
  id('showPercent').addEventListener('change', e => { state.showPercent = e.target.checked; renderLast(); });
  id('heatmap').addEventListener('change', e => { state.heatmap = e.target.checked; renderLast(); });
  id('showTrend').addEventListener('change', e => { state.showTrend = e.target.checked; renderLast(); });
  id('sortBy').addEventListener('change', e => { state.sortBy = e.target.value; renderLast(); });
  id('sortOrder').addEventListener('change', e => { state.sortOrder = e.target.value; renderLast(); });

  setupMultiSelect('planMultiSelect', 'planDropdown', 'planCount', 'selectedPlans');
  setupMultiSelect('categoryMultiSelect', 'categoryDropdown', 'categoryCount', 'selectedCategories');
}

function setupMultiSelect(containerId, dropdownId, countId, stateKey) {
  const container = id(containerId);
  const dropdown = id(dropdownId);
  const countElement = id(countId);
  const toggle = container.querySelector('.multi-select-toggle');

  toggle.addEventListener('click', () => { dropdown.hidden = !dropdown.hidden; });
  document.addEventListener('click', (e) => { if (!container.contains(e.target)) dropdown.hidden = true; });

  const updateCount = () => {
    const count = state[stateKey].length;
    countElement.textContent = `${count} selected`;
    toggle.querySelector('span:first-child').textContent =
      count === 0
        ? `Select ${stateKey === 'selectedPlans' ? 'Plan Types' : 'Categories'}`
        : `${count} ${stateKey === 'selectedPlans' ? 'plan types' : 'categories'} selected`;
  };
  window[`update${stateKey.charAt(0).toUpperCase() + stateKey.slice(1)}Count`] = updateCount;
}

// ----- Date defaults -----
function defaultDatesLast7() {
  const to = new Date();
  const from = new Date(); 
  from.setDate(to.getDate() - 6);
  id('from').value = toStr(from);
  id('to').value = toStr(to);
}
function defaultDatesLast30() {
  const to = new Date();
  const from = new Date(); 
  from.setDate(to.getDate() - 29);
  id('from').value = toStr(from);
  id('to').value = toStr(to);
}
function defaultDatesLast90() {
  const to = new Date();
  const from = new Date(); 
  from.setDate(to.getDate() - 89);
  id('from').value = toStr(from);
  id('to').value = toStr(to);
}

// ----- Filters -----
async function loadPlans() {
  try {
    const plans = await fetchJson(`${API_BASE}/api/plan-types`);
    const dropdown = id('planDropdown');
    dropdown.innerHTML =
      `<div class="multi-select-option">
        <input type="checkbox" id="plan-all" ${state.selectedPlans.length === 0 ? 'checked' : ''}>
        <label for="plan-all">ALL</label>
      </div>` +
      (plans || []).map(p => `
        <div class="multi-select-option">
          <input type="checkbox" id="plan-${esc(p)}" value="${esc(p)}" ${state.selectedPlans.includes(p) ? 'checked' : ''}>
          <label for="plan-${esc(p)}">${esc(p)}</label>
        </div>
      `).join('');
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.id === 'plan-all') {
          if (e.target.checked) {
            state.selectedPlans = [];
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (cb.id !== 'plan-all') cb.checked = false; });
          }
        } else {
          if (e.target.checked) {
            state.selectedPlans.push(e.target.value);
            id('plan-all').checked = false;
          } else {
            state.selectedPlans = state.selectedPlans.filter(p => p !== e.target.value);
          }
        }
        updateSelectedPlansCount();
      });
    });
    updateSelectedPlansCount();
  } catch (error) {
    console.error('Error loading plans:', error);
  }
}

async function loadCategories() {
  try {
    const cats = await fetchJson(`${API_BASE}/api/categories`);
    const dropdown = id('categoryDropdown');
    dropdown.innerHTML =
      `<div class="multi-select-option">
        <input type="checkbox" id="category-all" ${state.selectedCategories.length === 0 ? 'checked' : ''}>
        <label for="category-all">ALL</label>
      </div>` +
      (cats || []).map(c => `
        <div class="multi-select-option">
          <input type="checkbox" id="category-${esc(c)}" value="${esc(c)}" ${state.selectedCategories.includes(c) ? 'checked' : ''}>
          <label for="category-${esc(c)}">${esc(c)}</label>
        </div>
      `).join('');
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.id === 'category-all') {
          if (e.target.checked) {
            state.selectedCategories = [];
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (cb.id !== 'category-all') cb.checked = false; });
          }
        } else {
          if (e.target.checked) {
            state.selectedCategories.push(e.target.value);
            id('category-all').checked = false;
          } else {
            state.selectedCategories = state.selectedCategories.filter(c => c !== e.target.value);
          }
        }
        updateSelectedCategoriesCount();
      });
    });
    updateSelectedCategoriesCount();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// ----- Load + Render -----
let last = { dates: [], totals: [], pivot: [], colTotals: [] };

async function loadAll() {
  const from = id('from').value;
  const to = id('to').value;
  const planTypes = state.selectedPlans.length > 0 ? state.selectedPlans.join(',') : 'ALL';
  const categories = state.selectedCategories.length > 0 ? state.selectedCategories.join(',') : 'ALL';

  if (!from || !to) { alert('Please select both From and To dates'); return; }

  id('lastUpdated').innerHTML = '<span class="loading"></span> Loading...';
  id('loadBtn').disabled = true;

  try {
    const summary = await fetchJson(`${API_BASE}/api/summary?from=${from}&to=${to}&plan_types=${encodeURIComponent(planTypes)}`);
    updateStats(summary);

    const totals = await fetchJson(`${API_BASE}/api/tickets?from=${from}&to=${to}&plan_types=${encodeURIComponent(planTypes)}`);

    const params = new URLSearchParams({
      from, to,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      plan_types: planTypes,
      categories
    });
    const pivot = await fetchJson(`${API_BASE}/api/pivot?${params.toString()}`);

    const dates = [...new Set(pivot.map(r => r.date))].sort();
    const dIndex = new Map(dates.map((d, i) => [d, i]));

    const groups = [];
    const gSeen = new Set();
    for (const r of pivot) {
      const g = String(r.category ?? '');
      if (!gSeen.has(g)) { gSeen.add(g); groups.push(g); }
    }
    const gIndex = new Map(groups.map((g, i) => [g, i]));

    const R = groups.length, C = dates.length;
    const matrix = Array.from({ length: R }, () => Array(C).fill(0));
    for (const r of pivot) {
      const gi = gIndex.get(String(r.category ?? ''));
      const di = dIndex.get(r.date);
      if (gi != null && di != null) matrix[gi][di] = Number(r.count || 0);
    }

    const totalsMap = new Map(totals.map(t => [t.date, Number(t.count || 0)]));
    const colTotals = dates.map(d => totalsMap.get(d) || 0);

    last = { dates, totals, pivot: { groups, matrix }, colTotals };

    renderChart(dates, colTotals);
    renderTable();
    
    id('lastUpdated').innerHTML = `Last updated: ${new Date().toLocaleString()}`;
    id('tableInfo').textContent = `Showing ${groups.length} categories across ${dates.length} days`;
    id('empty').hidden = pivot.length > 0;
  } catch (error) {
    console.error('Error loading data:', error);
    id('lastUpdated').textContent = 'Error loading data';
    alert('Failed to load data. Please check your connection and try again.');
  } finally {
    id('loadBtn').disabled = false;
  }
}

function updateStats(summary) {
  id('totalTickets').textContent = summary.total_tickets || '0';
  id('dailyAverage').textContent = Math.round(summary.avg_daily_tickets || 0);
  id('totalDays').textContent = summary.total_days || '0';
  id('totalCategories').textContent = summary.total_categories || '0';
}

function renderLast() {
  if (!last.dates.length) return;
  renderChart(last.dates, last.colTotals);
  renderTable();
}

function renderChart(labels, data) {
  const ctx = id('dailyChart').getContext('2d');
  const trendData = state.showTrend ? calculateTrendLine(data) : null;
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Distinct Tickets per day',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 6,
          order: 2
        },
        ...(trendData ? [{
          label: 'Trend',
          data: trendData,
          type: 'line',
          borderColor: 'rgba(239, 68, 68, 0.8)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 1
        }] : [])
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.08)' },
          ticks: { color: '#cbd5e1' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,.08)' },
          ticks: { color: '#cbd5e1', precision: 0 }
        }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  });
}

function calculateTrendLine(data) {
  if (data.length < 2) return null;
  const n = data.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = data;
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - xMean) * (y[i] - yMean); den += (x[i] - xMean) ** 2; }
  const m = num / den, b = yMean - m * xMean;
  return x.map(xi => m * xi + b);
}

function renderTable() {
  const { dates, colTotals } = last;
  const { groups, matrix } = last.pivot;
  const thead = id('thead'), tbody = id('tbody');
  thead.innerHTML = ''; tbody.innerHTML = '';

  if (!dates.length || !groups.length) { id('empty').hidden = false; return; }

  const rowTotals = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const idx = Array.from({ length: groups.length }, (_, i) => i);
  const dir = state.sortOrder === 'asc' ? 1 : -1;

  if (state.sortBy === 'category') {
    idx.sort((i, j) => dir * cmp(groups[i], groups[j]));
  } else {
    idx.sort((i, j) => {
      const d = (rowTotals[i] - rowTotals[j]) * dir;
      return d !== 0 ? d : dir * cmp(groups[i], groups[j]);
    });
  }

  const colMax = dates.map((_, j) => matrix.reduce((m, row) => Math.max(m, row[j]), 0));

  let h = '<tr><th>Category</th>';
  for (const d of dates) h += `<th>${formatDate(d)}</th>`;
  h += '<th>Total</th></tr>';
  thead.innerHTML = h;

  let rows = '';
  for (const i of idx) {
    const rowTotal = rowTotals[i];
    rows += `<tr><td><strong>${esc(groups[i])}</strong></td>`;
    for (let j = 0; j < dates.length; j++) {
      const v = matrix[i][j] || 0;
      const pct = colTotals[j] ? (100 * v / colTotals[j]) : 0;
      const text = state.showPercent ? (colTotals[j] ? `${pct.toFixed(1)}%` : '') : (v ? String(v) : '-');
      const klass = state.heatmap ? heat(v, colMax[j]) : '';
      const title = state.showPercent
        ? `${v} tickets (${pct.toFixed(1)}% of ${colTotals[j]} distinct tickets)`
        : `${v} tickets (out of ${colTotals[j]} distinct)`;
      rows += `<td class="${klass}" title="${title}">${text}</td>`;
    }
    rows += `<td class="total"><strong>${rowTotal}</strong></td></tr>`;
  }

  const grandTotal = colTotals.reduce((a, b) => a + b, 0);
  rows += `<tr class="total"><td><strong>Total Distinct Tickets</strong></td>${colTotals.map(x => `<td><strong>${x}</strong></td>`).join('')}<td><strong>${grandTotal}</strong></td></tr>`;
  tbody.innerHTML = rows;
  id('empty').hidden = true;
}

// ----- Helpers -----
function id(x) { return document.getElementById(x); }
function toStr(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${da}`; }
function formatDate(dateStr) { const date = new Date(dateStr); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fetchJson(u) { return fetch(u).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function cmp(a, b) { a = String(a ?? '').toLowerCase(); b = String(b ?? '').toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }
function heat(v, max) { if (!max || !v) return ''; const r = v / max; if (r >= 0.8) return 'h5'; if (r >= 0.6) return 'h4'; if (r >= 0.4) return 'h3'; if (r >= 0.2) return 'h2'; return 'h1'; }
