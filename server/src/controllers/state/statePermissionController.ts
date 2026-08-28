import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, STATE_ROLES } from '../../middleware/stateAuth';
import { PERMISSION_DEFINITIONS } from '../../config/permissions';

export const getPermissionMatrix = async (req: StateAuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT role, permission_key FROM state_crm_role_permissions WHERE allowed = true`
    );
    const matrix: Record<string, string[]> = {};
    for (const role of STATE_ROLES) matrix[role] = [];
    for (const row of rows) {
      if (!matrix[row.role]) matrix[row.role] = [];
      matrix[row.role].push(row.permission_key);
    }
    matrix['master'] = PERMISSION_DEFINITIONS.map(p => p.key);

    res.json({
      roles: STATE_ROLES,
      permissions: PERMISSION_DEFINITIONS,
      matrix,
    });
  } catch (err) {
    console.error('[StateCRM] getPermissionMatrix error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePermission = async (req: StateAuthRequest, res: Response) => {
  const { role, permission_key, allowed } = req.body;
  if (!role || !permission_key || typeof allowed !== 'boolean') {
    return res.status(400).json({ message: 'role, permission_key, allowed are required' });
  }
  if (!STATE_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (role === 'master') {
    return res.status(400).json({ message: "master's permissions cannot be modified" });
  }
  try {
    if (allowed) {
      await db.query(
        `INSERT INTO state_crm_role_permissions (role, permission_key, allowed)
         VALUES ($1, $2, true)
         ON CONFLICT (role, permission_key) DO UPDATE SET allowed = true`,
        [role, permission_key]
      );
    } else {
      await db.query(
        `DELETE FROM state_crm_role_permissions WHERE role = $1 AND permission_key = $2`,
        [role, permission_key]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] updatePermission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
