import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let pool: InstanceType<typeof Pool>;

if (process.env.DATABASE_URL) {
  const isLocal = process.env.DATABASE_URL.includes('localhost') || 
                  process.env.DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 15000,
    max: 30,
    allowExitOnIdle: false,
  });
} else {
  pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'telecrm',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'AVG@123',
    ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') 
         ? { rejectUnauthorized: false } 
         : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 15000,
    max: 30,
    allowExitOnIdle: false,
  });
}

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

export const initDb = async () => {

  // ── Multi-tenant: companies table ─────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id           SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      whatsapp_number VARCHAR(50),
      logo         TEXT,
      status       VARCHAR(20) DEFAULT 'active',
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50)`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);

  // ── Multi-tenant: whatsapp_accounts per company ───────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      label           VARCHAR(100) NOT NULL,
      phone_number    VARCHAR(50),
      phone_number_id VARCHAR(100),
      access_token    TEXT,
      status          VARCHAR(20) DEFAULT 'inactive',
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Multi-tenant: whatsapp_templates per company ───────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name            VARCHAR(255) NOT NULL,
      category        VARCHAR(100),
      language        VARCHAR(50),
      components      TEXT,
      status          VARCHAR(50),
      created_at      TIMESTAMP DEFAULT NOW(),
      CONSTRAINT whatsapp_templates_company_name_key UNIQUE (company_id, name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'employee',
      reporting_to INTEGER,
      client_key TEXT,
      gemini_key TEXT,
      front_key TEXT,
      backend_key TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'new',
      assigned_to INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      user_id INTEGER REFERENCES users(id),
      agent_id INTEGER REFERENCES users(id),
      caller VARCHAR(255),
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      duration_seconds INTEGER,
      duration INTEGER,
      type VARCHAR(50),
      campaign_id INTEGER,
      status VARCHAR(50),
      feedback TEXT,
      notes TEXT,
      outcome VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      due_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      content TEXT,
      lead_id INTEGER REFERENCES leads(id),
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id SERIAL PRIMARY KEY,
      message_id VARCHAR(255) UNIQUE,
      from_number VARCHAR(50),
      to_number VARCHAR(50),
      message_text TEXT,
      direction VARCHAR(20) DEFAULT 'inbound',
      status VARCHAR(50) DEFAULT 'received',
      contact_name VARCHAR(255),
      timestamp TIMESTAMP DEFAULT NOW(),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Existing column additions (unchanged) ─────────────────────────────────
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone_id VARCHAR(100)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_waba_id VARCHAR(100)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_projects INTEGER[] DEFAULT '{}'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_to INTEGER`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile VARCHAR(50)`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50)`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'NEW'`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50)`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_id INTEGER`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[]`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS reporting_to INTEGER`);

  // ── NEW: Add company_id to all tables ────────────────────────────────────
  await pool.query(`ALTER TABLE users     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE users     ALTER COLUMN role TYPE VARCHAR(30)`);
  await pool.query(`ALTER TABLE leads     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE tasks     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE projects  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE notes     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_config (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      imap_host VARCHAR(255),
      imap_user VARCHAR(255),
      imap_pass VARCHAR(255),
      imap_port VARCHAR(10),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE email_config ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);

  // Fix calls table missing columns
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES users(id)`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS caller VARCHAR(255)`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS start_time TIMESTAMP`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS end_time TIMESTAMP`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_seconds INTEGER`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS type VARCHAR(50)`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS campaign_id INTEGER`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS feedback TEXT`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS outcome VARCHAR(255)`);
  // Sync agent_id from user_id for existing records
  await pool.query(`UPDATE calls SET agent_id = user_id WHERE agent_id IS NULL AND user_id IS NOT NULL`);

  // Fix legacy lowercase roles
  await pool.query(`UPDATE users SET role = 'EMPLOYEE' WHERE role = 'employee'`);
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE role = 'admin'`);
  await pool.query(`UPDATE users SET role = 'MANAGER' WHERE role = 'manager'`);

  // ── State CRM: fully separate from the main CRM (no shared tables) ────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_states (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password      VARCHAR(255) NOT NULL,
      name          VARCHAR(255),
      role          VARCHAR(30) NOT NULL DEFAULT 'team_member',
      state_id      INTEGER REFERENCES state_crm_states(id) ON DELETE SET NULL,
      reporting_to  INTEGER REFERENCES state_crm_users(id) ON DELETE SET NULL,
      status        VARCHAR(20) DEFAULT 'active',
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  // Coordinators can be assigned to more than one state
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_coordinator_states (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      state_id   INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_coord_state_unique UNIQUE (user_id, state_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_leads (
      id           SERIAL PRIMARY KEY,
      state_id     INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      name         VARCHAR(255),
      email        VARCHAR(255),
      phone        VARCHAR(50),
      status       VARCHAR(50) DEFAULT 'new',
      assigned_to  INTEGER REFERENCES state_crm_users(id),
      created_by   INTEGER REFERENCES state_crm_users(id),
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_tasks (
      id           SERIAL PRIMARY KEY,
      state_id     INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      lead_id      INTEGER REFERENCES state_crm_leads(id) ON DELETE CASCADE,
      title        VARCHAR(255),
      description  TEXT,
      status       VARCHAR(50) DEFAULT 'pending',
      assigned_to  INTEGER REFERENCES state_crm_users(id),
      created_by   INTEGER REFERENCES state_crm_users(id),
      due_date     TIMESTAMP,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_customers (
      id           SERIAL PRIMARY KEY,
      state_id     INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      lead_id      INTEGER REFERENCES state_crm_leads(id) ON DELETE SET NULL,
      name         VARCHAR(255),
      email        VARCHAR(255),
      phone        VARCHAR(50),
      assigned_to  INTEGER REFERENCES state_crm_users(id),
      created_by   INTEGER REFERENCES state_crm_users(id),
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_calls (
      id                SERIAL PRIMARY KEY,
      state_id          INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      lead_id           INTEGER REFERENCES state_crm_leads(id) ON DELETE SET NULL,
      agent_id          INTEGER REFERENCES state_crm_users(id),
      caller            VARCHAR(255),
      start_time        TIMESTAMP,
      end_time          TIMESTAMP,
      duration_seconds  INTEGER,
      type              VARCHAR(50),
      status            VARCHAR(50),
      feedback          TEXT,
      notes             TEXT,
      outcome           VARCHAR(255),
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_projects (
      id                SERIAL PRIMARY KEY,
      state_id          INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      name              VARCHAR(255) NOT NULL,
      description       TEXT,
      status            VARCHAR(50) DEFAULT 'ACTIVE',
      default_owner_id  INTEGER REFERENCES state_crm_users(id),
      created_by        INTEGER REFERENCES state_crm_users(id),
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_notes (
      id          SERIAL PRIMARY KEY,
      state_id    INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      lead_id     INTEGER REFERENCES state_crm_leads(id) ON DELETE SET NULL,
      content     TEXT NOT NULL,
      type        VARCHAR(50) DEFAULT 'FOLLOW_UP',
      user_id     INTEGER REFERENCES state_crm_users(id),
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE state_crm_leads ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES state_crm_projects(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE state_crm_tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES state_crm_projects(id) ON DELETE SET NULL`);

  await pool.query(`ALTER TABLE state_crm_leads ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES state_crm_projects(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE state_crm_tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES state_crm_projects(id) ON DELETE SET NULL`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_attendance (
      id          SERIAL PRIMARY KEY,
      state_id    INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES state_crm_users(id),
      user_name   VARCHAR(255),
      check_in    TIMESTAMP,
      check_out   TIMESTAMP,
      lat         NUMERIC,
      lng         NUMERIC,
      date        DATE DEFAULT CURRENT_DATE,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_attendance (
      id          SERIAL PRIMARY KEY,
      state_id    INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES state_crm_users(id),
      user_name   VARCHAR(255),
      check_in    TIMESTAMP,
      check_out   TIMESTAMP,
      lat         NUMERIC,
      lng         NUMERIC,
      date        DATE DEFAULT CURRENT_DATE,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS state_id INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES state_crm_users(id)`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS check_in TIMESTAMP`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS check_out TIMESTAMP`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS lat NUMERIC`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS lng NUMERIC`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE`);
  await pool.query(`ALTER TABLE state_crm_attendance DROP CONSTRAINT IF EXISTS state_crm_attendance_user_id_fkey`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD CONSTRAINT state_crm_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES state_crm_users(id)`);
  // ── Attendance: selfie photo + status/late tracking ───────────────────────
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS photo TEXT`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'present'`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS marked_by_hr BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE state_crm_attendance ADD COLUMN IF NOT EXISTS hr_note TEXT`);

  // ── Attendance settings: per-state cutoff configuration ────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_attendance_settings (
      id                SERIAL PRIMARY KEY,
      state_id          INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE UNIQUE,
      full_day_start    VARCHAR(5) DEFAULT '09:30',
      full_day_end      VARCHAR(5) DEFAULT '09:40',
      working_days      INTEGER DEFAULT 26,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Salary: monthly rate per user + daily credit ledger ────────────────────
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_daily_salary_credits (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      attendance_id       INTEGER REFERENCES state_crm_attendance(id) ON DELETE SET NULL,
      date                DATE NOT NULL,
      hours_worked        NUMERIC,
      amount_credited     NUMERIC,
      monthly_salary_used NUMERIC,
      working_days_used   INTEGER,
      per_day_rate_used   NUMERIC,
      credited_at         TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_salary_credit_unique UNIQUE (user_id, date)
    )
  `);

  // ── Leave management ─────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_leave_requests (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      state_id      INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      leave_type    VARCHAR(30) DEFAULT 'casual',
      date          DATE NOT NULL,
      reason        TEXT,
      status        VARCHAR(20) DEFAULT 'pending',
      approved_by   INTEGER REFERENCES state_crm_users(id),
      approved_at   TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);


  // ── User profile fields (from WorkSprint schema) ──────────────────────────
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS position VARCHAR(100)`);
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS profile_pic TEXT`);
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS notification_preferences JSONB`);
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`);

  // ── Attendance settings: grace period + geofence (from WorkSprint) ────────
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS office_start VARCHAR(5) DEFAULT '09:00'`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS office_end VARCHAR(5) DEFAULT '18:00'`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS grace_time INTEGER DEFAULT 15`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS work_hours NUMERIC DEFAULT 8`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS late_threshold VARCHAR(5) DEFAULT '09:15'`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS location_lat NUMERIC`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS location_lng NUMERIC`);
  await pool.query(`ALTER TABLE state_crm_attendance_settings ADD COLUMN IF NOT EXISTS location_radius INTEGER`);

  // ── Late requests (separate flow from leave requests) ──────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_late_requests (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      state_id      INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      date          DATE NOT NULL,
      reason        TEXT,
      check_in_time VARCHAR(5),
      status        VARCHAR(20) DEFAULT 'pending',
      approved_by   INTEGER REFERENCES state_crm_users(id),
      approved_at   TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Holiday calendar (per state) ────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_holidays (
      id         SERIAL PRIMARY KEY,
      state_id   INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      name       VARCHAR(255) NOT NULL,
      date       DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Employee-facing notifications ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_notifications (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      title      VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      type       VARCHAR(50) DEFAULT 'info',
      category   VARCHAR(100),
      link_path  TEXT,
      is_read    BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── HR/admin-facing notifications (per state) ───────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_hr_notifications (
      id         SERIAL PRIMARY KEY,
      state_id   INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      title      VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      type       VARCHAR(50) DEFAULT 'info',
      category   VARCHAR(100),
      link_path  TEXT,
      is_read    BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Employee → HR support queries ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_employee_queries (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      subject       VARCHAR(255) NOT NULL,
      message       TEXT NOT NULL,
      status        VARCHAR(20) DEFAULT 'open',
      hr_response   TEXT,
      responded_by  INTEGER REFERENCES state_crm_users(id),
      responded_at  TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── HR → Master Admin escalation queries (per state) ────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_admin_queries (
      id                SERIAL PRIMARY KEY,
      state_id          INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      hr_admin_id       INTEGER NOT NULL REFERENCES state_crm_users(id),
      sender_role       VARCHAR(50),
      subject           VARCHAR(255) NOT NULL,
      message           TEXT NOT NULL,
      status            VARCHAR(20) DEFAULT 'open',
      response          TEXT,
      responded_by_role VARCHAR(50),
      responded_by_id   INTEGER,
      responded_at      TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_state_crm_admin_queries_state ON state_crm_admin_queries(state_id, created_at)`);
  await pool.query(`ALTER TABLE state_crm_calls ADD COLUMN IF NOT EXISTS recording_url TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_custom_fields (
      id            SERIAL PRIMARY KEY,
      state_id      INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      field_name    VARCHAR(255) NOT NULL,
      field_type    VARCHAR(50) DEFAULT 'text',
      field_options TEXT,
      is_required   BOOLEAN DEFAULT false,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_campaigns (
      id           SERIAL PRIMARY KEY,
      state_id     INTEGER REFERENCES state_crm_states(id) ON DELETE CASCADE,
      name         VARCHAR(255) NOT NULL,
      type         VARCHAR(50) DEFAULT 'COLD_CALLING',
      phone_number VARCHAR(50),
      status       VARCHAR(20) DEFAULT 'ACTIVE',
      created_by   INTEGER REFERENCES state_crm_users(id),
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE state_crm_leads ADD COLUMN IF NOT EXISTS next_followup TIMESTAMP`);


  // ── Districts: seed 28 states + 8 UTs with official district counts ────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_districts (
      id         SERIAL PRIMARY KEY,
      state_id   INTEGER NOT NULL REFERENCES state_crm_states(id) ON DELETE CASCADE,
      name       VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_district_unique UNIQUE (state_id, name)
    )
  `);
  await pool.query(`ALTER TABLE state_crm_users ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES state_crm_districts(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE state_crm_leads ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES state_crm_districts(id) ON DELETE SET NULL`);

  const STATE_DISTRICT_COUNTS: [string, number][] = [
    ['Andhra Pradesh', 26], ['Arunachal Pradesh', 28], ['Assam', 35], ['Bihar', 38],
    ['Chhattisgarh', 33], ['Goa', 2], ['Gujarat', 33], ['Haryana', 22],
    ['Himachal Pradesh', 13], ['Jharkhand', 24], ['Karnataka', 31], ['Kerala', 14],
    ['Madhya Pradesh', 57], ['Maharashtra', 36], ['Manipur', 16], ['Meghalaya', 12],
    ['Mizoram', 11], ['Nagaland', 17], ['Odisha', 30], ['Punjab', 23],
    ['Rajasthan', 55], ['Sikkim', 6], ['Tamil Nadu', 38], ['Telangana', 33],
    ['Tripura', 8], ['Uttar Pradesh', 75], ['Uttarakhand', 17], ['West Bengal', 30],
    ['Andaman and Nicobar Islands', 3], ['Chandigarh', 1],
    ['Dadra and Nagar Haveli and Daman and Diu', 3], ['Delhi', 11],
    ['Jammu and Kashmir', 20], ['Ladakh', 2], ['Lakshadweep', 1], ['Puducherry', 4],
  ];

  const { rows: districtCountRows } = await pool.query(`SELECT COUNT(*) FROM state_crm_districts`);
  if (parseInt(districtCountRows[0].count, 10) === 0) {
    for (const [stateName, districtCount] of STATE_DISTRICT_COUNTS) {
      await pool.query(`INSERT INTO state_crm_states (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [stateName]);
      const stateRow = await pool.query(`SELECT id FROM state_crm_states WHERE name = $1`, [stateName]);
      const stateId = stateRow.rows[0]?.id;
      if (!stateId) continue;
      for (let i = 1; i <= (districtCount as number); i++) {
        await pool.query(
          `INSERT INTO state_crm_districts (state_id, name) VALUES ($1, $2) ON CONFLICT (state_id, name) DO NOTHING`,
          [stateId, `District ${i}`]
        );
      }
    }
    console.log('✅ State/UT + district master data seeded');
  } else {
    console.log('✅ State/UT + district data already present, skipping seed');
  }

  // ── Granular role permissions ──────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_role_permissions (
      id              SERIAL PRIMARY KEY,
      role            VARCHAR(50) NOT NULL,
      permission_key  VARCHAR(100) NOT NULL,
      allowed         BOOLEAN NOT NULL DEFAULT true,
      created_at      TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_role_perm_unique UNIQUE (role, permission_key)
    )
  `);

  const { rows: permCountRows } = await pool.query(`SELECT COUNT(*) FROM state_crm_role_permissions`);
  if (parseInt(permCountRows[0].count, 10) === 0) {
    const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
      admin: ['view_leads','create_leads','edit_leads','delete_leads','view_contacts','manage_contacts','view_tasks','manage_tasks','view_reminders','manage_reminders','view_attendance','manage_attendance','view_reports','view_campaigns','manage_campaigns','view_calls','manage_calls','view_custom_fields','manage_custom_fields','view_whatsapp','send_whatsapp','manage_users','manage_roles','manage_settings'],
      hr: ['view_leads','view_reports','manage_users','view_attendance','manage_attendance','view_tasks','manage_tasks'],
      coordinator: ['view_leads','create_leads','edit_leads','view_reports','view_contacts','manage_contacts','view_tasks','manage_tasks','view_reminders','manage_reminders','view_campaigns','view_attendance','view_calls','view_custom_fields'],
      state_head: ['view_leads','create_leads','edit_leads','delete_leads','view_reports','view_contacts','manage_contacts','view_tasks','manage_tasks','view_reminders','manage_reminders','view_campaigns','manage_campaigns','view_attendance','manage_attendance','view_calls','manage_calls','view_custom_fields','manage_custom_fields'],
      sales_manager: ['view_leads','create_leads','edit_leads','view_reports','view_contacts','manage_contacts','view_tasks','manage_tasks','view_reminders','manage_reminders','view_campaigns','view_calls','view_custom_fields'],
      sales_admin: ['view_leads','create_leads','edit_leads','view_contacts','manage_contacts','view_tasks','manage_tasks','view_reminders','manage_reminders','manage_settings','view_calls'],
      team_member: ['view_leads','create_leads','view_contacts','view_tasks','view_reminders','view_calls'],
    };
    for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const key of keys) {
        await pool.query(
          `INSERT INTO state_crm_role_permissions (role, permission_key, allowed) VALUES ($1, $2, true) ON CONFLICT (role, permission_key) DO NOTHING`,
          [role, key]
        );
      }
    }
    console.log('✅ Default role permissions seeded');
  }

  // ── WhatsApp: one number per State Head ────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_whatsapp_numbers (
      id                 SERIAL PRIMARY KEY,
      label              VARCHAR(255) NOT NULL,
      phone_number       VARCHAR(50) NOT NULL,
      phone_number_id    VARCHAR(100) NOT NULL UNIQUE,
      waba_id            VARCHAR(100) NOT NULL,
      access_token       TEXT NOT NULL,
      state_head_user_id INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      status             VARCHAR(20) DEFAULT 'active',
      created_by         INTEGER REFERENCES state_crm_users(id),
      created_at         TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_whatsapp_messages (
      id               SERIAL PRIMARY KEY,
      phone_number_id  VARCHAR(100) NOT NULL,
      message_id       VARCHAR(255) UNIQUE,
      from_number      VARCHAR(50) NOT NULL,
      to_number        VARCHAR(50) NOT NULL,
      contact_name     VARCHAR(255),
      message_text     TEXT,
      media_type       VARCHAR(20),
      direction        VARCHAR(10) NOT NULL,
      status           VARCHAR(20) DEFAULT 'sent',
      is_read          BOOLEAN DEFAULT false,
      timestamp        TIMESTAMP DEFAULT NOW(),
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `);
  // Table may have pre-existed with a different/incomplete schema — backfill any missing columns
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS label VARCHAR(255)`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50)`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS phone_number_id VARCHAR(100)`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS waba_id VARCHAR(100)`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS access_token TEXT`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS state_head_user_id INTEGER REFERENCES state_crm_users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES state_crm_users(id)`);
  await pool.query(`ALTER TABLE state_crm_whatsapp_numbers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'state_crm_wa_numbers_phone_id_unique') THEN
        ALTER TABLE state_crm_whatsapp_numbers ADD CONSTRAINT state_crm_wa_numbers_phone_id_unique UNIQUE (phone_number_id);
      END IF;
    END $$;
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_state_wa_msg_phone ON state_crm_whatsapp_messages(phone_number_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_state_wa_msg_contact ON state_crm_whatsapp_messages(from_number, to_number)`);

  // ── Geographic hierarchy: Districts (existing) -> Taluks (new) + assignments ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_taluks (
      id          SERIAL PRIMARY KEY,
      district_id INTEGER NOT NULL REFERENCES state_crm_districts(id) ON DELETE CASCADE,
      name        VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_taluk_unique UNIQUE (district_id, name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_state_head_districts (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      district_id INTEGER NOT NULL REFERENCES state_crm_districts(id) ON DELETE CASCADE,
      created_at  TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_sh_district_unique UNIQUE (user_id, district_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state_crm_user_taluks (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES state_crm_users(id) ON DELETE CASCADE,
      taluk_id   INTEGER NOT NULL REFERENCES state_crm_taluks(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT state_crm_user_taluk_unique UNIQUE (user_id, taluk_id)
    )
  `);

  console.log('✅ State CRM tables initialized');

  console.log('✅ DB initialized successfully');
};

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

export const connect = () => pool.connect();

export default { query, connect };
