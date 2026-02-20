/**
 * History API routes.
 * GET    /api/history     — Paginated research history
 * DELETE /api/history/:id — Delete a session
 */

import { Router } from 'express';
import { query as dbQuery } from '../db/pool.js';
import { validateUUID } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Rate limit: 60 reads per minute
router.use(rateLimit(60, 60000));

/**
 * GET /api/history
 * Query params:
 *   - limit (default 50, max 100)
 *   - offset (default 0)
 */
router.get('/', async (req, res, next) => {
    try {
        let limit = parseInt(req.query.limit) || 50;
        let offset = parseInt(req.query.offset) || 0;
        limit = Math.min(Math.max(limit, 1), 100);
        offset = Math.max(offset, 0);

        const result = await dbQuery(
            `SELECT
         s.id,
         LEFT(s.query, 60) AS title,
         s.query,
         s.mode,
         s.status,
         s.total_latency_ms,
         s.total_tokens,
         s.created_at
       FROM research_sessions s
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await dbQuery(
            `SELECT COUNT(*) AS total FROM research_sessions`
        );

        return res.json({
            items: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit,
            offset,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/history/:id
 * Deletes a research session and cascades to phases/reports.
 */
router.delete('/:id', validateUUID('id'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await dbQuery(
            `DELETE FROM research_sessions WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Session not found.' });
        }

        return res.json({ deleted: true, id });
    } catch (err) {
        next(err);
    }
});

export default router;
