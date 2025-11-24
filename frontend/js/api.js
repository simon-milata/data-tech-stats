// API wrapper for repo counts
const API_BASE = ''; // set to your backend base URL when ready

export async function getRepoCounts(range) {
    // try real endpoint first
    if (API_BASE) {
        try {
            const res = await fetch(`${API_BASE}/repo-counts?range=${encodeURIComponent(range)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            return await res.json();
        } catch (err) {
            console.warn('API fetch failed, falling back to mock:', err);
        }
    }

    // TEMP MOCK DATA (replace with your API)
    await new Promise(r => setTimeout(r, 200));

    if (range === "weekly") {
        return [
            { date: "2025-01-01", count: 1023 },
            { date: "2025-01-08", count: 1055 },
            { date: "2025-01-15", count: 1081 },
            { date: "2025-01-22", count: 1110 },
            { date: "2025-01-29", count: 1142 }
        ];
    } else {
        return [
            { date: "2025-01-01", count: 71871 },
            { date: "2025-02-01", count: 72071 },
            { date: "2025-03-01", count: 72324 },
            { date: "2025-04-01", count: 72627 },
            { date: "2025-05-01", count: 73021 },
            { date: "2025-06-01", count: 74871 },
            { date: "2025-07-01", count: 75871 },
            { date: "2025-08-01", count: 76871 },
        ];
    }
}