import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/database';
import { StateAuthRequest, STATE_ROLES, canManage } from '../../middleware/stateAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const buildToken = async (user: any) => {
  let coordinatorStates: number[] = [];
  if (user.role === 'coordinator') {
    const r = await db.query('SELECT state_id FROM state_crm_coordinator_states WHERE user_id = $1', [user.id]);
    coordinatorStates = r.rows.map((row: any) => row.state_id);
  }
  return jwt.sign(
    {
      crm: 'state',
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      state_id: user.state_id,
      coordinatorStates,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE as any }
  );
};

// One-time bootstrap: only works when zero State CRM users exist yet.
// Creates the first account as 'master'. After that, use createUser instead.
export const bootstrapMaster = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  try {
    const countResult = await db.query('SELECT COUNT(*) as count FROM state_crm_users');
    const count = parseInt(countResult.rows[0].count);
    if (count > 0) {
      return res.status(403).json({ message: 'State CRM already has users. Use an existing Master/Admin account to create more users.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await db.query(
      `INSERT INTO state_crm_users (email, password, name, role) VALUES ($1, $2, $3, 'master') RETURNING id, email, name, role, state_id`,
      [email, hashedPassword, name]
    );
    const user = result.rows[0];
    const token = await buildToken(user);
    res.status(201).json({ token, user });
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ message: 'Email already exists' });
    console.error('[StateCRM] bootstrapMaster error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM state_crm_users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = result.rows[0];
    if (user.status === 'disabled') return res.status(403).json({ message: 'Account disabled' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = await buildToken(user);
    delete user.password;
    res.json({ token, user });
  } catch (error) {
    console.error('[StateCRM] login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Master/Admin create users for any state; Coordinator can create within their assigned states.
export const createUser = async (req: StateAuthRequest, res: Response) => {
  const { email, password, name, role, reporting_to, coordinator_states } = req.body;
  let { state_id } = req.body;
  const requester = req.stateUser!;
  try {
    if (!STATE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Hierarchy check: requester must outrank the role they're trying to create
    // (or hold an explicit exception, e.g. sales_manager -> sales_admin)
    if (!canManage(requester.role, role)) {
      return res.status(403).json({ message: `Your role (${requester.role}) cannot create a ${role}` });
    }

    // State scoping: who can assign users into which state(s)
    if (requester.role === 'coordinator') {
      const allowed = requester.coordinatorStates || [];
      if (!state_id || !allowed.includes(Number(state_id))) {
        return res.status(403).json({ message: 'You can only create users within your assigned states' });
      }
    } else if (['state_head', 'sales_manager', 'sales_admin'].includes(requester.role)) {
      // Single-state roles: always force their own state, never trust client input
      state_id = requester.state_id;
    }
    // master / admin / hr: unrestricted, whatever state_id was submitted (or none) is used as-is

    if (role === 'coordinator' && (!Array.isArray(coordinator_states) || coordinator_states.length === 0)) {
      return res.status(400).json({ message: 'coordinator_states must be a non-empty array for a coordinator' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Coordinators are multi-state, so the single state_id column doesn't apply to them
    const finalStateId = role === 'coordinator' ? null : (state_id || null);
    const result = await db.query(
      `INSERT INTO state_crm_users (email, password, name, role, state_id, reporting_to) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, state_id`,
      [email, hashedPassword, name, role, finalStateId, reporting_to || null]
    );
    const newUser = result.rows[0];

    if (role === 'coordinator') {
      for (const sid of coordinator_states) {
        await db.query(
          `INSERT INTO state_crm_coordinator_states (user_id, state_id) VALUES ($1, $2) ON CONFLICT (user_id, state_id) DO NOTHING`,
          [newUser.id, sid]
        );
      }
    }

    res.status(201).json({ user: newUser });
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ message: 'Email already exists' });
    console.error('[StateCRM] createUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listUsers = async (req: StateAuthRequest, res: Response) => {
  try {
    const requester = req.stateUser!;
    let where = '1=1';
    let params: any[] = [];
    if (requester.role === 'coordinator') {
      const states = requester.coordinatorStates && requester.coordinatorStates.length > 0 ? requester.coordinatorStates : [-1];
      where = 'state_id = ANY($1)';
      params = [states];
    } else if (requester.role !== 'master' && requester.role !== 'admin') {
      where = 'state_id = $1';
      params = [requester.state_id ?? -1];
    }
    const { rows } = await db.query(
      `SELECT id, email, name, role, state_id, reporting_to, status, created_at
       FROM state_crm_users WHERE ${where} ORDER BY created_at DESC`,
      params
    );

    // Attach coordinator_states for any coordinators in the result set
    const coordinatorIds = rows.filter((u: any) => u.role === 'coordinator').map((u: any) => u.id);
    let coordStatesByUser: Record<number, number[]> = {};
    if (coordinatorIds.length > 0) {
      const csRows = await db.query(
        `SELECT user_id, state_id FROM state_crm_coordinator_states WHERE user_id = ANY($1)`,
        [coordinatorIds]
      );
      for (const row of csRows.rows) {
        if (!coordStatesByUser[row.user_id]) coordStatesByUser[row.user_id] = [];
        coordStatesByUser[row.user_id].push(row.state_id);
      }
    }
    const usersWithStates = rows.map((u: any) => ({
      ...u,
      coordinator_states: u.role === 'coordinator' ? (coordStatesByUser[u.id] || []) : undefined,
    }));

    res.json({ users: usersWithStates });
  } catch (error: any) {
    console.error('[StateCRM] listUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const me = async (req: StateAuthRequest, res: Response) => {
  res.json({ user: req.stateUser });
};

// Self: update own profile (name, phone)
export const updateProfile = async (req: StateAuthRequest, res: Response) => {
  const { name, phone } = req.body;
  const requester = req.stateUser!;
  try {
    const result = await db.query(
      `UPDATE state_crm_users SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, email, name, role, state_id, department, position, profile_pic`,
      [name, requester.id]
    );
    if (phone !== undefined) {
      await db.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`).catch(() => {});
      await db.query(`UPDATE state_crm_users SET phone = $1 WHERE id = $2`, [phone, requester.id]);
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] updateProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Self: change own password (requires current password)
export const changePassword = async (req: StateAuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const requester = req.stateUser!;
  try {
    const result = await db.query('SELECT password FROM state_crm_users WHERE id = $1', [requester.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const valid = bcrypt.compareSync(currentPassword, result.rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE state_crm_users SET password = $1 WHERE id = $2', [hashed, requester.id]);
    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('[StateCRM] changePassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: edit another user's role/state/reporting_to, and optionally reset their password.
// Gated by role hierarchy — you can only edit users you outrank.
export const adminUpdateUser = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, reporting_to, newPassword, status, coordinator_states } = req.body;
  let { state_id } = req.body;
  const requester = req.stateUser!;
  try {
    const targetResult = await db.query('SELECT * FROM state_crm_users WHERE id = $1', [id]);
    if (targetResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const target = targetResult.rows[0];

    if (requester.role !== 'master' && !canManage(requester.role, target.role)) {
      return res.status(403).json({ message: 'You do not have permission to edit this user' });
    }
    if (role && !STATE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (role && requester.role !== 'master' && !canManage(requester.role, role)) {
      return res.status(403).json({ message: 'You cannot assign a role equal to or above your own' });
    }
    const effectiveRole = role || target.role;
    if (effectiveRole === 'coordinator' && requester.role !== 'master' && requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only master/admin can manage coordinators' });
    }
    if (coordinator_states !== undefined && !Array.isArray(coordinator_states)) {
      return res.status(400).json({ message: 'coordinator_states must be an array' });
    }

    // Single-state roles: never trust client-submitted state_id, force their own
    if (['state_head', 'sales_manager', 'sales_admin'].includes(requester.role) && state_id !== undefined) {
      state_id = requester.state_id;
    }

    // Coordinators are multi-state, so nullify the single state_id column if they're becoming (or already are) a coordinator
    const finalStateId = effectiveRole === 'coordinator' ? null : state_id;

    const result = await db.query(
      `UPDATE state_crm_users
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           state_id = $3,
           reporting_to = COALESCE($4, reporting_to),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING id, email, name, role, state_id, reporting_to, status`,
      [name, role, finalStateId !== undefined ? finalStateId : target.state_id, reporting_to, status, id]
    );

    if (effectiveRole === 'coordinator' && coordinator_states !== undefined) {
      await db.query(`DELETE FROM state_crm_coordinator_states WHERE user_id = $1`, [id]);
      for (const sid of coordinator_states) {
        await db.query(
          `INSERT INTO state_crm_coordinator_states (user_id, state_id) VALUES ($1, $2) ON CONFLICT (user_id, state_id) DO NOTHING`,
          [id, sid]
        );
      }
    } else if (role && role !== 'coordinator' && target.role === 'coordinator') {
      // demoted away from coordinator — clear stale multi-state assignments
      await db.query(`DELETE FROM state_crm_coordinator_states WHERE user_id = $1`, [id]);
    }

    if (newPassword) {
      const hashed = bcrypt.hashSync(newPassword, 10);
      await db.query('UPDATE state_crm_users SET password = $1 WHERE id = $2', [hashed, id]);
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] adminUpdateUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: delete a user (gated by role hierarchy)
export const deleteUser = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const requester = req.stateUser!;
  try {
    const targetResult = await db.query('SELECT role FROM state_crm_users WHERE id = $1', [id]);
    if (targetResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const target = targetResult.rows[0];
    if (requester.role !== 'master' && !canManage(requester.role, target.role)) {
      return res.status(403).json({ message: 'You do not have permission to delete this user' });
    }
    await db.query('DELETE FROM state_crm_users WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[StateCRM] deleteUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
