import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function normalizeDatabaseUrl(rawUrl?: string) {
  if (!rawUrl) return rawUrl;
  const prefixMatch = rawUrl.match(/^(postgres(?:ql)?:\/\/)/);
  if (!prefixMatch) return rawUrl;

  const prefix = prefixMatch[1];
  const remainder = rawUrl.slice(prefix.length);
  const lastAt = remainder.lastIndexOf('@');

  if (lastAt <= 0) return rawUrl;

  const authPart = remainder.slice(0, lastAt);
  const hostPart = remainder.slice(lastAt + 1);

  if (!authPart.includes(':')) return rawUrl;
  const [user, pass] = authPart.split(/:(.+)/);

  if (pass.includes('@') && !pass.includes('%40')) {
    return `${prefix}${user}:${encodeURIComponent(pass)}@${hostPart}`;
  }

  return rawUrl;
}

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
let sqliteDb: any = null;
let isInitializing = false;

async function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (sqliteDb) return sqliteDb;
    }
  }

  isInitializing = true;
  try {
    const Database = (await import('better-sqlite3')).default;
    const isVercel = process.env.VERCEL === '1';
    const dbPath = isVercel ? '/tmp/database.sqlite' : 'database.sqlite';
    console.log(`Using SQLite fallback at ${dbPath}`);
    sqliteDb = new Database(dbPath);
    return sqliteDb;
  } catch (err) {
    console.error('Failed to load better-sqlite3:', err);
    throw new Error('Database connection failed: SQLite fallback is not available in this environment and no DATABASE_URL was provided.');
  } finally {
    isInitializing = false;
  }
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    throw new Error('PostgreSQL pool has not been initialized because DATABASE_URL is missing.');
  }
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('DB Query Error:', text, err);
    throw err;
  }
};

// Wrapper to handle queries safely across both PG and SQLite
const db = {
  query: async (text: string, params: any[] = []) => {
    if (connectionString && pool) {
      try {
        return await pool.query(text, params);
      } catch (err: any) {
        console.error('PostgreSQL Query Error:', err);
        // If it's a connection error, try to provide a more helpful message
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          throw new Error('Could not connect to PostgreSQL. Please check your DATABASE_URL and ensure the database is accessible.');
        }
        throw new Error(`Database query failed: ${err.message}`);
      }
    } else {
      const sdb = await getSqliteDb();
      try {
        // Convert PG style $1, $2 to SQLite style ?, ?
        const sqliteQuery = text.replace(/\$(\d+)/g, '?');
        const upperText = text.trim().toUpperCase();
        
        if (upperText.startsWith('SELECT') || upperText.startsWith('PRAGMA')) {
          const rows = sdb.prepare(sqliteQuery).all(...params);
          return { rows };
        } else {
          const result = sdb.prepare(sqliteQuery).run(...params);
          return { 
            rows: result.lastInsertRowid ? [{ id: result.lastInsertRowid }] : [],
            rowCount: result.changes 
          };
        }
      } catch (err: any) {
        console.error('SQLite Query Error:', err);
        throw new Error(`SQLite query failed: ${err.message}`);
      }
    }
  },
  connect: async () => {
    if (connectionString && pool) {
      try {
        return await pool.connect();
      } catch (err: any) {
        console.error('PostgreSQL Connection Error:', err);
        throw new Error(`Failed to connect to PostgreSQL: ${err.message}`);
      }
    } else {
      const sdb = await getSqliteDb();
      // Mock client for SQLite to support transactions if needed
      return {
        query: (text: string, params: any[] = []) => db.query(text, params),
        release: () => {},
      };
    }
  }
};

