import { getRepoCountsByTopic } from '../../api.js';

let chart = null;
const colors = [
    '#8b5cf6', '#fb923c', '#06b6d4', '#f472b6', '#10b981', '#ef4444', '#60a5fa', '#a78bfa', '#f59e0b', '#34d399', '#c084fc', '#f97316'
];

function toReadableKey(k){ return k.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

// parse ISO week string like '2025-W48' to a Date representing the Monday of that ISO week
function isoWeekToDate(isoWeek){
    const m = isoWeek.match(/(\d{4})-W(\d{2})/);
    if(!m) return new Date(isoWeek);
    const year = Number(m[1]);
    const week = Number(m[2]);
    // ISO week to date: find Jan 4th and then compute
    const jan4 = new Date(year,0,4);
    const day = jan4.getDay() || 7; // 1..7 Mon..Sun
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (day - 1));
    const monday = new Date(week1Monday);
    monday.setDate(week1Monday.getDate() + (week - 1) * 7);
    return monday;
}

function formatWeekLabel(dateStr, range = 'weekly'){
    // For weekly range, show date range (e.g. "Dec 1 — Dec 7, 2025")
    // For monthly (or other) range, show month + year (e.g. "Dec 2025")
    const optsDay = { month: 'short', day: 'numeric' };
    const optsMonthYear = { month: 'short', year: 'numeric' };

    if (range === 'weekly') {
        const m = (dateStr || '').match(/(\d{4})-W(\d{2})/);
        if (m) {
            const start = isoWeekToDate(dateStr);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            const s = start.toLocaleDateString(undefined, optsDay);
            const e = end.toLocaleDateString(undefined, optsDay);
            // always append the year after the end date so the label is compact but unambiguous
            return `${s} - ${e}, ${end.getFullYear()}`;
        }
        // fallback: if not ISO-week string, try to parse and show a single day
        const d = new Date(dateStr);
        return isNaN(d) ? String(dateStr) : d.toLocaleDateString(undefined, optsDay);
    }

    // monthly or other: show month + year
    const d = (String(dateStr).match(/(\d{4})-W(\d{2})/)) ? isoWeekToDate(dateStr) : new Date(dateStr);
    return isNaN(d) ? String(dateStr) : d.toLocaleDateString(undefined, optsMonthYear);
}

export async function renderMultiLinesChart(selectedTopics = null, onSummary, range = 'weekly') {
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
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    };

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update();
        renderLegend(chart);
        if (typeof onSummary === 'function') onSummary(computeSummary(sorted, topics));
        return;
    }

    chart = new Chart(ctx, config);
    renderLegend(chart);
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

// Render a custom legend as styled chips
function renderLegend(chart){
    const dropdown = document.getElementById('repoTopicFilters');
    if (dropdown) return; // use dropdown as single source of truth for topic toggles
    const container = document.getElementById('repoLegend');
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
            // use Chart.js dataset visibility API which is more reliable than toggling meta.hidden directly
            const currentlyVisible = chart.isDatasetVisible(i);
            chart.setDatasetVisibility(i, !currentlyVisible);
            chip.classList.toggle('active', !currentlyVisible);
            chart.update();
        });
        container.appendChild(chip);
    });
}

// External HTML tooltip for Chart.js
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

    // Title (formatted week label)
    const title = tooltip.title && tooltip.title.length ? tooltip.title[0] : '';
    tip.querySelector('.label').textContent = title;

    // Build list of all data points for this index
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
    } else if (tooltip.body && tooltip.body.length) {
        const body = tooltip.body[0].lines || [];
        body.forEach(line => {
            const row = document.createElement('div');
            row.className = 'tt-line';
            row.textContent = line;
            valuesEl.appendChild(row);
        });
    }

    // position relative to chart container using caret coordinates
    const canvasRect = chart.canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const caretX = tooltip.caretX ?? (canvasRect.width / 2);
    const caretY = tooltip.caretY ?? (canvasRect.height / 2);

    // caretX/Y are canvas-relative; convert to parent coordinates
    const left = caretX + (canvasRect.left - parentRect.left);
    const top = caretY + (canvasRect.top - parentRect.top);

    // Make sure tip is measurable: briefly show hidden so offsetWidth/Height are available
    tip.style.opacity = 0;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.transform = 'translate(0,0)';

    const tipWidth = tip.offsetWidth || 150;
    const tipHeight = tip.offsetHeight || 60;

    // Available space around the point within the parent
    const spaceRight = parentRect.width - left;
    const spaceLeft = left;

    let finalLeft, finalTop, transform;

    // Prefer placing above the point if there's vertical room
    const margin = 12; // spacing between point and tooltip
    if (top - tipHeight - margin >= 0) {
        // place above
        finalTop = top - margin;
        // If the point is near the horizontal center of the chart, try to offset to a side so the tooltip doesn't cover central values
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
        // Not enough room above, place below if possible
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

    // Clamp so tooltip stays inside parent bounds
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
