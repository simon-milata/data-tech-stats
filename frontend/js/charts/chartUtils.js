export function isoWeekToDate(isoWeek) {
    const m = isoWeek.match(/(\d{4})-W(\d{2})/);
    if (!m) return new Date(isoWeek);
    const year = Number(m[1]);
    const week = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const day = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (day - 1));
    const monday = new Date(week1Monday);
    monday.setDate(week1Monday.getDate() + (week - 1) * 7);
    return monday;
}

export function formatWeekLabel(dateStr, range = 'weekly') {
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
            return `${s} - ${e}, ${end.getFullYear()}`;
        }
        const d = new Date(dateStr);
        return isNaN(d) ? String(dateStr) : d.toLocaleDateString(undefined, optsDay);
    }

    const d = (String(dateStr).match(/(\d{4})-W(\d{2})/)) ? isoWeekToDate(dateStr) : new Date(dateStr);
    return isNaN(d) ? String(dateStr) : d.toLocaleDateString(undefined, optsMonthYear);
}

export function renderLegend(chart, container) {
    if (!chart || !chart.data.datasets || !container) return;
    
    container.innerHTML = '';
    container.removeAttribute('style');
    
    chart.data.datasets.forEach((dataset, index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        const isVisible = chart.isDatasetVisible(index);
        chip.className = isVisible ? 'legend-chip active' : 'legend-chip';
        chip.style.borderLeft = `8px solid ${dataset.borderColor}`;
        chip.textContent = dataset.label;

        chip.onclick = () => {
            const currentlyVisible = chart.isDatasetVisible(index);
            chart.setDatasetVisibility(index, !currentlyVisible);
            chip.classList.toggle('active', !currentlyVisible);
            chart.update();
        };

        container.appendChild(chip);
    });
}

export function externalTooltip(context) {
    const { chart, tooltip } = context;
    const parent = chart.canvas.parentNode;
    let tip = parent.querySelector('.chart-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.className = 'chart-tooltip';
        tip.innerHTML = '<div class="label"></div><div class="values"></div>';
        parent.appendChild(tip);
    }

    if (tooltip.opacity === 0) {
        tip.style.opacity = 0;
        return;
    }

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
                <span class="tt-name" style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle;">${name}</span>
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

    // Reset styles to measure size
    tip.style.opacity = 0;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.transform = 'translate(0,0)';

    const tipWidth = tip.offsetWidth || 150;
    const tipHeight = tip.offsetHeight || 60;
    
    const Y_OFFSET_ABOVE = 20; // Distance to place tooltip above the point
    const Y_OFFSET_BELOW = 15; // Distance to place tooltip below the point
    const PADDING = 8; // Padding from the container edges

    // --- Y POSITIONING ---
    // Default position is above the caret
    let tooltipY = top - tipHeight - Y_OFFSET_ABOVE;

    // If it goes off the top, place it below the caret instead
    if (tooltipY < PADDING) {
        tooltipY = top + Y_OFFSET_BELOW;
    }

    // --- X POSITIONING ---
    // Default position is centered on the caret
    let tooltipX = left - tipWidth / 2;

    // A more advanced X positioning to avoid the center of the chart
    const centerMin = parentRect.width * 0.35;
    const centerMax = parentRect.width * 0.65;
    if (left > centerMin && left < centerMax) {
        // If we are in the middle of the chart, try to place the tooltip to the side
        const spaceRight = parentRect.width - left;
        const spaceLeft = left;
        if (spaceRight > tipWidth + 20) {
            tooltipX = left + 20; // Place to the right
        } else if (spaceLeft > tipWidth + 20) {
            tooltipX = left - tipWidth - 20; // Place to the left
        }
    }

    // --- CLAMPING to parent container ---
    // Clamp X
    if (tooltipX < PADDING) {
        tooltipX = PADDING;
    }
    if (tooltipX + tipWidth > parentRect.width - PADDING) {
        tooltipX = parentRect.width - tipWidth - PADDING;
    }
    
    // Clamp Y
    if (tooltipY < PADDING) {
        tooltipY = PADDING;
    }
    if (tooltipY + tipHeight > parentRect.height - PADDING) {
        tooltipY = parentRect.height - tipHeight - PADDING;
    }

    // Set final position and fade in
    tip.style.left = tooltipX + 'px';
    tip.style.top = tooltipY + 'px';
    tip.style.transform = 'none';
    tip.style.opacity = 1;
}