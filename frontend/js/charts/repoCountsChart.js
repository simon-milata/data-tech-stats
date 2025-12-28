import { getRepoCountsByTopic } from '../api.js';
import { formatWeekLabel, renderLegend, externalTooltip, isoWeekToDate } from './chartUtils.js';

let chart = null;
const colors = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444', '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

function toReadableKey(k){ return k.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

export async function renderRepoCountsChart(selectedTopics = null, onSummary, range = 'weekly') {
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

    const datasets = topics.map((t,i) => ({
        label: toReadableKey(t),
        data: sorted.map(d => {
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
        hoverBorderWidth: 3
    }));

    const ctx = document.getElementById('repoCountsChart').getContext('2d');

    const config = {
        type: 'line',
        data: { labels, datasets },
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
            interaction: { mode: 'index', axis: 'x', intersect: false }
        }
    };

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update();
        
        const dropdown = document.getElementById('repoTopicFilters');
        if (!dropdown) renderLegend(chart, document.getElementById('repoLegend'));
        
        if (typeof onSummary === 'function') onSummary(computeSummary(sorted, topics));
        return;
    }

    chart = new Chart(ctx, config);
    
    const dropdown = document.getElementById('repoTopicFilters');
    if (!dropdown) renderLegend(chart, document.getElementById('repoLegend'));
    
    if (typeof onSummary === 'function') onSummary(computeSummary(sorted, topics));
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
