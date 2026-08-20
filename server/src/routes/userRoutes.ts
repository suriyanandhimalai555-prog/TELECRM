import { Router } from 'express';
import db from '../config/database';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendWelcomeEmail(email: string, name: string, password: string, role: string) {
  console.log('[EMAIL] Attempting to send to:', email);
  console.log('[EMAIL] SMTP_EMAIL:', process.env.SMTP_EMAIL);
  console.log('[EMAIL] SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);
  console.log('[EMAIL] Attempting to send to:', email);
  console.log('[EMAIL] SMTP_EMAIL:', process.env.SMTP_EMAIL);
  console.log('[EMAIL] SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);
  console.log('[EMAIL] Attempting to send to:', email);
  console.log('[EMAIL] SMTP_EMAIL:', process.env.SMTP_EMAIL);
  console.log('[EMAIL] SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);
  try {
    await transporter.sendMail({
      from: `"AVG CRM" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Welcome to AVG CRM - Your Account Details',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px;">
          <h1 style="color:#2a85cc;text-align:center;">AVG CRM</h1>
          <h2>Welcome, ${name}! 👋</h2>
          <p>Your account has been created. Here are your login details:</p>
          <div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0;">
            <p><strong>🌐 Login URL:</strong> <a href="https://avgcrm.com">https://avgcrm.com</a></p>
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>🔑 Password:</strong> ${password}</p>
            <p><strong>👤 Role:</strong> ${role}</p>
          </div>
          <p style="color:#e74c3c;"><strong>⚠️ Please change your password after first login.</strong></p>
        </div>
      `,
    });
    console.log('✅ Welcome email sent to', email);
  } catch (err) {
    console.error('❌ Failed to send email:', err);
  }
}

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  let query: string; let params: any[] = [];
  if (req.user?.role === 'master_admin') {
    const cid = req.query.company_id;
    query = cid
      ? 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id WHERE u.company_id=$1 ORDER BY u.created_at DESC'
      : 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id ORDER BY u.created_at DESC';
    if (cid) params = [cid];
  } else {
    query = 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id WHERE u.company_id=$1 ORDER BY u.created_at DESC';
    params = [req.user?.company_id];
  }
  const r = await db.query(query, params);
  res.json(r.rows.map((u: any) => ({ ...u, password: undefined })));
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { email, password, name, role, company_id } = req.body;
  if (req.user?.role === 'company_admin') {
    if (['master_admin', 'company_admin'].includes(role))
      return res.status(403).json({ message: 'Cannot create admin roles' });
    if (parseInt(company_id) !== req.user.company_id)
      return res.status(403).json({ message: 'Can only add users to your own company' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = await db.query(
    'INSERT INTO users (email,password,name,role,company_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,company_id',
    [email, hash, name, role, company_id || req.user?.company_id]
  );
  await sendWelcomeEmail(email, name, password, role);
  res.json(r.rows[0]);
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const target = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ message: 'Not found' });
  if (req.user?.role !== 'master_admin' && target.rows[0].company_id !== req.user?.company_id)
    return res.status(403).json({ message: 'Forbidden' });
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/:id/update', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const target = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ message: 'Not found' });
  if (req.user?.role !== 'master_admin' && target.rows[0].company_id !== req.user?.company_id)
    return res.status(403).json({ message: 'Forbidden' });

  const { name, email, phone, role, company_id, password } = req.body;
  const updates: any[] = [];
  const values: any[] = [];
  let i = 1;
  if (name)       { updates.push(`name=$${i++}`);       values.push(name); }
  if (email)      { updates.push(`email=$${i++}`);      values.push(email); }
  if (phone)      { updates.push(`phone=$${i++}`);      values.push(phone); }
  if (role)       { updates.push(`role=$${i++}`);       values.push(role); }
  if (company_id) { updates.push(`company_id=$${i++}`); values.push(company_id); }
  if (password)   { const hash = bcrypt.hashSync(password, 10); updates.push(`password=$${i++}`); values.push(hash); }
  if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  values.push(req.params.id);
  await db.query(`UPDATE users SET ${updates.join(',')} WHERE id=$${i}`, values);
  const r = await db.query('SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id WHERE u.id=$1', [req.params.id]);
  res.json({ ...r.rows[0], password: undefined });
});

export default router;
