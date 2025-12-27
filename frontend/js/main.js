import { renderRepoCountsChart } from './charts/repoCountsChart.js';
import { renderLanguagesCountsChart } from './charts/languagesCountsChart.js';
import { initRepoComparisonChart } from './charts/repoComparisonChart.js';

const cards = document.querySelectorAll('.graph-card');
const ranges = { repos: 'weekly', languages: 'weekly' };

cards.forEach((card) => {
    let cardType;
    if (card.querySelector('#repoCountsChart')) {
        cardType = 'repos';
    } else if (card.querySelector('#repoComparisonChart')) {
        return;
    } else {
        cardType = 'languages';
    }

    const buttons = card.querySelectorAll('.range-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            ranges[cardType] = btn.dataset.range;

            try {
                if (cardType === 'repos') {
                    renderRepoCountsChart(null, null, ranges.repos);
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
    renderRepoCountsChart(null, null, ranges.repos);
    renderLanguagesCountsChart(ranges.languages);
    initRepoComparisonChart();
} catch (e) {
    console.error('Error rendering charts on load:', e);
}
