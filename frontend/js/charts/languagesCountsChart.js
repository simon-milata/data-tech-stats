import { getLanguagesTimeseries } from "../api.js";

let langChartInstance = null;
let allLanguagesWithCounts = [];
let rawLanguageData = {}; // Store raw data by language
let isInitializing = false; // Prevent updates during initialization
const colors = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444', '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

// Get currently selected languages from checkboxes
function getSelectedLanguages(){
    const checkboxes = document.querySelectorAll('.language-selector-popup input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    if(selected.length > 0) return selected;
    // Default to top 10
    return allLanguagesWithCounts.slice(0, 10).map(l => l.lang);
}

// Render the language selector popup
function renderSelector(){
    const container = document.getElementById('languageSelectorContainer');
    if(!container) return;
    
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'language-selector-wrapper';
    
    // Create toggle button
    const toggle = document.createElement('button');
    toggle.className = 'language-selector-toggle';
    toggle.textContent = 'Select Languages';
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'language-selector-popup';
    popup.style.display = 'none';
    
    const topLanguagesSet = new Set(allLanguagesWithCounts.slice(0, 10).map(l => l.lang));
    isInitializing = true;
    
    allLanguagesWithCounts.forEach(({lang, count}) => {
        const label = document.createElement('label');
        label.className = 'language-selector-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = lang;
        checkbox.checked = topLanguagesSet.has(lang);
        
        const labelText = document.createElement('span');
        labelText.className = 'language-selector-label';
        labelText.innerHTML = `<span class="lang-name">${lang}</span><span class="lang-count">${count}</span>`;
        
        label.appendChild(checkbox);
        label.appendChild(labelText);
        
        checkbox.addEventListener('change', () => {
            if(isInitializing) return;
            const selected = Array.from(popup.querySelectorAll('input[type="checkbox"]:checked'));
            if(selected.length > 10){
                checkbox.checked = false;
            } else {
                updateLanguagesChart();
                updateToggleText(popup);
            }
        });
        
        popup.appendChild(label);
    });
    
    isInitializing = false;
    
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', (e) => {
        if(!wrapper.contains(e.target)){
            popup.style.display = 'none';
        }
    });
    
    wrapper.appendChild(toggle);
    wrapper.appendChild(popup);
    container.appendChild(wrapper);
    
    updateToggleText(popup);
}

function updateToggleText(popup){
    const toggle = popup.parentElement.querySelector('.language-selector-toggle');
    const count = popup.querySelectorAll('input[type="checkbox"]:checked').length;
    toggle.textContent = count > 0 ? `Languages (${count})` : 'Select Languages';
}

// Update chart with selected languages
function updateLanguagesChart(){
    if(!langChartInstance) return;
    
    const selectedLangs = getSelectedLanguages();
    
    // Create new datasets for selected languages
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
    renderLegend(langChartInstance);
}

