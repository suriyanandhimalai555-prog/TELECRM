import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import fs from 'fs';
import db, { initDb } from './server/src/config/database';
import authRoutes from './server/src/routes/authRoutes';
import leadRoutes from './server/src/routes/leadRoutes';
import callRoutes from './server/src/routes/callRoutes';
import taskRoutes from './server/src/routes/taskRoutes';
import campaignRoutes from './server/src/routes/campaignRoutes';
import noteRoutes from './server/src/routes/noteRoutes';
import reportRoutes from './server/src/routes/reportRoutes';
import settingsRoutes from './server/src/routes/settingsRoutes';
import projectRoutes from './server/src/routes/projectRoutes';
import whatsappRoutes from './server/src/routes/whatsappRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ─── CORS ────────────────────────────────────────────────────────────────────
// Put CORS + preflight BEFORE everything else — including express.json()
// so that OPTIONS requests never hit a parser or auth middleware.

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://avgcrm.com',
  'https://www.avgcrm.com',
  'https://telecrm-pearl.vercel.app',
  'https://telecrm-production.up.railway.app',
];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // same-origin / server-to-server calls
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.endsWith('.railway.app')) return true;
  if (origin.endsWith('.avgcrm.com')) return true;
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200, // some browsers (IE11) choke on 204
};

// ✅ Handle ALL preflight OPTIONS requests first — before any other middleware
app.options('*', cors(corsOptions));

// ✅ Apply CORS to every subsequent request
app.use(cors(corsOptions));

// ✅ Extra safety net: manually inject headers in case cors() misses anything
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }
  // Short-circuit OPTIONS immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ─── Body parsers (after CORS) ───────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const isVercel = process.env.VERCEL === '1';
let io: any = null;

if (!isVercel) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  io.on('connection', (socket: any) => {
    socket.on('disconnect', () => {});
  });
}

// ─── DB init ─────────────────────────────────────────────────────────────────
let dbConnected = false;

const initialize = async () => {
  try {
    await initDb();
    dbConnected = true;

    const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('password', salt);

      await db.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@avgcrm.com', hashedPassword, 'Admin User', 'admin']
      );
      await db.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['manager@avgcrm.com', hashedPassword, 'Manager User', 'manager']
      );
      await db.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['employee@avgcrm.com', hashedPassword, 'Employee User', 'employee']
      );
      console.log('Demo users seeded');
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }
};

const initializePromise = initialize();

// ─── Health checks ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    db: dbConnected ? 'connected' : 'disconnected',
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// ─── Attach socket.io to every request ───────────────────────────────────────
app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/leads',     leadRoutes);
app.use('/api/calls',     callRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/notes',     noteRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/whatsapp',  whatsappRoutes);

// ─── Frontend static serving ─────────────────────────────────────────────────
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possiblePaths = [
      path.join(__dirname, 'dist'),
      path.join(process.cwd(), 'dist'),
      '/app/dist',
    ];
    const distPath =
      possiblePaths.find(p => fs.existsSync(p)) || path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`index.html not found at ${distPath}`);
      }
    });
  }
})();

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

export default app;

// ─── Start server ─────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain && process.env.VERCEL !== '1') {
  initializePromise
    .then(() => {
      const PORT = Number(process.env.PORT) || 3000;
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔══════════════════════════════════╗
║   AVG CRM Server Started         ║
║   URL : http://localhost:${PORT}   ║
║   ENV : ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║   DB  : ${dbConnected ? 'connected ✅' : 'disconnected ❌'}         ║
╚══════════════════════════════════╝
        `);
      });
    })
    .catch(err => {
      console.error('Server failed to start:', err);
    });
}