import { renderRepoCountsChart } from "./charts/repoCountsChart.js";
import { renderMultiLinesChart } from "./charts/components/multiLinesChart.js";

const buttons = document.querySelectorAll(".range-btn");
let currentRange = 'weekly';

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const range = btn.dataset.range;
        currentRange = range;
        renderRepoCountsChart(range);
        // update multi-lines chart as well
        renderMultiLinesChart(null, null, currentRange);
    });
});

// initial render
renderRepoCountsChart("weekly");
renderMultiLinesChart(null, null, currentRange);

// legend chips are rendered and managed by the chart component itself
