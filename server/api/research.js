/**
 * Research API routes.
 * POST /api/research — Start a research session
 * GET  /api/research/:id — Get completed report
 * GET  /api/research/:id/stream — SSE stream for deep mode
 */

import { Router } from 'express';
import { query as dbQuery, logError } from '../db/pool.js';
import { executeQuick, executeStandard, executeDeep } from '../services/researchEngine.js';
import { cacheGet, cacheSet } from '../services/cache.js';
import { validateResearchInput, validateUUID } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Rate limit: 20 research requests per minute
router.use(rateLimit(20, 60000));

/**
 * POST /api/research
 * Body: { query: string, mode: 'quick' | 'standard' | 'deep' }
 *
 * Quick/Standard: runs synchronously, returns full result.
 * Deep: creates session, returns sessionId — client connects to SSE at /:id/stream.
 */
router.post('/', validateResearchInput, async (req, res, next) => {
    const { query, mode } = req.body;

    try {
        // Check cache
        const cached = cacheGet(query, mode);
        if (cached) {
            return res.json({ ...cached, fromCache: true });
        }

        // Create session
        const sessionResult = await dbQuery(
            `INSERT INTO research_sessions (query, mode, status)
       VALUES ($1, $2, 'running')
       RETURNING id`,
            [query, mode]
        );
        const sessionId = sessionResult.rows[0].id;

        if (mode === 'deep') {
            // For deep mode, return session ID. Client connects to SSE.
            return res.json({ sessionId, mode: 'deep', status: 'running' });
        }

        // Quick or Standard — run synchronously
        const startTime = Date.now();
        const result = mode === 'quick'
            ? await executeQuick(query, sessionId)
            : await executeStandard(query, sessionId);

        const totalLatency = Date.now() - startTime;

        // Save report to DB
        await dbQuery(
            `INSERT INTO reports (session_id, content, citations) VALUES ($1, $2, $3)`,
            [sessionId, result.report, JSON.stringify(result.citations)]
        );

        // Update session
        await dbQuery(
            `UPDATE research_sessions SET status = 'completed', total_latency_ms = $1, total_tokens = $2 WHERE id = $3`,
            [totalLatency, result.tokens.total, sessionId]
        );

        const responseData = {
            sessionId,
            report: result.report,
            citations: result.citations,
            tokens: result.tokens,
            latencyMs: totalLatency,
            mode,
            query,
        };

        // Cache the result
        cacheSet(query, mode, responseData);

        return res.json(responseData);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/research/:id
 * Returns the completed report for a session.
 */
router.get('/:id', validateUUID('id'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const sessionResult = await dbQuery(
            `SELECT s.*, r.content AS report, r.citations
       FROM research_sessions s
       LEFT JOIN reports r ON r.session_id = s.id
       WHERE s.id = $1`,
            [id]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Session not found.' });
        }

        const session = sessionResult.rows[0];

        // Fetch phases
        const phasesResult = await dbQuery(
            `SELECT phase_name, duration_ms, tokens_used, metadata FROM research_phases WHERE session_id = $1 ORDER BY id`,
            [id]
        );

        return res.json({
            sessionId: session.id,
            query: session.query,
            mode: session.mode,
            status: session.status,
            report: session.report,
            citations: session.citations || [],
            totalLatencyMs: session.total_latency_ms,
            totalTokens: session.total_tokens,
            phases: phasesResult.rows,
            createdAt: session.created_at,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/research/:id/stream
 * Server-Sent Events for deep mode research.
 * Streams phase-by-phase progress, then the final report.
 */
router.get('/:id/stream', validateUUID('id'), async (req, res) => {
    const { id } = req.params;

    // Verify session exists and is pending/running
    const sessionResult = await dbQuery(
        `SELECT * FROM research_sessions WHERE id = $1`,
        [id]
    );

    if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'not_found', message: 'Session not found.' });
    }

    const session = sessionResult.rows[0];

    // If already completed, just return the report
    if (session.status === 'completed') {
        const reportResult = await dbQuery(
            `SELECT content, citations FROM reports WHERE session_id = $1`,
            [id]
        );
        return res.json({
            sessionId: id,
            status: 'completed',
            report: reportResult.rows[0]?.content,
            citations: reportResult.rows[0]?.citations || [],
        });
    }

    // Set up SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Handle client disconnect
    let aborted = false;
    req.on('close', () => {
        aborted = true;
    });

    try {
        sendEvent('phase', { phase: 'starting', progress: 0, message: 'Starting deep research...' });

        const result = await executeDeep(session.query, id, (progressEvent) => {
            if (!aborted) {
                sendEvent('phase', progressEvent);
            }
        });

        if (aborted) return;

        // Save report
        await dbQuery(
            `INSERT INTO reports (session_id, content, citations) VALUES ($1, $2, $3)`,
            [id, result.report, JSON.stringify(result.citations)]
        );

        await dbQuery(
            `UPDATE research_sessions SET status = 'completed', total_latency_ms = $1, total_tokens = $2 WHERE id = $3`,
            [result.latencyMs, result.tokens.total, id]
        );

        // Cache
        cacheSet(session.query, session.mode, {
            sessionId: id,
            report: result.report,
            citations: result.citations,
            tokens: result.tokens,
            latencyMs: result.latencyMs,
            mode: session.mode,
            query: session.query,
        });

        sendEvent('complete', {
            sessionId: id,
            report: result.report,
            citations: result.citations,
            tokens: result.tokens,
            latencyMs: result.latencyMs,
        });

        res.end();
    } catch (err) {
        console.error('[Stream] Deep research failed:', err.message);
        await logError(id, err.message, err.stack);

        await dbQuery(
            `UPDATE research_sessions SET status = 'failed' WHERE id = $1`,
            [id]
        );

        if (!aborted) {
            sendEvent('error', { message: err.message });
            res.end();
        }
    }
});

export default router;
