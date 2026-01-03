import { renderRepoCountsChart } from './charts/repoCountsChart.js';
import { renderLanguagesCountsChart } from './charts/languagesCountsChart.js';

const CHART_TYPES = {
    REPOS: 'repos',
    LANGUAGES: 'languages',
    COMPARISON: 'comparison'
};

const INITIAL_RANGE = 'weekly';
const ranges = { 
    [CHART_TYPES.REPOS]: INITIAL_RANGE, 
    [CHART_TYPES.LANGUAGES]: INITIAL_RANGE 
};

const cards = document.querySelectorAll('.graph-card');

const renderChartForCard = (cardType) => {
    try {
        if (cardType === CHART_TYPES.REPOS) {
            renderRepoCountsChart(null, null, ranges[CHART_TYPES.REPOS]);
        } else if (cardType === CHART_TYPES.LANGUAGES) {
            renderLanguagesCountsChart(ranges[CHART_TYPES.LANGUAGES]);
        }
    } catch (e) {
        console.error(`Error rendering ${cardType} chart:`, e);
    }
};

cards.forEach((card) => {
    const cardType = card.dataset.chartType;

    if (cardType === CHART_TYPES.COMPARISON) {
        return;
    }

    const buttons = card.querySelectorAll('.range-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ranges[cardType] = btn.dataset.range;
            renderChartForCard(cardType);
        });
    });
});

const initCharts = async () => {
    try {
        renderRepoCountsChart(null, null, ranges[CHART_TYPES.REPOS]);
        
        // Yield to main thread to break up long tasks
        await new Promise(resolve => setTimeout(resolve, 0));
        
        renderLanguagesCountsChart(ranges[CHART_TYPES.LANGUAGES]);

        // Lazy load comparison chart when it approaches viewport
        const comparisonCard = document.querySelector('.graph-card[data-chart-type="comparison"]');
        
        const loadComparison = async () => {
            const { initRepoComparisonChart } = await import('./charts/repoComparisonChart.js');
            initRepoComparisonChart();
        };

        if (comparisonCard && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadComparison();
                    observer.disconnect();
                }
            }, { rootMargin: '200px' });
            observer.observe(comparisonCard);
        } else {
            await new Promise(resolve => setTimeout(resolve, 0));
            loadComparison();
        }
    } catch (e) {
        console.error('Error rendering charts on load:', e);
    }
};

initCharts();
