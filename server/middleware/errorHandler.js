import { logError } from '../db/pool.js';

/**
 * Global error handling middleware.
 * Catches uncaught errors, logs them to the DB, and returns a sanitized response.
 */
export function errorHandler(err, req, res, _next) {
    const sessionId = req.body?.sessionId || req.params?.id || null;

    console.error('[Error]', err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // Log to DB (fire and forget)
    logError(sessionId, err.message, err.stack);

    // Determine status code
    const status = err.status || err.statusCode || 500;

    res.status(status).json({
        error: status === 500 ? 'internal_error' : 'request_error',
        message: status === 500
            ? 'An internal error occurred. Please try again.'
            : err.message,
    });
}
