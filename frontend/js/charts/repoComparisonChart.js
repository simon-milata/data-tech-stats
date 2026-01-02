import { getRepoList, getRepoComparison } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip } from './chartUtils.js';

const MAX_SELECTION = 5;
const COLORS = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444',
    '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

let allRepos = [];
let selectedRepos = new Set();
let currentMetric = 'stars';
let currentView = 'historical';
let currentRange = 'weekly';
let chart = null;
let latestUpdateId = 0;
let searchTerm = '';
let selectedContainer = null;
let tooltipEl = null;

const repoListContainer = document.getElementById('repoListContainer');
const repoSearch = document.getElementById('repoSearch');
const metricSwitcher = document.getElementById('metricSwitcher');
const repoComparisonViewSwitcher = document.getElementById('compViewSwitcher');
const repoComparisonRangeSwitcher = document.getElementById('compRangeSwitcher');
const ctx = document.getElementById('repoComparisonChart') ? document.getElementById('repoComparisonChart').getContext('2d') : null;
const repoComparisonLegend = document.getElementById('repoComparisonLegend');

export async function initRepoComparisonChart() {
    if (!ctx) return; // Guard in case element is missing

    try {
        const repos = await getRepoList();
        // Sort repos by stars (descending)
        allRepos = repos.sort((a, b) => {
            const starDiff = (b.stars || 0) - (a.stars || 0);
            if (starDiff !== 0) return starDiff;
            // Secondary sort by ID to handle duplicate names/stars consistently
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });
        
        setupSelectionUI();

        // Setup event listeners
        setupSearch();
        setupMetricSwitcher();
        setupRangeSwitcher();
        setupViewSwitcher();
        moveMetricSwitcherToHeader();
        
        renderUI();
        
    } catch (err) {
        console.error('Failed to initialize comparison chart:', err);
    }
}

function setupSelectionUI() {
    selectedContainer = document.createElement('div');
    selectedContainer.id = 'selectedReposContainer';
    repoSearch.parentNode.insertBefore(selectedContainer, repoSearch);
    repoSearch.placeholder = "Search to add repositories...";

    // Create wrapper for search input and toggle button
    const wrapper = document.createElement('div');
    wrapper.className = 'repo-search-wrapper';
    wrapper.style.position = 'relative';
    
    repoSearch.parentNode.insertBefore(wrapper, repoSearch);
    wrapper.appendChild(repoSearch);

    if (repoListContainer) {
        wrapper.appendChild(repoListContainer);
        repoListContainer.style.position = 'absolute';
        repoListContainer.style.top = '100%';
        repoListContainer.style.left = '0';
        repoListContainer.style.right = '0';
        repoListContainer.style.zIndex = '50';
        repoListContainer.style.maxHeight = '300px';
        repoListContainer.style.overflowY = 'auto';
        repoListContainer.style.borderRadius = '0.5rem';
        repoListContainer.style.marginTop = '4px';
    }

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'repoListToggleBtn';
    toggleBtn.className = 'repo-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;
    toggleBtn.title = "Toggle repository list";
    toggleBtn.style.transform = 'rotate(180deg)'; // Initially open
    
    toggleBtn.onclick = toggleRepoList;
    
    wrapper.appendChild(toggleBtn);
}

function renderUI() {
    renderSelected();
    renderOptions();
}

function renderSelected() {
    selectedContainer.innerHTML = '';
    selectedRepos.forEach(repoId => {
        const repo = allRepos.find(r => r.id === repoId);
        const repoName = repo ? repo.name : repoId;

        const chip = document.createElement('div');
        chip.className = 'selected-repo-chip';
        chip.innerHTML = `
            <span>${repoName}</span>
            <button type="button" class="remove-repo-btn" aria-label="Remove ${repoName}">&times;</button>
        `;
        chip.querySelector('.remove-repo-btn').onclick = () => toggleRepo(repoId);
        selectedContainer.appendChild(chip);
    });
}

