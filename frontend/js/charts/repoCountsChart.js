import { getRepoCounts } from "../api.js";

let chartInstance = null;

function createGradient(ctx, area) {
    const gradient = ctx.createLinearGradient(0, 0, 0, area.bottom);
    // more vibrant multi-stop gradient
    gradient.addColorStop(0, 'rgba(249,115,22,0.20)'); // orange
    gradient.addColorStop(0.5, 'rgba(139,92,246,0.14)'); // purple
    gradient.addColorStop(1, 'rgba(6,182,196,0.04)'); // teal
    return gradient;
}

function externalTooltipHandler(context) {
    // Tooltip Element
    const { chart, tooltip } = context;
    const chartEl = chart.canvas.parentNode; // .chart-wrap (position: relative)
    let tooltipEl = chartEl.querySelector('.chart-tooltip');

    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'chart-tooltip';
        tooltipEl.innerHTML = '<span class="label"></span><span class="value"></span>';
        chartEl.appendChild(tooltipEl);
    }

    if (tooltip.opacity === 0) {
        tooltipEl.style.opacity = 0;
        tooltipEl.style.pointerEvents = 'none';
        return;
    }

    const labelEl = tooltipEl.querySelector('.label');
    const valueEl = tooltipEl.querySelector('.value');

    if (tooltip.body) {
        const bodyLine = tooltip.body[0].lines[0];
        labelEl.textContent = tooltip.title[0];
        // format number nicely
        const numeric = Number(bodyLine.replace(/[^0-9.-]+/g, ''));
        valueEl.textContent = Number.isFinite(numeric) ? numeric.toLocaleString() : bodyLine;
    }

    // compute position relative to the chart container so the tooltip aligns with the point
    const rect = chart.canvas.getBoundingClientRect();

    const caretX = (typeof tooltip.caretX === 'number') ? tooltip.caretX : (
        tooltip.dataPoints && tooltip.dataPoints[0] && tooltip.dataPoints[0].element ? tooltip.dataPoints[0].element.x : rect.width / 2
    );
    const caretY = (typeof tooltip.caretY === 'number') ? tooltip.caretY : (
        tooltip.dataPoints && tooltip.dataPoints[0] && tooltip.dataPoints[0].element ? tooltip.dataPoints[0].element.y : rect.height / 2
    );

    // place tooltip inside chartEl using canvas coordinates (caretX/Y are canvas-relative)
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.left = caretX + 'px';
    tooltipEl.style.top = (caretY - 12) + 'px'; // sit slightly above the point
    tooltipEl.style.transform = 'translate(-50%, -125%)';
}

export async function renderRepoCountsChart(range = "weekly") {
    const data = await getRepoCounts(range);

    const labels = data.map(d => d.date);
    const values = data.map(d => Number(d.count));

    const canvas = document.querySelector('#repoCountsChart');
    const ctx = canvas.getContext('2d');

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Repo Count',
                data: values,
                borderColor: 'rgba(139,92,246,0.98)',
                backgroundColor: createGradient(ctx, canvas.getBoundingClientRect()),
                pointBackgroundColor: '#ffffff',
                pointBorderColor: 'rgba(139,92,246,0.98)',
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.36, // smooth curve
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
            animation: { duration: 700, easing: 'cubicBezier(.2,.8,.2,1)' },
            scales: {
                x: {
                    ticks: { maxRotation: 0, autoSkipPadding: 12, color: '#94a3b8', font: { size: 12 } },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(147,155,166,0.06)', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { size: 12 }, callback: function(value) {
                        // compact format (1000 -> 1k) without decimals
                        if (Math.abs(value) >= 1000) return Math.round(value / 1000) + 'k';
                        return value;
                    } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltipHandler }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    };

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = values;
        // Recreate gradient on resize/updates
        chartInstance.data.datasets[0].backgroundColor = createGradient(ctx, canvas.getBoundingClientRect());
        chartInstance.update();
        return;
    }

    chartInstance = new Chart(ctx, config);
}
