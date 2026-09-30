import { Response } from 'express';
import db from '../../config/database';

// Adapter stubs for importing or proxying WORKSPRINT attendance into State CRM tables.
// These are non-destructive helper endpoints and CLI-style functions to be expanded
// when we decide the exact merge strategy (live proxy, periodic sync, or full import).

// Example: run a one-time sync of WORKSPRINT attendance rows into `state_crm_attendance`.
export const syncAttendanceFromWorkSprint = async (_req: any, res: Response) => {
  try {
    // TODO: implement: read attendance records from WORKSPRINT database (Prisma) or API,
    // transform fields to match state_crm_attendance and upsert into the state CRM DB.
    // This stub intentionally does not modify data yet — it will return a plan/preview.

    // Example preview structure (client-side tooling can use this):
    const preview = {
      sourceCount: 0,
      wouldCreate: 0,
      wouldUpdate: 0,
      sample: [] as any[],
    };

    return res.json({ success: true, preview });
  } catch (err: any) {
    console.error('[StateCRM][WORKSPRINT] syncAttendance error:', err);
    return res.status(500).json({ message: 'Sync failed' });
  }
};

// Lightweight proxy helper: fetch a single WORKSPRINT attendance by id and return
// a mapped object compatible with state_crm_attendance columns. This can be used
// by migration scripts or preview UIs.
export const mapWorkSprintRecordToState = (wsRecord: any) => {
  if (!wsRecord) return null;
  return {
    state_id: wsRecord.organizationId || null,
    user_id: wsRecord.employeeId || null,
    user_name: wsRecord.employeeName || wsRecord.email || null,
    check_in: wsRecord.checkInTime || wsRecord.check_in || null,
    check_out: wsRecord.checkOutTime || wsRecord.check_out || null,
    lat: wsRecord.lat || null,
    lng: wsRecord.lng || null,
    date: wsRecord.date || (wsRecord.checkInTime ? new Date(wsRecord.checkInTime).toISOString().slice(0,10) : null),
    status: wsRecord.status || 'present',
    late_minutes: wsRecord.lateMinutes || 0,
    total_hours: wsRecord.totalHours || 0,
    photo: wsRecord.photo || null,
  };
};

// CLI helper (call from node) to upsert a mapped record into `state_crm_attendance`.
export const upsertMappedRecord = async (mapped: any) => {
  if (!mapped) return null;
  const params = [
    mapped.state_id,
    mapped.user_id,
    mapped.user_name,
    mapped.check_in,
    mapped.check_out,
    mapped.lat,
    mapped.lng,
    mapped.photo,
    mapped.status,
    mapped.late_minutes,
    mapped.total_hours,
    mapped.date,
  ];
  // NOTE: this query is intentionally conservative and uses INSERT ... ON CONFLICT
  // only when a unique constraint is defined. Adjust to match your migration strategy.
  const q = `INSERT INTO state_crm_attendance
    (state_id, user_id, user_name, check_in, check_out, lat, lng, photo, status, late_minutes, total_hours, date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (state_id, user_id, date) DO UPDATE SET
      check_in = EXCLUDED.check_in,
      check_out = EXCLUDED.check_out,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      photo = EXCLUDED.photo,
      status = EXCLUDED.status,
      late_minutes = EXCLUDED.late_minutes,
      total_hours = EXCLUDED.total_hours
    RETURNING *`;
  const { rows } = await db.query(q, params);
  return rows[0];
};

export default {
  syncAttendanceFromWorkSprint,
  mapWorkSprintRecordToState,
  upsertMappedRecord,
};
