import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import db, { initDb } from './server/src/config/database';
import authRoutes from './server/src/routes/authRoutes';
import leadRoutes from './server/src/routes/leadRoutes';
import taskRoutes from './server/src/routes/taskRoutes';
import campaignRoutes from './server/src/routes/campaignRoutes';
import noteRoutes from './server/src/routes/noteRoutes';
import reportRoutes from './server/src/routes/reportRoutes';
import settingsRoutes from './server/src/routes/settingsRoutes';
import projectRoutes from './server/src/routes/projectRoutes';
import whatsappRoutes from './server/src/routes/whatsappRoutes';
import companyRoutes from './server/src/routes/companyRoutes';
import userRoutes from './server/src/routes/userRoutes';
import integrationRoutes from './server/src/routes/integrationRoutes';
import attendanceRoutes from './server/src/routes/attendanceRoutes';
import reminderRoutes from './server/src/routes/reminderRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://avgcrm.com',
  'https://www.avgcrm.com',
  'https://telecrm-pearl.vercel.app',
  'https://telecrm-production.up.railway.app',
];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
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
  optionsSuccessStatus: 200,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

let dbConnected = false;

const initialize = async () => {
  try {
    await initDb();
    dbConnected = true;
    console.log('Database initialized successfully');
    // ← REMOVED: demo user seeding block (admin@avgcrm.com etc.)
    // master_admin is created manually via SQL
  } catch (err) {
    console.error('Initialization error:', err);
  }
};

const initializePromise = initialize();

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

app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/leads',     leadRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/notes',     noteRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/whatsapp',  whatsappRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reminders', reminderRoutes);
// ← REMOVED: callRoutes

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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

export default app;

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
