import { getLanguagesTimeseries } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip, setupChartInteractions } from './chartUtils.js';

let langChartInstance = null;
let allLanguagesWithCounts = [];
let rawLanguageData = {};
let isInitializing = false;
let currentView = 'historical';
let globalLabels = [];

const colors = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444',
    '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

function getSelectedLanguages() {
    const items = document.querySelectorAll('.language-selector-item.selected');
    const selected = Array.from(items).map(item => item.dataset.lang);
    return selected.length > 0 ? selected : allLanguagesWithCounts.slice(0, 10).map(l => l.lang);
}

function renderSelector() {
    const container = document.getElementById('languageSelectorContainer');
    if (!container) return;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'language-selector-wrapper';

    const toggle = document.createElement('button');
    toggle.className = 'language-selector-toggle';
    toggle.textContent = 'Select Languages';

    const popup = document.createElement('div');
    popup.className = 'language-selector-popup';
    popup.style.display = 'none';

    const topLanguagesSet = new Set(allLanguagesWithCounts.slice(0, 10).map(l => l.lang));
    isInitializing = true;

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'language-selector-items';

    allLanguagesWithCounts.forEach(({ lang, count }) => {
        const item = document.createElement('div');
        item.className = 'language-selector-item';
        item.dataset.lang = lang;
        if (topLanguagesSet.has(lang)) item.classList.add('selected');

        item.innerHTML = `<span class="lang-name">${lang}</span><span class="lang-count">${count}</span>`;

        item.addEventListener('click', () => {
            if (isInitializing) return;
            const isSelected = item.classList.contains('selected');
            const selectedCount = popup.querySelectorAll('.language-selector-item.selected').length;

            if (isSelected) {
                item.classList.remove('selected');
                updateLanguagesChart();
                updateToggleText(popup);
            } else if (selectedCount < 10) {
                item.classList.add('selected');
                updateLanguagesChart();
                updateToggleText(popup);
                updateLimitMessage(popup);
            }
        });

        itemsContainer.appendChild(item);
    });

    popup.appendChild(itemsContainer);

    const limitMsg = document.createElement('div');
    limitMsg.className = 'language-selector-limit';
    limitMsg.textContent = 'Max 10 languages';
    popup.insertBefore(limitMsg, popup.firstChild);

    isInitializing = false;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            popup.style.display = 'none';
        }
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(popup);
    container.appendChild(wrapper);

    updateToggleText(popup);
    updateLimitMessage(popup);
}

function updateToggleText(popup) {
    const toggle = popup.parentElement.querySelector('.language-selector-toggle');
    const count = popup.querySelectorAll('.language-selector-item.selected').length;
    toggle.innerHTML = count > 0 ? `Languages <span class="toggle-count">(${count})</span>` : 'Select Languages';
}

function updateLimitMessage(popup) {
    const count = popup.querySelectorAll('.language-selector-item.selected').length;
    const limitMsg = popup.querySelector('.language-selector-limit');
    if (limitMsg) {
        limitMsg.classList.toggle('show-warning', count >= 10);
    }
}

function setupViewSwitcher() {
    const switcher = document.getElementById('languagesViewSwitcher');
    if (!switcher) return;
    if (switcher.dataset.listenerAttached) return;
    switcher.dataset.listenerAttached = 'true';

    switcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('range-btn')) {
            switcher.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const newView = e.target.dataset.view;
            if (currentView !== newView) {
                currentView = newView;
                updateLanguagesChart();
            }
        }
    });
}

function updateLanguagesChart() {
    const canvas = document.querySelector('#languagesCountsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (langChartInstance) {
        const isDoughnut = langChartInstance.config.type === 'doughnut';
        const wantDoughnut = currentView === 'comparison';
        if (isDoughnut !== wantDoughnut) {
            langChartInstance.destroy();
            langChartInstance = null;
        }
    }

    const selectedLangs = getSelectedLanguages();

    if (currentView === 'comparison') {
        const selectedSet = new Set(selectedLangs);
        const displayedLangs = allLanguagesWithCounts.filter(l => selectedSet.has(l.lang));
        const otherLangs = allLanguagesWithCounts.filter(l => !selectedSet.has(l.lang));
        const otherCount = otherLangs.reduce((acc, curr) => acc + curr.count, 0);

        const chartData = displayedLangs.map(l => ({ lang: l.lang, count: l.count }));
        if (otherCount > 0) {
            chartData.push({ lang: 'Other', count: otherCount });
        }

        const labels = chartData.map(i => i.lang);
        const dataValues = chartData.map(i => i.count);
        const bgColors = chartData.map(i => {
            if (i.lang === 'Other') return '#cbd5e1';
            const idx = allLanguagesWithCounts.findIndex(l => l.lang === i.lang);
            return colors[idx % colors.length];
        });

        const dataset = {
            data: dataValues,
            backgroundColor: bgColors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
        };

        if (langChartInstance) {
            langChartInstance.data.labels = labels;
            langChartInstance.data.datasets = [dataset];
            langChartInstance.update();
        } else {
            langChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [dataset]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    interaction: {
                        mode: 'dataset',
                        intersect: false,
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { 
                            enabled: false, 
                            external: externalTooltip,
                            callbacks: { title: () => 'Latest Count' }
                        }
                    }
                }
            });
            setupChartInteractions(canvas, () => langChartInstance);
        }
    } else {
        const newDatasets = selectedLangs.map((lang) => {
        const langIndex = allLanguagesWithCounts.findIndex(l => l.lang === lang);
        const color = colors[langIndex % colors.length];
        const langData = rawLanguageData[lang] || [];

        return {
            label: lang,
            data: langData,
            borderColor: color,
            backgroundColor: color + '22',
            fill: false,
            tension: 0.36,
            borderWidth: 3.5,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: color,
            pointBorderWidth: 3.5,
            hitRadius: 8,
            hoverBorderWidth: 3
        };
    });

        if (langChartInstance) {
            langChartInstance.data.labels = globalLabels;
            langChartInstance.data.datasets = newDatasets;
            langChartInstance.update();
        } else {
            langChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: globalLabels,
                    datasets: newDatasets
                },
                options: {
                    events: [],
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                        y: { grid: { color: 'rgba(147,155,166,0.06)' }, ticks: { color: '#94a3b8', callback: v => v >= 1000 ? Math.round(v / 1000) + 'k' : v } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false, external: externalTooltip }
                    },
                    interaction: { mode: 'index', axis: 'x', intersect: false }
                }
            });
            setupChartInteractions(canvas, () => langChartInstance);
        }
    }
    renderLegend(langChartInstance, document.getElementById('languagesLegend'));
}

export async function renderLanguagesCountsChart(range = 'weekly') {
    const data = await getLanguagesTimeseries(range);
    if (!data || !data.length) return;

    globalLabels = data.map(d => formatWeekLabel(d.date, range));
    const sample = data[data.length - 1];
    const countsObj = sample.counts || {};
    const allLanguages = Object.keys(countsObj);

    rawLanguageData = {};
    allLanguages.forEach(lang => {
        rawLanguageData[lang] = data.map(d => {
            const counts = d.counts || {};
            return Number(counts[lang] || 0);
        });
    });

    allLanguagesWithCounts = allLanguages.map(lang => ({
        lang,
        count: countsObj[lang] || 0
    })).sort((a, b) => (b.count - a.count));

    renderSelector();
    setupViewSwitcher();
    updateLanguagesChart();
}
