import db from './database';

export interface PermissionDef {
  key: string;
  label: string;
  category: string;
}

export const PERMISSION_DEFINITIONS: PermissionDef[] = [
  { key: 'view_leads', label: 'View Leads', category: 'Leads' },
  { key: 'create_leads', label: 'Create Leads', category: 'Leads' },
  { key: 'edit_leads', label: 'Edit Leads', category: 'Leads' },
  { key: 'delete_leads', label: 'Delete Leads', category: 'Leads' },

  { key: 'view_contacts', label: 'View Contacts', category: 'Contacts' },
  { key: 'manage_contacts', label: 'Manage Contacts', category: 'Contacts' },

  { key: 'view_tasks', label: 'View Tasks', category: 'Tasks' },
  { key: 'manage_tasks', label: 'Manage Tasks', category: 'Tasks' },

  { key: 'view_reminders', label: 'View Reminders', category: 'Reminders' },
  { key: 'manage_reminders', label: 'Manage Reminders', category: 'Reminders' },

  { key: 'view_attendance', label: 'View Attendance', category: 'Attendance' },
  { key: 'manage_attendance', label: 'Manage Attendance', category: 'Attendance' },

  { key: 'view_reports', label: 'View Reports', category: 'Reports' },

  { key: 'view_campaigns', label: 'View Campaigns', category: 'Campaigns' },
  { key: 'manage_campaigns', label: 'Manage Campaigns', category: 'Campaigns' },

  { key: 'view_calls', label: 'View Calls', category: 'Calls' },
  { key: 'manage_calls', label: 'Manage Calls', category: 'Calls' },
  { key: 'view_custom_fields', label: 'View Custom Fields', category: 'Custom Fields' },
  { key: 'manage_custom_fields', label: 'Manage Custom Fields', category: 'Custom Fields' },
  { key: 'view_whatsapp', label: 'View WhatsApp', category: 'WhatsApp' },
  { key: 'send_whatsapp', label: 'Send WhatsApp', category: 'WhatsApp' },

  { key: 'manage_users', label: 'Manage Users', category: 'Administration' },
  { key: 'manage_roles', label: 'Manage Roles & Permissions', category: 'Administration' },
  { key: 'manage_settings', label: 'Manage Settings', category: 'Administration' },
];

export const hasStatePermission = async (role: string, key: string): Promise<boolean> => {
  if (role === 'master') return true;
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM state_crm_role_permissions WHERE role = $1 AND permission_key = $2 AND allowed = true LIMIT 1`,
      [role, key]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('[Permissions] hasStatePermission error:', err);
    return false;
  }
};
