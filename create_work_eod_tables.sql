-- EOD/attendance-marking tables for Work Tracking's Dashboard panel.
-- Separate from state_crm_work_updates (the work-entry approval system already built).
-- Prefixed consistently with that table's naming (state_crm_work_*).

CREATE TABLE IF NOT EXISTS state_crm_work_eod (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
  state_id    INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
  status      VARCHAR(20) NOT NULL DEFAULT 'marked' CHECK (status IN ('marked', 'absent')),
  note        TEXT,
  marked_at   TIMESTAMP DEFAULT NOW(),
  CONSTRAINT state_crm_work_eod_unique UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS state_crm_work_eod_date_idx ON state_crm_work_eod(date);
CREATE INDEX IF NOT EXISTS state_crm_work_eod_state_id_idx ON state_crm_work_eod(state_id);

-- Admin/HR override: flips a specific employee's EOD ON for a specific date,
-- letting them mark outside the 9AM-7PM window (matches the ON/OFF toggle in the screenshots).
CREATE TABLE IF NOT EXISTS state_crm_work_eod_enablements (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  enabled_by      INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
  enabled_by_name VARCHAR(255),
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT state_crm_work_eod_enablements_unique UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS state_crm_work_eod_enablements_date_idx ON state_crm_work_eod_enablements(date);

-- Per-state override of the EOD window (defaults to 09:00-19:00 if no row exists).
CREATE TABLE IF NOT EXISTS state_crm_work_eod_settings (
  state_id     INTEGER PRIMARY KEY REFERENCES state_crm_states(id) ON DELETE CASCADE,
  office_start TIME NOT NULL DEFAULT '09:00',
  office_end   TIME NOT NULL DEFAULT '19:00'
);