export async function initDb() {
  // Only initialize if we haven't already
  // For SQLite, we might need to create tables on every "cold start" in Vercel
  const client = await db.connect();
  try {
    if (connectionString) {
      await (client as any).query('BEGIN');
    }

    // Users table
    const usersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        reporting_to INTEGER,
        client_key TEXT,
        gemini_key TEXT,
        front_key TEXT,
        backend_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(usersTable);

    // Campaigns table
    const campaignsTable = `
      CREATE TABLE IF NOT EXISTS campaigns (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        phone_number TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(campaignsTable);

    // Projects table
    const projectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(projectsTable);

    // Leads table
    const leadsTable = `
      CREATE TABLE IF NOT EXISTS leads (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        owner_id INTEGER NOT NULL,
        project_id INTEGER,
        contact_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        whatsapp TEXT,
        email TEXT,
        source TEXT NOT NULL,
        stage TEXT NOT NULL,
        revenue REAL DEFAULT 0,
        next_followup TIMESTAMP,
        company TEXT,
        tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(leadsTable);

    // Calls table
    const callsTable = `
      CREATE TABLE IF NOT EXISTS calls (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        agent_id INTEGER NOT NULL,
        lead_id INTEGER,
        caller TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_seconds INTEGER NOT NULL,
        type TEXT NOT NULL,
        campaign_id INTEGER,
        status TEXT NOT NULL,
        feedback TEXT,
        notes TEXT,
        outcome TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(callsTable);

    // Tasks table
    const tasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        lead_id INTEGER NOT NULL,
        project_id INTEGER,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN',
        due_date TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(tasksTable);

    // Notes table
    const notesTable = `
      CREATE TABLE IF NOT EXISTS notes (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        lead_id INTEGER,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(notesTable);

    // Audit Logs table
    const auditLogsTable = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(auditLogsTable);

    // WhatsApp messages table
    const whatsappMessagesTable = `
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        message_id TEXT UNIQUE,
        from_number TEXT,
        to_number TEXT,
        message_text TEXT,
        direction TEXT,
        status TEXT,
        contact_name TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(whatsappMessagesTable);

    // WhatsApp templates table
    const whatsappTemplatesTable = `
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id ${connectionString ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        language TEXT,
        components TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(whatsappTemplatesTable);

    // User Projects table (Many-to-Many)
    const userProjectsTable = `
      CREATE TABLE IF NOT EXISTS user_projects (
        user_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, project_id)
      )
    `;
    await client.query(userProjectsTable);

    // Indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls(lead_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_reporting ON users(reporting_to)'
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }

    if (connectionString) {
      await (client as any).query('COMMIT');
    }

    // Ensure columns exist for existing databases (Migration)
    try {
      if (connectionString) {
        await db.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id INTEGER');
        await db.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT');
        await db.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT');
        await db.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER');
      } else {
        // SQLite doesn't support ADD COLUMN IF NOT EXISTS
        const leadsInfo = await db.query("PRAGMA table_info(leads)");
        if (!leadsInfo.rows.some((col: any) => col.name === 'project_id')) {
          await db.query('ALTER TABLE leads ADD COLUMN project_id INTEGER');
        }
        if (!leadsInfo.rows.some((col: any) => col.name === 'company')) {
          await db.query('ALTER TABLE leads ADD COLUMN company TEXT');
        }
        if (!leadsInfo.rows.some((col: any) => col.name === 'tags')) {
          await db.query('ALTER TABLE leads ADD COLUMN tags TEXT');
        }
        const tasksInfo = await db.query("PRAGMA table_info(tasks)");
        if (!tasksInfo.rows.some((col: any) => col.name === 'project_id')) {
          await db.query('ALTER TABLE tasks ADD COLUMN project_id INTEGER');
        }
      }
    } catch (err) {
      console.log('Migration note: Columns might already exist or table is being created for the first time.');
    }

    console.log(`${connectionString ? 'PostgreSQL' : 'SQLite'} Database initialized`);
  } catch (e) {
    if (connectionString) {
      await (client as any).query('ROLLBACK');
    }
    console.error('Error initializing database:', e);
    throw e;
  } finally {
    if (connectionString) {
      (client as any).release();
    }
  }
}

export default db;
