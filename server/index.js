/**
 * Express server entry point.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { migrate } from './db/pool.js';
import researchRoutes from './api/research.js';
import historyRoutes from './api/history.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api/research', researchRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start
async function start() {
    try {
        // Run migrations
        await migrate();
        console.log('[Server] Database ready');

        app.listen(PORT, () => {
            console.log(`[Server] Running on http://localhost:${PORT}`);
            console.log(`[Server] API key configured: ${!!process.env.OPENAI_API_KEY}`);
            console.log(`[Server] Tavily configured: ${!!process.env.TAVILY_API_KEY}`);
        });
    } catch (err) {
        console.error('[Server] Failed to start:', err.message);
        process.exit(1);
    }
}

start();
