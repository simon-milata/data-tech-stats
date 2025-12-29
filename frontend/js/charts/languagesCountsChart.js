import { getLanguagesTimeseries } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip } from './chartUtils.js';

let langChartInstance = null;
let allLanguagesWithCounts = [];
let rawLanguageData = {};
let isInitializing = false;

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

function updateLanguagesChart() {
    if (!langChartInstance) return;

    const selectedLangs = getSelectedLanguages();
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

    langChartInstance.data.datasets = newDatasets;
    langChartInstance.update();
    renderLegend(langChartInstance, document.getElementById('languagesLegend'));
}

export async function renderLanguagesCountsChart(range = 'weekly') {
    const data = await getLanguagesTimeseries(range);
    if (!data || !data.length) return;

    const labels = data.map(d => formatWeekLabel(d.date, range));
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

    const topLanguages = allLanguagesWithCounts.slice(0, 10).map(l => l.lang);
    const datasets = topLanguages.map((lang) => {
        const langIndex = allLanguagesWithCounts.findIndex(l => l.lang === lang);
        const color = colors[langIndex % colors.length];
        return {
            label: lang,
            data: rawLanguageData[lang],
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

    const canvas = document.querySelector('#languagesCountsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
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
    };

    if (langChartInstance) {
        langChartInstance.data.labels = labels;
        langChartInstance.data.datasets = datasets;
        langChartInstance.update();
        renderSelector();
        renderLegend(langChartInstance, document.getElementById('languagesLegend'));
        return;
    }

    langChartInstance = new Chart(ctx, config);
    renderSelector();
    renderLegend(langChartInstance, document.getElementById('languagesLegend'));
}
