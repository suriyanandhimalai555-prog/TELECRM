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
    const companyId = req.user.company_id;

    if (req.user.role === 'master_admin') {
      const cid = req.query.company_id ? parseInt(req.query.company_id as string) : null;
      if (cid) {
        usersResult = await db.query(`
          SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.phone, u.created_at, u.company_id,
          (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
          FROM users u WHERE u.company_id = $1
        `, [cid]);
      } else {
        usersResult = await db.query(`
          SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.phone, u.created_at, u.company_id,
          (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
          FROM users u
        `);
      }
    } else if (req.user.role === 'ADMIN' || req.user.role === 'company_admin') {
      usersResult = await db.query(`
        SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.phone, u.created_at, u.company_id,
        (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
        FROM users u
        WHERE u.company_id = $1
      `, [companyId]);
    } else {
      usersResult = await db.query(`
        SELECT u.id, u.email, u.name, u.role, u.reporting_to, u.phone, u.created_at, u.company_id,
        (SELECT ${jsonAggFunc} FROM user_projects WHERE user_id = u.id) as assigned_projects
        FROM users u 
        WHERE u.company_id = $1 AND (u.reporting_to = $2 OR u.id = $3)
      `, [companyId, req.user.id, req.user.id]);
    }

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
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const company_id = req.user.role === 'master_admin' ? (req.body.company_id || null) : req.user.company_id;

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = await db.query(
      'INSERT INTO users (email, password, name, role, reporting_to, phone, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [email, hashedPassword, name, role, reporting_to || null, req.body.phone || null, company_id]
    );

    const userId = result.rows[0].id;

    if (assigned_projects && Array.isArray(assigned_projects)) {
      for (const projectId of assigned_projects) {
        await db.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [userId, projectId]);
      }
    }

    const newUserResult = await db.query('SELECT id, email, name, role, reporting_to, phone FROM users WHERE id = $1', [userId]);
    res.status(201).json(newUserResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, name, role, reporting_to, password, assigned_projects } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM users WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      await db.query('UPDATE users SET email = $1, name = $2, role = $3, reporting_to = $4, password = $5, phone = $6 WHERE id = $7', [email, name, role, reporting_to, hashedPassword, req.body.phone || null, id]);
    } else {
      await db.query('UPDATE users SET email = $1, name = $2, role = $3, reporting_to = $4, phone = $5 WHERE id = $6', [email, name, role, reporting_to, req.body.phone || null, id]);
    }

    if (assigned_projects && Array.isArray(assigned_projects)) {
      await db.query('DELETE FROM user_projects WHERE user_id = $1', [id]);
      for (const projectId of assigned_projects) {
        await db.query('INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)', [id, projectId]);
      }
    }

    const updatedUserResult = await db.query('SELECT id, email, name, role, reporting_to, phone FROM users WHERE id = $1', [id]);
    res.json(updatedUserResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM users WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

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
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const companyId = req.user.company_id;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    if (req.user.role === 'master_admin') {
      const targetCid = req.query.company_id ? parseInt(req.query.company_id as string) : null;
      if (targetCid) {
        await client.query('DELETE FROM calls WHERE agent_id IN (SELECT id FROM users WHERE company_id = $1)', [targetCid]);
        await client.query('DELETE FROM tasks WHERE company_id = $1', [targetCid]);
        await client.query('DELETE FROM leads WHERE company_id = $1', [targetCid]);
        await client.query('DELETE FROM campaigns WHERE company_id = $1', [targetCid]);
        await client.query('DELETE FROM notes WHERE company_id = $1', [targetCid]);
        await client.query("DELETE FROM users WHERE role != 'master_admin' AND company_id = $1", [targetCid]);
      } else {
        await client.query('DELETE FROM calls');
        await client.query('DELETE FROM tasks');
        await client.query('DELETE FROM leads');
        await client.query('DELETE FROM campaigns');
        await client.query('DELETE FROM notes');
        await client.query("DELETE FROM users WHERE role != 'master_admin'");
      }
    } else {
      await client.query('DELETE FROM calls WHERE agent_id IN (SELECT id FROM users WHERE company_id = $1)', [companyId]);
      await client.query('DELETE FROM tasks WHERE company_id = $1', [companyId]);
      await client.query('DELETE FROM leads WHERE company_id = $1', [companyId]);
      await client.query('DELETE FROM campaigns WHERE company_id = $1', [companyId]);
      await client.query('DELETE FROM notes WHERE company_id = $1', [companyId]);
      await client.query("DELETE FROM users WHERE role NOT IN ('ADMIN', 'company_admin') AND company_id = $1", [companyId]);
    }
    
    await client.query('COMMIT');
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
