import { renderRepoCountsChart } from "./charts/repoCountsChart.js";
import { renderMultiLinesChart } from "./charts/components/multiLinesChart.js";
import { renderLanguagesCountsChart } from "./charts/languagesCountsChart.js";

const buttons = document.querySelectorAll(".range-btn");
let currentRange = 'weekly';

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const range = btn.dataset.range;
        currentRange = range;
        // render multi-line chart for first card (repo counts by topic)
        try {
            renderMultiLinesChart(null, null, currentRange);
        } catch(e) {
            console.error('Error rendering multi-lines chart:', e);
        }
        // render languages chart for second card
        try {
            renderLanguagesCountsChart(currentRange);
        } catch(e) {
            console.error('Error rendering languages chart:', e);
        }
    });
});

// initial render
try {
    renderMultiLinesChart(null, null, currentRange);
} catch(e) {
    console.error('Error rendering multi-lines chart on load:', e);
}

try {
    renderLanguagesCountsChart(currentRange);
} catch(e) {
    console.error('Error rendering languages chart on load:', e);
}

// legend chips are rendered and managed by the chart component itself
