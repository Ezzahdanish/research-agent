import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {any[]} params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
        }
        return result;
    } catch (err) {
        console.error('[DB] Query error:', err.message, '\nQuery:', text.slice(0, 120));
        throw err;
    }
}

/**
 * Run schema migrations.
 */
export async function migrate() {
    try {
        const schemaPath = join(__dirname, 'schema.sql');
        const sql = readFileSync(schemaPath, 'utf-8');
        await pool.query(sql);
        console.log('[DB] Schema migration complete');
    } catch (err) {
        console.error('[DB] Migration failed:', err.message);
        throw err;
    }
}

/**
 * Log an error to the error_logs table.
 */
export async function logError(sessionId, message, stack) {
    try {
        await query(
            'INSERT INTO error_logs (session_id, error_message, error_stack) VALUES ($1, $2, $3)',
            [sessionId || null, message, stack || null]
        );
    } catch (e) {
        console.error('[DB] Failed to log error:', e.message);
    }
}

export default pool;
