/**
 * API client for the Deep Research backend.
 * Replaces the old client-side researchEngine.js with real API calls.
 */

const API_BASE = '/api';

/**
 * Start a research session.
 * Quick/Standard: returns full result synchronously.
 * Deep: returns { sessionId } — caller should connect to streamResearch().
 *
 * @param {string} query
 * @param {string} mode - 'quick' | 'standard' | 'deep'
 * @returns {Promise<Object>}
 */
export async function startResearch(query, mode = 'standard') {
    const controller = new AbortController();
    const timeout = mode === 'quick' ? 60000 : 120000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(`${API_BASE}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, mode }),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(err.message || `Request failed (${res.status})`);
        }

        return await res.json();
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('Research request timed out. Please try again.');
        }
        throw err;
    }
}

/**
 * Connect to the SSE stream for deep mode research.
 * @param {string} sessionId
 * @param {Object} callbacks
 * @param {(data: Object) => void} callbacks.onPhase - Progress update
 * @param {(data: Object) => void} callbacks.onComplete - Final result
 * @param {(error: string) => void} callbacks.onError - Error
 * @returns {{ close: () => void }} — Call close() to disconnect
 */
export function streamResearch(sessionId, { onPhase, onComplete, onError }) {
    const eventSource = new EventSource(`${API_BASE}/research/${sessionId}/stream`);

    eventSource.addEventListener('phase', (e) => {
        try {
            const data = JSON.parse(e.data);
            onPhase?.(data);
        } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('complete', (e) => {
        try {
            const data = JSON.parse(e.data);
            onComplete?.(data);
        } catch { /* ignore parse errors */ }
        eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
        // SSE error: either connection lost or server-sent error event
        if (e.data) {
            try {
                const data = JSON.parse(e.data);
                onError?.(data.message || 'Stream error');
            } catch {
                onError?.('Stream connection error');
            }
        } else {
            // Connection error — EventSource will auto-reconnect, but we want to close
            onError?.('Connection to research stream lost');
        }
        eventSource.close();
    });

    return {
        close: () => eventSource.close(),
    };
}

/**
 * Get a completed research report by session ID.
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function getReport(sessionId) {
    const res = await fetch(`${API_BASE}/research/${sessionId}`);

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `Request failed (${res.status})`);
    }

    return await res.json();
}

/**
 * Fetch paginated research history.
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<{ items: Array, total: number }>}
 */
export async function getHistory({ limit = 50, offset = 0 } = {}) {
    const res = await fetch(`${API_BASE}/history?limit=${limit}&offset=${offset}`);

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `Request failed (${res.status})`);
    }

    return await res.json();
}

/**
 * Delete a research session.
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
    const res = await fetch(`${API_BASE}/history/${sessionId}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `Request failed (${res.status})`);
    }
}
