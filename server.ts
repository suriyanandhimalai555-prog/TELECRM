import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import fs from 'fs';
import db, { initDb } from './server/src/config/database';

// Routes
import authRoutes from './server/src/routes/authRoutes';
import leadRoutes from './server/src/routes/leadRoutes';
import callRoutes from './server/src/routes/callRoutes';
import taskRoutes from './server/src/routes/taskRoutes';
import campaignRoutes from './server/src/routes/campaignRoutes';
import noteRoutes from './server/src/routes/noteRoutes';
import reportRoutes from './server/src/routes/reportRoutes';
import settingsRoutes from './server/src/routes/settingsRoutes';
import projectRoutes from './server/src/routes/projectRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ✅ CORS Fix
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://avgcrm.com',
      'https://www.avgcrm.com',
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.railway.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Socket.io - Disable on Vercel as it is not supported in serverless functions
const isVercel = process.env.VERCEL === '1';
let io: any = null;

if (!isVercel) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: any) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
}

// Initialize Database and Seed
const initialize = async () => {
  try {
    await initDb();
    
    const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);
    
    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('password', salt);

      await db.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', [
        'admin@avgcrm.com',
        hashedPassword,
        'Admin User',
        'ADMIN'
      ]);

      await db.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', [
        'manager@avgcrm.com',
        hashedPassword,
        'Manager User',
        'MANAGER'
      ]);

      await db.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', [
        'employee@avgcrm.com',
        hashedPassword,
        'Employee User',
        'EMPLOYEE'
      ]);

      console.log('Demo users seeded');
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }
};

initialize().catch(err => console.error('Background initialization failed:', err));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV, vercel: process.env.VERCEL === '1' });
});

// Attach io to request
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectRoutes);

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Try multiple possible dist paths for Railway/Vercel compatibility
  const possiblePaths = [
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
    '/app/dist',
  ];

  const distPath = possiblePaths.find(p => fs.existsSync(p)) || path.join(process.cwd(), 'dist');
  console.log(`Serving static files from: ${distPath}`);
  console.log(`Dist exists: ${fs.existsSync(distPath)}`);

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`index.html not found. Checked: ${distPath}`);
    }
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// For Vercel serverless support
export default app;

// Only listen if not on Vercel
if (process.env.VERCEL !== '1') {
  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}