/**
 * Persistent Memory Store
 * Handles user preferences, research history, and session memory
 * using localStorage for cross-session persistence.
 */

const STORAGE_KEYS = {
    PREFERENCES: 'dr_user_preferences',
    HISTORY: 'dr_research_history',
    SESSIONS: 'dr_sessions',
    BOOKMARKS: 'dr_bookmarks',
    USAGE_STATS: 'dr_usage_stats',
};

// Default user preferences
const DEFAULT_PREFERENCES = {
    researchMode: 'deep',
    preferCodeExamples: true,
    preferredLanguages: ['javascript', 'python'],
    citationStyle: 'inline',
    outputFormat: 'markdown',
    maxSources: 10,
    theme: 'dark',
    autoSave: true,
    showTokenUsage: true,
    notifyOnComplete: true,
    createdAt: null,
    updatedAt: null,
};

function safeGetJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function safeSetJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        console.error(`Failed to save to localStorage: ${key}`);
        return false;
    }
}

// ========== Preferences ==========

export function getPreferences() {
    const prefs = safeGetJSON(STORAGE_KEYS.PREFERENCES, null);
    if (!prefs) {
        const defaults = { ...DEFAULT_PREFERENCES, createdAt: Date.now(), updatedAt: Date.now() };
        safeSetJSON(STORAGE_KEYS.PREFERENCES, defaults);
        return defaults;
    }
    return { ...DEFAULT_PREFERENCES, ...prefs };
}

export function updatePreferences(updates) {
    const current = getPreferences();
    const updated = { ...current, ...updates, updatedAt: Date.now() };
    safeSetJSON(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
}

export function resetPreferences() {
    const defaults = { ...DEFAULT_PREFERENCES, createdAt: Date.now(), updatedAt: Date.now() };
    safeSetJSON(STORAGE_KEYS.PREFERENCES, defaults);
    return defaults;
}

// ========== Research History ==========

export function getHistory() {
    return safeGetJSON(STORAGE_KEYS.HISTORY, []);
}

export function addToHistory(entry) {
    const history = getHistory();
    const newEntry = {
        id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        query: entry.query,
        mode: entry.mode || 'deep',
        result: entry.result || null,
        sources: entry.sources || [],
        tokenUsage: entry.tokenUsage || { input: 0, output: 0, total: 0 },
        cost: entry.cost || 0,
        latency: entry.latency || 0,
        status: entry.status || 'completed',
        tags: entry.tags || [],
        createdAt: Date.now(),
        followUps: [],
    };
    history.unshift(newEntry);
    // Keep last 100 entries
    if (history.length > 100) history.length = 100;
    safeSetJSON(STORAGE_KEYS.HISTORY, history);
    return newEntry;
}

export function getHistoryItem(id) {
    const history = getHistory();
    return history.find(item => item.id === id) || null;
}

export function updateHistoryItem(id, updates) {
    const history = getHistory();
    const index = history.findIndex(item => item.id === id);
    if (index === -1) return null;
    history[index] = { ...history[index], ...updates };
    safeSetJSON(STORAGE_KEYS.HISTORY, history);
    return history[index];
}

export function addFollowUp(historyId, followUp) {
    const history = getHistory();
    const index = history.findIndex(item => item.id === historyId);
    if (index === -1) return null;
    if (!history[index].followUps) history[index].followUps = [];
    history[index].followUps.push({
        id: `fu_${Date.now()}`,
        query: followUp.query,
        result: followUp.result,
        tokenUsage: followUp.tokenUsage || { input: 0, output: 0, total: 0 },
        createdAt: Date.now(),
    });
    safeSetJSON(STORAGE_KEYS.HISTORY, history);
    return history[index];
}

export function deleteHistoryItem(id) {
    const history = getHistory().filter(item => item.id !== id);
    safeSetJSON(STORAGE_KEYS.HISTORY, history);
    return history;
}

export function clearHistory() {
    safeSetJSON(STORAGE_KEYS.HISTORY, []);
}

// ========== Bookmarks ==========

export function getBookmarks() {
    return safeGetJSON(STORAGE_KEYS.BOOKMARKS, []);
}

export function addBookmark(historyId) {
    const bookmarks = getBookmarks();
    if (!bookmarks.includes(historyId)) {
        bookmarks.push(historyId);
        safeSetJSON(STORAGE_KEYS.BOOKMARKS, bookmarks);
    }
    return bookmarks;
}

export function removeBookmark(historyId) {
    const bookmarks = getBookmarks().filter(id => id !== historyId);
    safeSetJSON(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return bookmarks;
}

export function isBookmarked(historyId) {
    return getBookmarks().includes(historyId);
}

// ========== Usage Stats ==========

export function getUsageStats() {
    return safeGetJSON(STORAGE_KEYS.USAGE_STATS, {
        totalQueries: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        quickModeCount: 0,
        deepModeCount: 0,
        averageLatency: 0,
        topTags: {},
        dailyUsage: {},
    });
}

export function updateUsageStats(queryData) {
    const stats = getUsageStats();
    stats.totalQueries += 1;
    stats.totalTokensUsed += queryData.tokenUsage?.total || 0;
    stats.totalCost += queryData.cost || 0;

    if (queryData.mode === 'quick') stats.quickModeCount += 1;
    else stats.deepModeCount += 1;

    // Rolling average latency
    stats.averageLatency = Math.round(
        ((stats.averageLatency * (stats.totalQueries - 1)) + (queryData.latency || 0)) / stats.totalQueries
    );

    // Track tags
    (queryData.tags || []).forEach(tag => {
        stats.topTags[tag] = (stats.topTags[tag] || 0) + 1;
    });

    // Daily usage
    const today = new Date().toISOString().split('T')[0];
    stats.dailyUsage[today] = (stats.dailyUsage[today] || 0) + 1;

    safeSetJSON(STORAGE_KEYS.USAGE_STATS, stats);
    return stats;
}

// ========== Context Memory (for improving answers) ==========

export function getContextMemory() {
    const history = getHistory();
    const prefs = getPreferences();

    // Build context from recent queries and preferences
    const recentTopics = history.slice(0, 10).map(h => h.query);
    const frequentTags = {};
    history.forEach(h => {
        (h.tags || []).forEach(tag => {
            frequentTags[tag] = (frequentTags[tag] || 0) + 1;
        });
    });

    const sortedTags = Object.entries(frequentTags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);

    return {
        recentTopics,
        frequentTags: sortedTags,
        preferences: {
            preferCodeExamples: prefs.preferCodeExamples,
            preferredLanguages: prefs.preferredLanguages,
            citationStyle: prefs.citationStyle,
            outputFormat: prefs.outputFormat,
        },
        totalResearches: history.length,
    };
}
