import { renderMultiLinesChart } from './charts/components/multiLinesChart.js';
import { renderLanguagesCountsChart } from './charts/languagesCountsChart.js';

const buttons = document.querySelectorAll('.range-btn');
let currentRange = 'weekly';

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentRange = btn.dataset.range;

        try {
            renderMultiLinesChart(null, null, currentRange);
            renderLanguagesCountsChart(currentRange);
        } catch (e) {
            console.error('Error rendering charts:', e);
        }
    });
});

try {
    renderMultiLinesChart(null, null, currentRange);
    renderLanguagesCountsChart(currentRange);
} catch (e) {
    console.error('Error rendering charts on load:', e);
}
