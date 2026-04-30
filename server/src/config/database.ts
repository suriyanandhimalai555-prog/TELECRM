import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export const initDb = async () => {
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
  console.log('✅ DB initialized');
};

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

export default { query };
