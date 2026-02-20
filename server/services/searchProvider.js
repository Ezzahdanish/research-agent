/**
 * Tavily Search API integration for real web source discovery.
 * Falls back gracefully if TAVILY_API_KEY is not configured.
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Search the web for relevant sources.
 * @param {string} query - Search query
 * @param {Object} [options]
 * @param {number} [options.maxResults=5]
 * @param {string} [options.searchDepth='basic'] - 'basic' or 'advanced'
 * @returns {Promise<Array<{title: string, url: string, snippet: string, score: number}>>}
 */
export async function searchWeb(query, { maxResults = 5, searchDepth = 'basic' } = {}) {
    if (!process.env.TAVILY_API_KEY) {
        console.warn('[Search] TAVILY_API_KEY not set — skipping web search');
        return [];
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query,
                max_results: maxResults,
                search_depth: searchDepth,
                include_answer: false,
                include_raw_content: false,
            }),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Search] Tavily API error ${response.status}:`, text);
            return [];
        }

        const data = await response.json();

        return (data.results || []).map((r) => ({
            title: r.title || 'Untitled',
            url: r.url,
            snippet: r.content || '',
            score: r.score || 0,
        }));
    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn('[Search] Tavily request timed out');
        } else {
            console.error('[Search] Web search failed:', err.message);
        }
        return [];
    }
}

/**
 * Run multiple searches in parallel (for deep mode sub-questions).
 * @param {string[]} queries
 * @param {Object} [options]
 * @returns {Promise<Array<{query: string, results: Array}>>}
 */
export async function searchMultiple(queries, options = {}) {
    const results = await Promise.allSettled(
        queries.map((q) => searchWeb(q, options))
    );

    return queries.map((q, i) => ({
        query: q,
        results: results[i].status === 'fulfilled' ? results[i].value : [],
    }));
}
