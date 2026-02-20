/**
 * Simple in-memory TTL cache.
 * Key = hash(query + mode), Value = { data, expiresAt }.
 */

import { createHash } from 'crypto';

const store = new Map();

const TTL = {
    quick: 15 * 60 * 1000,     // 15 minutes
    standard: 20 * 60 * 1000,  // 20 minutes
    deep: 30 * 60 * 1000,      // 30 minutes
};

function makeKey(query, mode) {
    return createHash('sha256').update(`${query}::${mode}`).digest('hex').slice(0, 16);
}

/**
 * Get a cached result.
 * @param {string} query
 * @param {string} mode
 * @returns {Object|null}
 */
export function cacheGet(query, mode) {
    const key = makeKey(query, mode);
    const entry = store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }

    return entry.data;
}

/**
 * Store a result in cache.
 * @param {string} query
 * @param {string} mode
 * @param {Object} data
 */
export function cacheSet(query, mode, data) {
    const key = makeKey(query, mode);
    const ttl = TTL[mode] || TTL.standard;
    store.set(key, {
        data,
        expiresAt: Date.now() + ttl,
    });
}

/**
 * Clear expired entries.
 */
function cleanup() {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.expiresAt) {
            store.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);
