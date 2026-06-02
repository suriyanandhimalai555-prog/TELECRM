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
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
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
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
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

  console.log('✅ DB initialized successfully');
};

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

export const connect = () => pool.connect();

export default { query, connect };
