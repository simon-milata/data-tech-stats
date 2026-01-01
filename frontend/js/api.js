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

function getLastMidnightUTC1() {
    const now = new Date();
    const offset = 60 * 60 * 1000; // UTC+1
    const timeInZone = new Date(now.getTime() + offset);
    const midnightInZone = Date.UTC(timeInZone.getUTCFullYear(), timeInZone.getUTCMonth(), timeInZone.getUTCDate());
    return midnightInZone - offset;
}

async function fetchWithCache(url, key) {
    const now = new Date().getTime();
    const cached = localStorage.getItem(key);
    const lastMidnight = getLastMidnightUTC1();

    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (timestamp > lastMidnight) {
            return data;
        }
        localStorage.removeItem(key);
    }

    if (!API_BASE) return [];
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        localStorage.setItem(key, JSON.stringify({ timestamp: now, data }));
        return data;
    } catch (err) {
        console.warn('API fetch failed:', err);
        return [];
    }
}

export async function getRepoCountsByTopic(range = 'weekly') {
    return fetchWithCache(
        `${API_BASE}/repo-counts?interval=${encodeURIComponent(range)}`,
        `repoCounts_${range}`
    );
}

export async function getLanguagesTimeseries(range = 'weekly') {
    return fetchWithCache(
        `${API_BASE}/primary-languages?interval=${encodeURIComponent(range)}`,
        `languages_${range}`
    );
}

export async function getRepoList() {
    return fetchWithCache(
        `${API_BASE}/repo-list`,
        `repoList`
    );
}

export async function getRepoComparison(range = 'weekly') {
    return fetchWithCache(`${API_BASE}/repo-comparison?interval=${encodeURIComponent(range)}`, `repoComparison_aggregated_${range}`);
}