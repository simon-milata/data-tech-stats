import { getRepoList, getRepoComparison } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip } from './chartUtils.js';

const MAX_SELECTION = 5;
const COLORS = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40'
];

let allRepos = [];
let selectedRepos = new Set();
let currentMetric = 'stars';
let currentRange = 'weekly';
let chart = null;
let latestUpdateId = 0;
let searchTerm = '';
let selectedContainer = null;

const repoListContainer = document.getElementById('repoListContainer');
const repoSearch = document.getElementById('repoSearch');
const metricSwitcher = document.getElementById('metricSwitcher');
const repoComparisonRangeSwitcher = document.getElementById('compRangeSwitcher');
const ctx = document.getElementById('repoComparisonChart') ? document.getElementById('repoComparisonChart').getContext('2d') : null;
const repoComparisonLegend = document.getElementById('repoComparisonLegend');

export async function initRepoComparisonChart() {
    if (!ctx) return; // Guard in case element is missing

    try {
        const repos = await getRepoList();
        // Sort repos alphabetically
        allRepos = repos.sort((a, b) => a.name.localeCompare(b.name));
        
        setupSelectionUI();

        // Setup event listeners
        setupSearch();
        setupMetricSwitcher();
        setupRangeSwitcher();
        injectStyles();
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
    
    repoSearch.parentNode.insertBefore(wrapper, repoSearch);
    wrapper.appendChild(repoSearch);

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
    selectedRepos.forEach(repo => {
        const chip = document.createElement('div');
        chip.className = 'selected-repo-chip';
        chip.innerHTML = `
            <span>${repo}</span>
            <button type="button" class="remove-repo-btn" aria-label="Remove ${repo}">&times;</button>
        `;
        chip.querySelector('.remove-repo-btn').onclick = () => toggleRepo(repo);
        selectedContainer.appendChild(chip);
    });
}

function renderOptions() {
    repoListContainer.innerHTML = '';
    const maxReached = selectedRepos.size >= MAX_SELECTION;

    const filtered = allRepos.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const notSelected = !selectedRepos.has(r.name);
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

    filtered.forEach(repo => {
        const div = document.createElement('div');
        div.className = 'repo-option';
        if (maxReached) {
            div.classList.add('disabled');
            div.title = `Max ${MAX_SELECTION} repositories selected`;
        }
        div.textContent = repo.name;
        if (!maxReached) {
            div.onclick = () => toggleRepo(repo.name);
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

function toggleRepo(repoName) {
    if (selectedRepos.has(repoName)) {
        selectedRepos.delete(repoName);
    } else {
        if (selectedRepos.size >= MAX_SELECTION) return;
        selectedRepos.add(repoName);
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

function moveMetricSwitcherToHeader() {
    if (!metricSwitcher || !repoComparisonRangeSwitcher) return;
    
    const headerContainer = repoComparisonRangeSwitcher.parentElement;
    if (headerContainer) {
        headerContainer.insertBefore(metricSwitcher, repoComparisonRangeSwitcher);
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
    const data = await getRepoComparison(reposArray, currentRange);
    
    if (updateId !== latestUpdateId) return;

    if (!data || data.length === 0) return;

    const labels = data.map(d => formatWeekLabel(d.date, currentRange));
    const datasets = reposArray.map((repoName, index) => {
        return {
            label: repoName,
            data: data.map(d => d.repos[repoName] ? d.repos[repoName][currentMetric] : null),
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
                    mode: 'nearest',
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

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #selectedReposContainer {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }
        .selected-repo-chip {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .selected-repo-chip:hover {
            background: #dbeafe;
        }
        .remove-repo-btn {
            background: none;
            border: none;
            color: #3b82f6;
            font-size: 1.2rem;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            opacity: 0.7;
        }
        .remove-repo-btn:hover {
            opacity: 1;
            color: #1d4ed8;
        }

        .repo-search-wrapper {
            display: flex;
            gap: 8px;
            margin-bottom: 0.5rem;
        }
        .repo-search-wrapper input {
            margin-bottom: 0 !important;
            flex: 1;
        }
        
        .repo-toggle-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            color: #64748b;
            cursor: pointer;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .repo-toggle-btn:hover {
            background: #f1f5f9;
            color: #334155;
            border-color: #94a3b8;
        }
        
        #repoListContainer {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            max-height: 240px;
            overflow-y: auto;
            margin-top: 8px;
            margin-bottom: 1.5rem;
            background: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        #repoListContainer:empty {
            display: none;
            margin: 0;
            border: none;
            box-shadow: none;
        }
        
        .repo-option {
            padding: 10px 14px;
            cursor: pointer;
            font-size: 0.9rem;
            color: #475569;
            border-bottom: 1px solid #f1f5f9;
            transition: background 0.15s;
        }
        .repo-option:last-child {
            border-bottom: none;
        }
        .repo-option:hover:not(.disabled) {
            background: #f8fafc;
            color: #0f172a;
        }
        .repo-option.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #f1f5f9;
        }
        
        .no-results {
            padding: 12px;
            color: #94a3b8;
            text-align: center;
            font-size: 0.9rem;
        }
        /* Scrollbar for repo list */
        #repoListContainer::-webkit-scrollbar {
            width: 6px;
        }
        #repoListContainer::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        #repoListContainer::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        #repoListContainer::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    `;
    document.head.appendChild(style);
}