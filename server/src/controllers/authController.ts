import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, reporting_to } = req.body;

  try {
    const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);
    const finalRole = userCount === 0 ? 'ADMIN' : (role || 'EMPLOYEE');

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = await db.query(
      'INSERT INTO users (email, password, name, role, reporting_to) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, name, finalRole, reporting_to || null]
    );

    const userResult = await db.query('SELECT id, email, name, role FROM users WHERE id = $1', [result.rows[0].id]);
    const user = userResult.rows[0];

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRE as any });

    res.status(201).json({ token, user });
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: JWT_EXPIRE as any });

    res.json({ token, user: userWithoutPassword });
  } catch (error: any) {
    console.error('Login Error:', error);
    let errorMessage = 'Server error during login';
    let detailedError = error.message;

    if (error.message.includes('DATABASE_URL')) {
      errorMessage = 'Database not configured';
      detailedError = 'Please set the DATABASE_URL environment variable in your Vercel/Railway settings.';
    } else if (error.message.includes('connect') || error.message.includes('PostgreSQL')) {
      errorMessage = 'Database connection failed';
      detailedError = 'The server could not connect to your PostgreSQL database. Check your credentials and network settings.';
    }

    res.status(500).json({ 
      message: errorMessage, 
      error: detailedError 
    });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const userResult = await db.query('SELECT id, email, name, role, reporting_to, client_key, gemini_key, front_key, backend_key FROM users WHERE id = $1', [req.user.id]);
    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('Auth Me Error:', error);
    res.status(500).json({ message: 'Database connection error. Please check your DATABASE_URL.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
