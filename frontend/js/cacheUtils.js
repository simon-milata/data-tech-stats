const CACHE_TIMESTAMP_KEY = 'cache_timestamp';
const CACHE_SIZE_LIMIT = 8 * 1024 * 1024; // 8MB safe limit

// Gzip compression using pako
const compressData = (data) => {
    try {
        const json = JSON.stringify(data);
        const compressed = pako.gzip(json);
        
        // Convert Uint8Array to base64 safely without stack overflow
        let binaryString = '';
        for (let i = 0; i < compressed.length; i++) {
            binaryString += String.fromCharCode(compressed[i]);
        }
        return btoa(binaryString);
    } catch (e) {
        console.warn('Compression failed:', e);
        return null;
    }
};

const decompressData = (compressed) => {
    try {
        const binaryString = atob(compressed);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decompressed = pako.ungzip(bytes, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (e) {
        console.warn('Decompression failed:', e);
        return null;
    }
};

export const getCacheTimestamp = () => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp) : null;
};

export const setCacheTimestamp = () => {
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
};

export const isCacheExpired = () => {
    const timestamp = getCacheTimestamp();
    if (!timestamp) return true;
    
    const cachedDate = new Date(timestamp);
    const now = new Date();
    
    // Check if cached date and current date are different days
    return cachedDate.toDateString() !== now.toDateString();
};

export const clearExpiredCache = () => {
    const keysToPreserve = [CACHE_TIMESTAMP_KEY];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
            localStorage.removeItem(key);
        }
    });
};

export const setCacheData = (key, data) => {
    const compressed = compressData(data);
    if (!compressed) return false;
    
    if (compressed.length > CACHE_SIZE_LIMIT) {
        return false;
    }
    
    try {
        localStorage.setItem(key, compressed);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            clearExpiredCache();
            try {
                localStorage.setItem(key, compressed);
                return true;
            } catch (e2) {
                console.warn('Unable to cache data:', e2.message);
                return false;
            }
        }
        return false;
    }
};

export const getCacheData = (key) => {
    const compressed = localStorage.getItem(key);
    if (!compressed) return null;
    return decompressData(compressed);
};