export async function renderLanguagesCountsChart(range = 'weekly'){
    const data = await getLanguagesTimeseries(range);
    if(!data || !data.length) return;

    const labels = data.map(d => d.date);
    
    // Extract all unique languages from the latest data point
    const sample = data[data.length - 1];
    const countsObj = sample.counts || {};
    const allLanguages = Object.keys(countsObj);

    // Store raw data for each language
    rawLanguageData = {};
    allLanguages.forEach(lang => {
        rawLanguageData[lang] = data.map(d => {
            const counts = d.counts || {};
            return Number(counts[lang] || 0);
        });
    });

    // Sort languages by their latest count (most popular first)
    allLanguagesWithCounts = allLanguages.map(lang => ({
        lang,
        count: countsObj[lang] || 0
    })).sort((a, b) => (b.count - a.count));

    // Get top 10 languages for initial display
    const topLanguages = allLanguagesWithCounts.slice(0, 10).map(l => l.lang);

    // Create datasets for top 10 languages initially
    const datasets = topLanguages.map((lang, i) => {
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
    if(!canvas) return;
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
                y: { grid: { color: 'rgba(147,155,166,0.06)' }, ticks: { color: '#94a3b8', callback: v => v >= 1000 ? Math.round(v/1000)+'k' : v } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltip }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    };

    if(langChartInstance){
        langChartInstance.data.labels = labels;
        langChartInstance.data.datasets = datasets;
        langChartInstance.update();
        renderSelector();
        renderLegend(langChartInstance);
        return;
    }

    langChartInstance = new Chart(ctx, config);
    renderSelector();
    renderLegend(langChartInstance);
}

// Render a custom legend as styled chips
function renderLegend(chart){
    const container = document.getElementById('languagesLegend');
    if (!container) return;
    container.innerHTML = '';
    chart.data.datasets.forEach((ds, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = chart.isDatasetVisible(i) ? 'legend-chip active' : 'legend-chip';
        chip.dataset.index = i;
        chip.style.borderLeft = `8px solid ${ds.borderColor}`;
        chip.textContent = ds.label;
        chip.addEventListener('click', () => {
            const currentlyVisible = chart.isDatasetVisible(i);
            chart.setDatasetVisibility(i, !currentlyVisible);
            chip.classList.toggle('active', !currentlyVisible);
            chart.update();
        });
        container.appendChild(chip);
    });
}

// External HTML tooltip for Chart.js (same as multi-lines)
function externalTooltip(context){
    const {chart, tooltip} = context;
    const parent = chart.canvas.parentNode;
    let tip = parent.querySelector('.chart-tooltip');
    if (!tip){
        tip = document.createElement('div');
        tip.className = 'chart-tooltip';
        tip.innerHTML = '<div class="label"></div><div class="values"></div>';
        parent.appendChild(tip);
    }

    if (tooltip.opacity === 0){ tip.style.opacity = 0; return; }

    const title = tooltip.title && tooltip.title.length ? tooltip.title[0] : '';
    tip.querySelector('.label').textContent = title;

    const valuesEl = tip.querySelector('.values');
    valuesEl.innerHTML = '';

    if (tooltip.dataPoints && tooltip.dataPoints.length) {
        tooltip.dataPoints.forEach(dp => {
            const name = dp.dataset.label || '';
            const v = dp.parsed && (typeof dp.parsed.y !== 'undefined') ? dp.parsed.y : (dp.raw || '');
            const color = (dp.dataset && (dp.dataset.borderColor || dp.dataset.backgroundColor)) || '#000';

            const row = document.createElement('div');
            row.className = 'tt-line';
            row.innerHTML = `
                <span class="tt-dot" style="background:${color};"></span>
                <span class="tt-name">${name}</span>
                <span class="tt-val">${Number(v).toLocaleString()}</span>
            `;
            valuesEl.appendChild(row);
        });
    }

    const canvasRect = chart.canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const caretX = tooltip.caretX ?? (canvasRect.width / 2);
    const caretY = tooltip.caretY ?? (canvasRect.height / 2);

    const left = caretX + (canvasRect.left - parentRect.left);
    const top = caretY + (canvasRect.top - parentRect.top);

    tip.style.opacity = 0;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.transform = 'translate(0,0)';

    const tipWidth = tip.offsetWidth || 150;
    const tipHeight = tip.offsetHeight || 60;

    const spaceRight = parentRect.width - left;
    const spaceLeft = left;

    let finalLeft, finalTop, transform;

    const margin = 12;
    if (top - tipHeight - margin >= 0) {
        finalTop = top - margin;
        const centerMin = parentRect.width * 0.35;
        const centerMax = parentRect.width * 0.65;
        if (left > centerMin && left < centerMax) {
            if (spaceRight > tipWidth + 20) {
                finalLeft = left + 20;
                transform = 'translate(0, -100%)';
            } else if (spaceLeft > tipWidth + 20) {
                finalLeft = left - tipWidth - 20;
                transform = 'translate(0, -100%)';
            } else {
                finalLeft = left;
                transform = 'translate(-50%, -100%)';
            }
        } else {
            finalLeft = left;
            transform = 'translate(-50%, -100%)';
        }
    } else {
        finalTop = top + margin;
        if (spaceRight > tipWidth + 20) {
            finalLeft = left + 20;
            transform = 'translate(0, 0)';
        } else if (spaceLeft > tipWidth + 20) {
            finalLeft = left - tipWidth - 20;
            transform = 'translate(0, 0)';
        } else {
            finalLeft = left;
            transform = 'translate(-50%, 0)';
        }
    }

    const minLeft = 8;
    const maxLeft = parentRect.width - tipWidth - 8;
    finalLeft = Math.min(Math.max(finalLeft, minLeft), maxLeft);

    const minTop = 8;
    const maxTop = parentRect.height - tipHeight - 8;
    finalTop = Math.min(Math.max(finalTop, minTop), maxTop);

    tip.style.left = finalLeft + 'px';
    tip.style.top = finalTop + 'px';
    tip.style.transform = transform;
    tip.style.opacity = 1;
}
