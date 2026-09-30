import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import apiRouter from './src/routes.js';
import { initializeDatabase } from './src/dbStore.js';
import { migrateJsonToPostgres } from './src/migrateJsonToPg.js';
import { prisma } from './src/prisma.js';

const backendRoot = typeof __dirname !== 'undefined'
  ? path.resolve(__dirname, '..')
  : path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendRoot, '.env') });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize PostgreSQL database & schema
  try {
    await initializeDatabase();
    await migrateJsonToPostgres();
  } catch (dbErr) {
    console.error('[PostgreSQL Initialization Error]:', dbErr);
  }

  // Basic security & parsing middleware
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Security Headers Simulation
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // CORS Middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve the built React app when present (production single-service deploy)
  const clientDist = path.resolve(backendRoot, '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Work Tracker Server] Listening on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown: Railway sends SIGTERM on redeploy. Close DB connections
  // cleanly instead of dropping them (avoids Postgres "unexpected eof" logs).
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Work Tracker Server] ${signal} received, shutting down...`);
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    });
    server.closeIdleConnections();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