function renderOptions() {
    hideTooltip();
    repoListContainer.innerHTML = '';
    const maxReached = selectedRepos.size >= MAX_SELECTION;

    const filtered = allRepos.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const notSelected = !selectedRepos.has(r.id);
        return matchesSearch && notSelected;
    });

    if (filtered.length === 0) {
        if (searchTerm) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.textContent = 'No matching repositories found';
            repoListContainer.appendChild(msg);
        }
        return;
    }

    const canHover = window.matchMedia('(hover: hover)').matches;

    filtered.forEach(repo => {
        const div = document.createElement('div');
        div.className = 'repo-option';
        if (maxReached) {
            div.classList.add('disabled');
            div.title = `Max ${MAX_SELECTION} repositories selected`;
        }

        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        const stars = repo.stars || 0;
        const starsFormatted = new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stars).toLowerCase();
        const displayName = repo.name.length > 20 ? repo.name.substring(0, 20) + '...' : repo.name;
        div.innerHTML = `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 8px;">${displayName}</span> <span style="color: #94a3b8; font-size: 0.85em; white-space: nowrap;">★ ${starsFormatted}</span>`;

        if (canHover) {
            div.addEventListener('mouseenter', (e) => showTooltip(e, repo));
            div.addEventListener('mousemove', moveTooltip);
            div.addEventListener('mouseleave', hideTooltip);
        } else {
            div.style.userSelect = 'none';

            let pressTimer;
            let isLongPress = false;

            div.addEventListener('touchstart', (e) => {
                isLongPress = false;
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    const touch = e.touches[0];
                    showTooltip({ clientX: touch.clientX, clientY: touch.clientY }, repo);
                }, 500);
            }, { passive: true });

            div.addEventListener('touchend', (e) => {
                clearTimeout(pressTimer);
                hideTooltip();
                if (isLongPress && e.cancelable) e.preventDefault();
            });

            div.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
                hideTooltip();
            }, { passive: true });

            div.addEventListener('contextmenu', e => e.preventDefault());
        }

        if (!maxReached) {
            div.onclick = () => toggleRepo(repo.id);
        }
        repoListContainer.appendChild(div);
    });
}

function setupSearch() {
    repoSearch.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderOptions();
        
        if (repoListContainer.style.display === 'none') {
            toggleRepoList();
        }
    });
}

function toggleRepo(repoId) {
    if (selectedRepos.has(repoId)) {
        selectedRepos.delete(repoId);
    } else {
        if (selectedRepos.size >= MAX_SELECTION) return;
        selectedRepos.add(repoId);
        repoSearch.value = '';
        searchTerm = '';
    }
    renderUI();
    updateChart();
}

function toggleRepoList() {
    const btn = document.getElementById('repoListToggleBtn');
    if (repoListContainer.style.display === 'none') {
        repoListContainer.style.display = '';
        if (btn) btn.style.transform = 'rotate(180deg)';
    } else {
        repoListContainer.style.display = 'none';
        if (btn) btn.style.transform = 'rotate(0deg)';
    }
}

function setupMetricSwitcher() {
    metricSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('metric-btn')) {
            metricSwitcher.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMetric = e.target.dataset.metric;
            updateChart();
        }
    });
}

function setupRangeSwitcher() {
    if (!repoComparisonRangeSwitcher) return;
    repoComparisonRangeSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('range-btn')) {
            repoComparisonRangeSwitcher.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentRange = e.target.dataset.range;
            updateChart();
        }
    });
}

function setupViewSwitcher() {
    if (!repoComparisonViewSwitcher) return;
    repoComparisonViewSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('range-btn')) {
            repoComparisonViewSwitcher.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const newView = e.target.dataset.view;
            if (currentView !== newView) {
                currentView = newView;
                updateControlsVisibility();
                updateChart();
            }
        }
    });
}

function updateControlsVisibility() {
    const isComparison = currentView === 'comparison';
    if (metricSwitcher) {
        metricSwitcher.style.display = isComparison ? 'none' : 'inline-flex';
    }
}

function moveMetricSwitcherToHeader() {
    if (!metricSwitcher) return;
    
    const headerContainer = document.querySelector('.graph-card[data-chart-type="comparison"] .controls');
    if (headerContainer) {
        headerContainer.appendChild(metricSwitcher);
        metricSwitcher.style.marginBottom = '0';
        metricSwitcher.style.marginRight = '12px';
        metricSwitcher.style.display = 'inline-flex';
        metricSwitcher.style.alignItems = 'center';
        metricSwitcher.style.verticalAlign = 'middle';
        metricSwitcher.style.flexWrap = 'nowrap';
    }
}

