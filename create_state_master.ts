import bcrypt from 'bcryptjs';
import db from './server/src/config/database';

// Edit these two lines before running:
const EMAIL = 'you@example.com';
const PASSWORD = 'YourChosenPassword123';

const run = async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const { rows } = await db.query(
    `INSERT INTO state_crm_users (email, password, name, role)
     VALUES ($1, $2, $3, 'master')
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
     RETURNING id, email, role`,
    [EMAIL, hash, 'Master Admin']
  );
  console.log('✅ Master user ready:', rows[0]);
  process.exit(0);
};

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
