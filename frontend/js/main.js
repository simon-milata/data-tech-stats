import { renderMultiLinesChart } from './charts/components/multiLinesChart.js';
import { renderLanguagesCountsChart } from './charts/languagesCountsChart.js';

const cards = document.querySelectorAll('.graph-card');
const ranges = { repos: 'weekly', languages: 'weekly' };

cards.forEach((card, index) => {
    const cardType = index === 0 ? 'repos' : 'languages';
    const buttons = card.querySelectorAll('.range-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            ranges[cardType] = btn.dataset.range;

            try {
                if (cardType === 'repos') {
                    renderMultiLinesChart(null, null, ranges.repos);
                } else {
                    renderLanguagesCountsChart(ranges.languages);
                }
            } catch (e) {
                console.error('Error rendering chart:', e);
            }
        });
    });
});

try {
    renderMultiLinesChart(null, null, ranges.repos);
    renderLanguagesCountsChart(ranges.languages);
} catch (e) {
    console.error('Error rendering charts on load:', e);
}
