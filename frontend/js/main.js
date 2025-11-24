import { renderRepoCountsChart } from "./charts/repoCountsChart.js";

const buttons = document.querySelectorAll(".range-btn");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const range = btn.dataset.range;
        renderRepoCountsChart(range);
    });
});

// initial render
renderRepoCountsChart("weekly");
