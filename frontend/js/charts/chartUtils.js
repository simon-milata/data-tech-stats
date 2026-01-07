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

export function renderLegend(chart, container, onToggle) {
    if (!chart || !chart.data.datasets || !container) return;
    
    container.innerHTML = '';
    container.removeAttribute('style');
    
    const legendItems = chart.data.datasets.map((dataset, index) => ({
        dataset,
        index
    }));

    if (chart.config.type === 'line') {
        legendItems.sort((a, b) => {
            const getLast = (ds) => {
                const data = ds.data;
                if (!data || !data.length) return 0;
                for (let i = data.length - 1; i >= 0; i--) {
                    if (data[i] !== null && data[i] !== undefined) return data[i];
                }
                return 0;
            };
            return getLast(b.dataset) - getLast(a.dataset);
        });
    }

    legendItems.forEach(({ dataset, index }) => {
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
            if (onToggle) onToggle(index, !currentlyVisible);
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
        const sortedPoints = tooltip.dataPoints.slice().sort((a, b) => {
            const valA = a.parsed && (typeof a.parsed.y !== 'undefined') ? a.parsed.y : (a.raw || 0);
            const valB = b.parsed && (typeof b.parsed.y !== 'undefined') ? b.parsed.y : (b.raw || 0);
            return valB - valA;
        });

        sortedPoints.forEach(dp => {
            const name = dp.dataset.label || '';
            let v = dp.parsed && (typeof dp.parsed.y !== 'undefined') ? dp.parsed.y : (dp.raw || '');
            if (dp.dataset.originalData && typeof dp.dataset.originalData[dp.dataIndex] !== 'undefined') {
                v = dp.dataset.originalData[dp.dataIndex];
            }
            const color = (dp.dataset && (dp.dataset.borderColor || dp.dataset.backgroundColor)) || '#000';

            let formattedValue = Number(v).toLocaleString();
            if (chart.config.options.valueFormatter) {
                formattedValue = chart.config.options.valueFormatter(v, dp);
            }

            const row = document.createElement('div');
            row.className = 'tt-line';
            row.innerHTML = `
                <span class="tt-dot" style="background:${color};"></span>
                <span class="tt-name" style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle;">${name}</span>
                <span class="tt-val">${formattedValue}</span>
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
    
    const Y_OFFSET_ABOVE = 40; // Distance to place tooltip above the point
    const Y_OFFSET_BELOW = 15; // Distance to place tooltip below the point
    const PADDING = 8; // Padding from the container edges
    const PADDING_BOTTOM = 35; // Extra padding at bottom to avoid X-axis labels

    // --- Y POSITIONING ---
    // Default position is above the caret
    let tooltipY = top - tipHeight - Y_OFFSET_ABOVE;

    // If it goes off the top, place it below the caret instead
    if (tooltipY < PADDING) {
        tooltipY = top + Y_OFFSET_BELOW;
    }

    // --- X POSITIONING ---
    // Always place to the side to avoid covering points
    const X_OFFSET = 20;
    const spaceRight = parentRect.width - left;
    let tooltipX;
    
    if (spaceRight > tipWidth + X_OFFSET) {
        tooltipX = left + X_OFFSET;
    } else {
        tooltipX = left - tipWidth - X_OFFSET;
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
    if (tooltipY + tipHeight > parentRect.height - PADDING_BOTTOM) {
        tooltipY = parentRect.height - tipHeight - PADDING_BOTTOM;
    }

    // Set final position and fade in
    tip.style.left = tooltipX + 'px';
    tip.style.top = tooltipY + 'px';
    tip.style.transform = 'none';
    tip.style.opacity = 1;
}

export function setupChartInteractions(canvas, getChartInstance) {
    if (!canvas || canvas.hasChartInteractions) return;
    
    canvas.hasChartInteractions = true;
    let pressTimer;
    let isLongPressActive = false;
    let lastTouchTime = 0;
    let startX = 0;
    let startY = 0;
    let rafId;

    const clearTooltip = () => {
        clearTimeout(pressTimer);
        isLongPressActive = false;
        const chart = getChartInstance();
        if (chart) {
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
            chart.update();
        }
    };

    const updateTooltip = (e) => {
        const chart = getChartInstance();
        if (!chart) return;

        if (rafId) cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
            const elements = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, false);
            const activeElements = chart.tooltip.getActiveElements();
            const hasChanged = elements.length !== activeElements.length ||
                !elements.every((el, i) => el.datasetIndex === activeElements[i].datasetIndex && el.index === activeElements[i].index);

            if (hasChanged) {
                chart.setActiveElements(elements);
                chart.tooltip.setActiveElements(elements);
                chart.update();
            }
            rafId = null;
        });
    };

    canvas.addEventListener('touchstart', (e) => {
        lastTouchTime = Date.now();
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        isLongPressActive = false;
        pressTimer = setTimeout(() => {
            isLongPressActive = true;
            updateTooltip(e);
        }, 500);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        lastTouchTime = Date.now();
        clearTooltip();
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (isLongPressActive) {
            if (e.cancelable) e.preventDefault();
            updateTooltip(e);
        } else {
            const touch = e.touches[0];
            const diffX = Math.abs(touch.clientX - startX);
            const diffY = Math.abs(touch.clientY - startY);
            
            if (diffX > 10 || diffY > 10) {
                clearTimeout(pressTimer);
            }
        }
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', clearTooltip);

    canvas.addEventListener('mousemove', (e) => {
        if (Date.now() - lastTouchTime < 800) return;
        updateTooltip(e);
    });

    canvas.addEventListener('mouseout', () => {
        if (Date.now() - lastTouchTime < 800) return;
        clearTooltip();
    });
}