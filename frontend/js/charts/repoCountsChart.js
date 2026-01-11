import { getRepoCountsByTopic } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip, isoWeekToDate, setupChartInteractions, setupViewSwitcher, setupRangeSwitcher, toggleLoading } from './chartUtils.js';

let chart = null;
let currentView = 'comparison';
let currentRange = 'weekly';
let lastLabels = [];
let lastSortedData = [];
let lastTopics = [];
let hiddenTopics = new Set();

const colors = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444', '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

function toReadableKey(k){ return k.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

function updateChart() {
    const canvas = document.getElementById('repoCountsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chart) {
        const isBar = chart.config.type === 'bar';
        const wantBar = currentView === 'comparison';
        if (isBar !== wantBar) {
            chart.destroy();
            chart = null;
        }
    }

    if (currentView === 'comparison') {
        const newest = lastSortedData[lastSortedData.length - 1] || {};
        
        const sortedTopics = lastTopics.map((t, i) => {
            let val = 0;
            if (newest.counts && typeof newest.counts[t] !== 'undefined') val = Number(newest.counts[t] || 0);
            else if (typeof newest[t] !== 'undefined') val = Number(newest[t] || 0);
            return { t, val, originalIndex: i };
        }).sort((a, b) => b.val - a.val);

        const visibleTopics = sortedTopics.filter(item => !hiddenTopics.has(item.t));

        const labels = visibleTopics.map(item => toReadableKey(item.t));
        const dataValues = visibleTopics.map(item => item.val);
        const bgColors = visibleTopics.map(item => colors[item.originalIndex % colors.length]);

        const dataset = {
            label: 'Latest Count',
            data: dataValues,
            backgroundColor: bgColors,
            borderColor: bgColors,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8
        };

        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets = [dataset];
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'bar',
                data: { labels: labels, datasets: [dataset] },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'dataset',
                        axis: 'y',
                        intersect: false,
                    },
                    plugins: { 
                        legend: { display: false }, 
                        tooltip: { 
                            enabled: false, 
                            external: externalTooltip,
                            callbacks: { title: () => 'Latest Count' }
                        } 
                    },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(147,155,166,0.06)' }, ticks: { color: '#94a3b8', callback: v => v >= 1000 ? Math.round(v/1000)+'k' : v } },
                        y: { grid: { display: false }, ticks: { color: '#94a3b8', autoSkip: false } }
                    }
                }
            });
            setupChartInteractions(canvas, () => chart);
        }

        const legendContainer = document.getElementById('repoLegend');
        if (legendContainer) {
            legendContainer.innerHTML = '';
            sortedTopics.forEach(item => {
                const chip = document.createElement('button');
                chip.type = 'button';
                const isVisible = !hiddenTopics.has(item.t);
                chip.className = isVisible ? 'legend-chip active' : 'legend-chip';
                chip.style.borderLeft = `8px solid ${colors[item.originalIndex % colors.length]}`;
                chip.textContent = toReadableKey(item.t);
                chip.onclick = () => {
                    if (hiddenTopics.has(item.t)) hiddenTopics.delete(item.t);
                    else hiddenTopics.add(item.t);
                    updateChart();
                };
                legendContainer.appendChild(chip);
            });
        }
    } else {
        const datasets = lastTopics.map((t,i) => ({
            label: toReadableKey(t),
            data: lastSortedData.map(d => {
                if (d.counts && typeof d.counts[t] !== 'undefined') return Number(d.counts[t] || 0);
                if (typeof d[t] !== 'undefined') return Number(d[t] || 0);
                return 0;
            }),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length] + '22',
            fill: false,
            tension: 0.36,
            borderWidth: 3.5,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: colors[i % colors.length],
            pointBorderWidth: 3.5,
            hitRadius: 8,
            hoverBorderWidth: 3,
            hidden: hiddenTopics.has(t)
        }));

        if (chart) {
            chart.data.labels = lastLabels;
            chart.data.datasets = datasets;
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels: lastLabels, datasets },
                options: {
                    events: [],
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
                    interaction: { mode: 'index', axis: 'x', intersect: false }
                }
            });
            setupChartInteractions(canvas, () => chart);
        }
    }
    
    const dropdown = document.getElementById('repoTopicFilters');
    if (!dropdown && currentView !== 'comparison') {
        renderLegend(chart, document.getElementById('repoLegend'), (index, isVisible) => {
            const topic = lastTopics[index];
            if (isVisible) hiddenTopics.delete(topic);
            else hiddenTopics.add(topic);
        });
    }
}

export async function renderRepoCountsChart(selectedTopics = null, onSummary, range = currentRange) {
    currentRange = range;
    toggleLoading('repoCountsChart', true);
    try {
        const raw = await getRepoCountsByTopic(range);
        if (!raw || raw.length === 0) return;

        // normalize: each entry may be {date, counts:{...}} or {date, topic1:.., topic2:..}
        // sort ascending by week start date
        const sorted = raw.slice().sort((a,b)=> isoWeekToDate(a.date) - isoWeekToDate(b.date));

        const labels = sorted.map(d => formatWeekLabel(d.date, range));
        const sample = sorted[0];
        const countsObj = sample.counts || (() => {
            // build counts-like object from top-level keys excluding date
            const o = {};
            Object.keys(sample).forEach(k => { if (k !== 'date') o[k] = sample[k]; });
            return o;
        })();
        const allKeys = Object.keys(countsObj);
        const topics = selectedTopics && selectedTopics.length ? selectedTopics : allKeys;

        lastSortedData = sorted;
        lastLabels = labels;
        lastTopics = topics;
        hiddenTopics.clear();

        setupViewSwitcher('repoViewSwitcher', currentView, (newView) => {
            currentView = newView;
            updateChart();
        });
        const rangeSwitcher = document.querySelector('.graph-card[data-chart-type="repos"] .range-switcher[role="tablist"]');
        setupRangeSwitcher(rangeSwitcher, (newRange) => {
            renderRepoCountsChart(lastTopics, null, newRange);
        });
        updateChart();
        
        if (typeof onSummary === 'function') onSummary(computeSummary(sorted, topics));
    } catch (e) {
        console.error('Error rendering repo counts chart:', e);
    } finally {
        toggleLoading('repoCountsChart', false);
    }
}

function computeSummary(sortedData, topics){
    const n = sortedData.length;
    const newest = sortedData[n-1];
    const prev = n > 1 ? sortedData[n-2] : null;
    return topics.map(t => {
        const latest = Number((newest.counts && newest.counts[t]) || (typeof newest[t] !== 'undefined' ? newest[t] : 0));
        const previous = prev ? Number((prev.counts && prev.counts[t]) || (typeof prev[t] !== 'undefined' ? prev[t] : 0)) : null;
        const diff = previous !== null ? latest - previous : null;
        const pct = previous ? (diff / previous) * 100 : null;
        return { key: t, label: toReadableKey(t), latest, diff, pct };
    });
}

export async function fetchTimeseries(range = 'weekly'){
    return await getRepoCountsByTopic(range);
}