async function updateChart() {
    const updateId = ++latestUpdateId;

    if (selectedRepos.size === 0) {
        if (chart) {
            chart.destroy();
            chart = null;
        }
        repoComparisonLegend.innerHTML = '';
        return;
    }

    const reposArray = Array.from(selectedRepos);
    let data;
    try {
        data = await getRepoComparison(currentRange);
    } catch (error) {
        console.error("Failed to fetch repo comparison data:", error);
        return;
    }
    
    if (updateId !== latestUpdateId) return;

    if (!data || Object.keys(data).length === 0) return;

    if (currentView === 'comparison') {
        if (chart && chart.config.type !== 'bar') {
            chart.destroy();
            chart = null;
        }

        const metrics = ['stars', 'size', 'forks', 'open_issues'];
        const metricLabels = ['Stars', 'Size', 'Forks', 'Open Issues'];
        
        // Calculate max for normalization
        const maxValues = {};
        metrics.forEach(m => maxValues[m] = 0);

        reposArray.forEach(repoId => {
            const repoData = data[repoId];
            if (repoData && repoData.history && repoData.history.length > 0) {
                const latest = repoData.history.reduce((a, b) => (a.date > b.date ? a : b));
                metrics.forEach(m => {
                    if ((latest[m] || 0) > maxValues[m]) {
                        maxValues[m] = latest[m];
                    }
                });
            }
        });
        
        metrics.forEach(m => { if (maxValues[m] === 0) maxValues[m] = 1; });

        const datasets = reposArray.map((repoId, index) => {
            const repo = allRepos.find(r => r.id === repoId);
            const repoName = repo ? repo.name : repoId;
            const repoData = data[repoId];
            let latest = {};
            if (repoData && repoData.history && repoData.history.length > 0) {
                latest = repoData.history.reduce((a, b) => (a.date > b.date ? a : b));
            }

            return {
                label: repoName,
                data: metrics.map(m => ((latest[m] || 0) / maxValues[m]) * 100),
                originalData: metrics.map(m => latest[m] || 0),
                backgroundColor: COLORS[index % COLORS.length],
                borderColor: COLORS[index % COLORS.length],
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            };
        });

        if (chart) {
            chart.data.labels = metricLabels;
            chart.data.datasets = datasets;
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'bar',
                data: { labels: metricLabels, datasets: datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false, external: externalTooltip }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100,
                            grid: { color: 'rgba(147,155,166,0.06)' },
                            ticks: { 
                                color: '#94a3b8',
                                callback: function(value) { return value + '%'; } 
                            },
                            title: { display: true, text: '% of Max Value', color: '#94a3b8', font: { size: 11 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    }
                }
            });
        }
        renderLegend(chart, repoComparisonLegend);
        return;
    }

    if (chart && chart.config.type !== 'line') {
        chart.destroy();
        chart = null;
    }

    const allDates = new Set();
    reposArray.forEach(repoId => {
        const repoData = data[repoId];
        if (repoData && repoData.history) {
            repoData.history.forEach(h => allDates.add(h.date));
        }
    });
    const sortedDates = Array.from(allDates).sort();

    const labels = sortedDates.map(d => formatWeekLabel(d, currentRange));
    const datasets = reposArray.map((repoId, index) => {
        const repo = allRepos.find(r => r.id === repoId);
        const repoName = repo ? repo.name : repoId;
        const repoData = data[repoId];
        const history = (repoData && repoData.history) ? repoData.history : [];

        return {
            label: repoName,
            data: sortedDates.map(date => {
                const entry = history.find(h => h.date === date);
                return entry ? entry[currentMetric] : null;
            }),
            borderColor: COLORS[index % COLORS.length],
            backgroundColor: COLORS[index % COLORS.length] + '22',
            fill: false,
            tension: 0.36,
            borderWidth: 3.5,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: COLORS[index % COLORS.length],
            pointBorderWidth: 3.5,
            hitRadius: 8,
            hoverBorderWidth: 3
        };
    });

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update();
        renderLegend(chart, repoComparisonLegend);
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    axis: 'x',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: { enabled: false, external: externalTooltip }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(147,155,166,0.06)' },
                        ticks: { color: '#94a3b8', callback: v => v >= 1000 ? Math.round(v/1000)+'k' : v }
                    }
                }
            }
        });
        renderLegend(chart, repoComparisonLegend);
    }
}

function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'repo-list-tooltip';
    document.body.appendChild(tooltipEl);
}

function showTooltip(e, repo) {
    createTooltip();
    tooltipEl.innerHTML = `
        <div class="tt-row"><span class="tt-label">ID:</span> <span class="tt-val">${repo.id}</span></div>
        <div class="tt-row"><span class="tt-label">Stars:</span> <span class="tt-val">${repo.stars ? repo.stars.toLocaleString() : 0}</span></div>
    `;
    tooltipEl.style.display = 'block';
    moveTooltip(e);
}

function moveTooltip(e) {
    if (!tooltipEl) return;
    tooltipEl.style.left = (e.clientX + 12) + 'px';
    tooltipEl.style.top = (e.clientY + 12) + 'px';
}

function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
}
