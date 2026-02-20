/**
 * Input validation middleware for research endpoints.
 */

const ALLOWED_MODES = ['quick', 'standard', 'deep'];
const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 2000;

// Basic XSS/injection patterns to reject
const DANGEROUS_PATTERNS = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
];

export function validateResearchInput(req, res, next) {
    const { query, mode } = req.body;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Query is required and must be a string.',
        });
    }

    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
        return res.status(400).json({
            error: 'validation_error',
            message: `Query must be at least ${MIN_QUERY_LENGTH} characters.`,
        });
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({
            error: 'validation_error',
            message: `Query must be at most ${MAX_QUERY_LENGTH} characters.`,
        });
    }

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(trimmed)) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Query contains disallowed content.',
            });
        }
    }

    if (mode && !ALLOWED_MODES.includes(mode)) {
        return res.status(400).json({
            error: 'validation_error',
            message: `Mode must be one of: ${ALLOWED_MODES.join(', ')}`,
        });
    }

    // Sanitize
    req.body.query = trimmed;
    req.body.mode = mode || 'standard';

    next();
}

export function validateUUID(param = 'id') {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    return (req, res, next) => {
        const value = req.params[param];
        if (!value || !UUID_REGEX.test(value)) {
            return res.status(400).json({
                error: 'validation_error',
                message: `Invalid ${param} format.`,
            });
        }
        next();
    };
}
