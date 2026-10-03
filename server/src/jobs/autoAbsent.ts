import db from '../config/database';

// Marks everyone with no attendance row today as absent, once, at/after 19:00 India time.
// Skips: Sundays, holidays, approved leave, and master/admin/hr accounts.
// Safe to run twice: the INSERT only adds rows where none exist for that date.
const SKIP_ROLES = ['master', 'admin', 'hr'];
let lastRunDate = '';

export const runAutoAbsent = async (): Promise<number> => {
  const r = await db.query(
    `INSERT INTO state_crm_attendance (state_id, user_id, user_name, date, status, late_minutes, total_hours)
     SELECT u.state_id, u.id, u.email, t.d, 'absent', 0, 0
     FROM state_crm_users u
     CROSS JOIN (SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS d) t
     WHERE u.status = 'active'
       AND u.role <> ALL($1::text[])
       AND EXTRACT(DOW FROM t.d) <> 0
       AND NOT EXISTS (SELECT 1 FROM state_crm_attendance a WHERE a.user_id = u.id AND a.date = t.d)
       AND NOT EXISTS (SELECT 1 FROM state_crm_holidays h WHERE h.date = t.d AND (h.state_id IS NULL OR h.state_id = u.state_id))
       AND NOT EXISTS (SELECT 1 FROM state_crm_leave_requests l WHERE l.user_id = u.id AND l.date = t.d AND l.status = 'approved')
     RETURNING id`, [SKIP_ROLES]);
  return r.rowCount || 0;
};

export const startAutoAbsent = () => {
  if (process.env.AUTO_ABSENT !== 'on') {
    console.log('[AutoAbsent] disabled (set AUTO_ABSENT=on to enable)');
    return;
  }
  console.log('[AutoAbsent] enabled: runs daily at 19:00 IST');
  setInterval(async () => {
    try {
      const n = await db.query(`SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date::text AS d, to_char(NOW() AT TIME ZONE 'Asia/Kolkata','HH24:MI') AS hm`);
      const { d, hm } = n.rows[0];
      if (hm >= '19:00' && lastRunDate !== d) {
        lastRunDate = d;
        const count = await runAutoAbsent();
        console.log(`[AutoAbsent] ${d}: marked ${count} absent`);
      }
    } catch (e) { console.error('[AutoAbsent] error', e); }
  }, 60 * 1000);
};
