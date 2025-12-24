const API_BASE = (typeof window !== 'undefined' && window.env && window.env.API_BASE);

export async function getRepoCounts(range = 'weekly') {
    const byTopic = await getRepoCountsByTopic(range);
    if (!byTopic || !byTopic.length) return [];
    return byTopic.map(entry => {
        const counts = entry.counts || {};
        const total = Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
        return { date: entry.date, count: total };
    });
}

export async function getRepoCountsByTopic(range = 'weekly') {
    if (!API_BASE) return [];
    try {
        const res = await fetch(`${API_BASE}/repo-counts?interval=${encodeURIComponent(range)}`);
        if (!res.ok) throw new Error('Network response was not ok');
        return await res.json();
    } catch (err) {
        console.warn('API fetch failed:', err);
        return [];
    }
}

export async function getLanguagesTimeseries(range = 'weekly') {
    if (!API_BASE) return [];
    try {
        const res = await fetch(`${API_BASE}/primary-languages?interval=${encodeURIComponent(range)}`);
        if (!res.ok) throw new Error('Network response was not ok');
        return await res.json();
    } catch (err) {
        console.warn('API fetch failed:', err);
        return [];
    }
}