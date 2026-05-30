import { Router } from 'express';
import db from '../config/database';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// ─── Facebook Lead Ads Webhook ────────────────────────────────────────────────
router.get('/facebook/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    res.send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

router.post('/facebook/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const pageId = change.value.page_id;
            const formId = change.value.form_id;
            // Fetch lead data from Facebook
            const token = process.env.FB_PAGE_ACCESS_TOKEN;
            if (!token) continue;
            const fbRes = await fetch(
              `https://graph.facebook.com/v25.0/${leadgenId}?fields=field_data,created_time&access_token=${token}`
            );
            const fbData = await fbRes.json();
            if (fbData.error) {
              console.error('[FB] Lead fetch error:', fbData.error);
              continue;
            }
            // Parse field data
            const fields: Record<string, string> = {};
            for (const f of fbData.field_data || []) {
              fields[f.name] = f.values?.[0] || '';
            }
            const name = fields['full_name'] || fields['first_name'] + ' ' + fields['last_name'] || 'Facebook Lead';
            const mobile = fields['phone_number'] || fields['mobile'] || '';
            const email = fields['email'] || '';
            // Get admin user
            const { rows: adminRows } = await db.query(
              "SELECT id FROM users WHERE role IN ('ADMIN', 'company_admin') ORDER BY id LIMIT 1"
            );
            const adminId = adminRows[0]?.id;
            // Create lead
            await db.query(
              `INSERT INTO leads (contact_name, mobile, whatsapp, email, source, stage, owner_id, revenue, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'FACEBOOK', 'NEW', $5, 0, NOW(), NOW())
               ON CONFLICT DO NOTHING`,
              [name.trim(), mobile, mobile, email, adminId]
            );
            console.log(`[FB] ✅ Lead created: ${name} (${mobile})`);
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('[FB] Webhook error:', err);
    res.sendStatus(200);
  }
});

// ─── Website/Landing Page Webhook ────────────────────────────────────────────
router.post('/webhook/lead', async (req, res) => {
  try {
    const { name, mobile, email, source, message, company } = req.body;
    if (!name && !mobile) {
      return res.status(400).json({ error: 'name or mobile required' });
    }
    const { rows: adminRows } = await db.query(
      "SELECT id FROM users WHERE role IN ('ADMIN', 'company_admin') ORDER BY id LIMIT 1"
    );
    const adminId = adminRows[0]?.id;
    const { rows } = await db.query(
      `INSERT INTO leads (contact_name, mobile, whatsapp, email, source, stage, owner_id, company, revenue, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'NEW', $6, $7, 0, NOW(), NOW())
       RETURNING id, contact_name, mobile`,
      [name || 'Website Lead', mobile || '', mobile || '', email || '', source || 'WEBSITE', adminId, company || '']
    );
    console.log(`[WEBHOOK] ✅ Lead created: ${rows[0]?.contact_name} (${rows[0]?.mobile})`);
    res.json({ success: true, lead_id: rows[0]?.id });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// ─── Get webhook URL for this CRM ─────────────────────────────────────────────
router.get('/webhook/info', authenticate, requireAdmin, (req, res) => {
  const baseUrl = process.env.APP_URL || 'https://telecrm-copy-production.up.railway.app';
  res.json({
    webhook_url: `${baseUrl}/api/integrations/webhook/lead`,
    facebook_webhook: `${baseUrl}/api/integrations/facebook/webhook`,
    facebook_verify_token: process.env.FB_VERIFY_TOKEN || 'avgcrm_fb_2024',
    method: 'POST',
    fields: { name: 'string', mobile: 'string', email: 'string', source: 'string', company: 'string', message: 'string' },
  });
});

// ─── Workflow automation — auto assign leads ───────────────────────────────────
router.post('/workflow/auto-assign', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all unassigned leads
    const { rows: leads } = await db.query(
      "SELECT id FROM leads WHERE owner_id IS NULL OR owner_id = 0 ORDER BY created_at ASC"
    );
    // Get all active employees in round-robin
    const { rows: users } = await db.query(
      "SELECT id FROM users WHERE role IN ('EMPLOYEE', 'employee', 'MANAGER') ORDER BY id"
    );
    if (!users.length) return res.json({ message: 'No employees to assign to', assigned: 0 });
    let assigned = 0;
    for (let i = 0; i < leads.length; i++) {
      const userId = users[i % users.length].id;
      await db.query('UPDATE leads SET owner_id = $1 WHERE id = $2', [userId, leads[i].id]);
      assigned++;
    }
    res.json({ success: true, assigned });
  } catch (err) {
    console.error('[WORKFLOW] Error:', err);
    res.status(500).json({ error: 'Failed to auto-assign' });
  }
});

export default router;
