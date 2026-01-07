const API_BASE = (typeof window !== 'undefined' && window.env && window.env.API_BASE);

const comparisonCache = {};
const comparisonPromises = {};

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

export async function getRepoList(range = 'weekly') {
    // Reuse the comparison endpoint to generate the list
    const data = await getRepoComparison(range);
    if (!data) return [];

    return Object.entries(data).map(([id, repoData]) => {
        const history = repoData.history || [];
        // Find the entry with the latest date
        const latest = history.length > 0 
            ? history.reduce((a, b) => (a.date > b.date ? a : b)) 
            : {};

        return {
            id: id,
            // Fallback to ID if name is missing in the comparison data
            name: repoData.name || id,
            stars: latest.stars || 0,
            forks: latest.forks || 0,
            open_issues: latest.open_issues || 0,
            size: latest.size || 0
        };
    });
}

export async function getRepoComparison(range = 'weekly') {
    if (comparisonCache[range]) {
        return comparisonCache[range];
    }

    if (comparisonPromises[range]) {
        return comparisonPromises[range];
    }

    const promise = fetchWithCache(
        `${API_BASE}/repo-comparison?interval=${encodeURIComponent(range)}`, 
        `repoComparison_aggregated_${range}`
    ).then(data => {
        if (data) comparisonCache[range] = data;
        delete comparisonPromises[range];
        return data;
    });

    comparisonPromises[range] = promise;
    return promise;
}