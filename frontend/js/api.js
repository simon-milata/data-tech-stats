const API_BASE = ''; // set to your backend base URL when ready

export async function getRepoCounts(range = 'weekly') {
    // derive single-series totals from the per-topic timeseries so mocks stay consistent
    const byTopic = await getRepoCountsByTopic(range);
    if (!byTopic || !byTopic.length) return [];
    return byTopic.map(entry => {
        const counts = entry.counts || {};
        const total = Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
        return { date: entry.date, count: total };
    });
}

export async function getRepoCountsByTopic(range = 'weekly') {
    // try real endpoint first if configured
    if (API_BASE) {
        try {
            const res = await fetch(`${API_BASE}/repo-counts-by-topic?range=${encodeURIComponent(range)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            return await res.json();
        } catch (err) {
            console.warn('API fetch failed, falling back to mock:', err);
        }
    }

    // Weekly sample (your provided payload)
    if (range === 'weekly') {
        return [
            {
                date: '2025-W47',
                counts: {
                    etl: 5530,
                    analytics: 10372,
                    'data-analysis': 37079,
                    'data-engineering': 5568,
                    'data-science': 56698,
                    'machine-learning': 162063,
                    'natural-language-processing': 17312,
                    'artificial-intelligence': 31070,
                    'deep-learning': 81618,
                    'data-visualization': 38395,
                    scraper: 10213,
                    database: 41691
                }
            },
            {
                date: '2025-W48',
                counts: {
                    etl: 5555,
                    analytics: 10436,
                    'data-analysis': 37231,
                    'data-engineering': 5611,
                    'data-science': 56823,
                    'machine-learning': 162507,
                    'natural-language-processing': 17339,
                    'artificial-intelligence': 31178,
                    'deep-learning': 81809,
                    'data-visualization': 38514,
                    scraper: 10259,
                    database: 41803
                }
            }
        ];
    }

    // Monthly fallback (same nested shape)
    const months = ['2025-01-01','2025-02-01','2025-03-01','2025-04-01'];
    const base = {
        etl: 5500,
        analytics: 10000,
        'data-analysis': 37000,
        'data-engineering': 5600,
        'data-science': 56000,
        'machine-learning': 160000,
        'natural-language-processing': 17000,
        'artificial-intelligence': 31000,
        'deep-learning': 81000,
        'data-visualization': 38000,
        scraper: 10000,
        database: 41000
    };

    return months.map((d, i) => ({
        date: d,
        counts: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * (1 + 0.01 * i))]))
    }));
}