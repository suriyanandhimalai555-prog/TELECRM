import { Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getUsers = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const isPostgres = !!process.env.DATABASE_URL;
    const jsonAggFunc = isPostgres 
      ? "COALESCE(JSON_AGG(project_id) FILTER (WHERE project_id IS NOT NULL), '[]')" 
      : "JSON_GROUP_ARRAY(project_id)";

    let usersResult;
    if (req.user.role === 'ADMIN') {
      usersResult = await db.query(`
        SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.created_at,
        (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
        FROM users u
      `);
    } else {
      // Manager sees team
      usersResult = await db.query(`
        SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.created_at,
        (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
        FROM users u 
        WHERE u.reporting_to = $1 OR u.id = $2
      `, [req.user.id, req.user.id]);
    }

    // Handle SQLite vs PG JSON differences
    const users = usersResult.rows.map(r => ({
      ...r,
      assigned_projects: typeof r.assigned_projects === 'string' ? JSON.parse(r.assigned_projects) : (r.assigned_projects || [])
    }));

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, name, role, reporting_to, assigned_projects } = req.body;
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = await db.query(
      'INSERT INTO users (email, password, name, role, reporting_to) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, name, role, reporting_to || null]
    );

    const userId = result.rows[0].id;

    // Assign projects
    if (assigned_projects && Array.isArray(assigned_projects)) {
      for (const projectId of assigned_projects) {
        await db.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [userId, projectId]);
      }
    }

    const newUserResult = await db.query('SELECT id, email, name, role, reporting_to FROM users WHERE id = $1', [userId]);
    res.status(201).json(newUserResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, name, role, reporting_to, password, assigned_projects } = req.body;

  try {
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      await db.query('UPDATE users SET email = $1, name = $2, role = $3, reporting_to = $4, password = $5 WHERE id = $6', [email, name, role, reporting_to, hashedPassword, id]);
    } else {
      await db.query('UPDATE users SET email = $1, name = $2, role = $3, reporting_to = $4 WHERE id = $5', [email, name, role, reporting_to, id]);
    }

    // Update project assignments
    if (assigned_projects && Array.isArray(assigned_projects)) {
      await db.query('DELETE FROM user_projects WHERE user_id = $1', [id]);
      for (const projectId of assigned_projects) {
        await db.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
      }
    }

    const updatedUserResult = await db.query('SELECT id, email, name, role, reporting_to FROM users WHERE id = $1', [id]);
    res.json(updatedUserResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClientKey = async (req: AuthRequest, res: Response) => {
  const { client_key, gemini_key, front_key, backend_key, whatsapp_token, whatsapp_phone_id, whatsapp_waba_id } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    await db.query(
      'UPDATE users SET client_key = $1, gemini_key = $2, front_key = $3, backend_key = $4, whatsapp_token = $5, whatsapp_phone_id = $6, whatsapp_waba_id = $7 WHERE id = $8', 
      [client_key, gemini_key, front_key, backend_key, whatsapp_token, whatsapp_phone_id, whatsapp_waba_id, req.user.id]
    );
    res.json({ message: 'Keys updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clearAllData = async (req: AuthRequest, res: Response) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM calls');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM leads');
    await client.query('DELETE FROM campaigns');
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM audit_logs');
    // Keep users but maybe clear non-admins? 
    // Requirement says "Clear All Data", usually implies everything except the performing admin.
    await client.query("DELETE FROM users WHERE role != 'ADMIN'");
    await client.query('COMMIT');
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
