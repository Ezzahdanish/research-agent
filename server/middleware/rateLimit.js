/**
 * Simple in-memory rate limiter.
 * No external dependency needed for MVP.
 */

const windows = new Map();

/**
 * Create a rate limit middleware.
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window duration in ms
 */
export function rateLimit(maxRequests = 20, windowMs = 60000) {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();

        if (!windows.has(key)) {
            windows.set(key, { count: 1, start: now });
            return next();
        }

        const record = windows.get(key);

        if (now - record.start > windowMs) {
            // Window expired, reset
            record.count = 1;
            record.start = now;
            return next();
        }

        record.count++;

        if (record.count > maxRequests) {
            const retryAfter = Math.ceil((record.start + windowMs - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                error: 'rate_limit',
                message: `Too many requests. Try again in ${retryAfter}s.`,
            });
        }

        next();
    };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of windows) {
        if (now - record.start > 300000) {
            windows.delete(key);
        }
    }
}, 300000);
