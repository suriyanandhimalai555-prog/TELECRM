import fs from 'fs';
import path from 'path';
import { prisma } from '../src/prisma.js';

export async function migrateJsonToPostgres() {
  const jsonPath = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('[Migrate JSON] No data/db.json found. Skipping migration.');
    return { success: true, message: 'No db.json found to migrate' };
  }

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const db = JSON.parse(raw);

    const users = db.users || [];
    const workUpdates = db.workUpdates || [];

    let migratedUsersCount = 0;
    let migratedWorksCount = 0;
    let migratedAttsCount = 0;
    let migratedEditsCount = 0;

    // 1. Migrate Users
    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { id: u.id } });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: u.id,
            email: u.email.toLowerCase().trim(),
            passwordHash: u.passwordHash,
            fullName: u.fullName,
            role: u.role,
            department: u.department,
            managerId: u.managerId || null,
            managerName: u.managerName || null,
            isActive: u.isActive !== undefined ? u.isActive : true,
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          },
        });
        migratedUsersCount++;
      }
    }

    // Fix manager relation links if any manager was inserted afterwards
    for (const u of users) {
      if (u.managerId) {
        const mgr = await prisma.user.findUnique({ where: { id: u.managerId } });
        if (mgr) {
          await prisma.user.update({
            where: { id: u.id },
            data: { managerName: mgr.fullName },
          });
        }
      }
    }

    // 2. Migrate Work Updates, Attachments, Edit Histories
    for (const w of workUpdates) {
      const existingWork = await prisma.workUpdate.findUnique({ where: { id: w.id } });
      if (!existingWork) {
        // Ensure user exists before adding work
        let userObj = await prisma.user.findUnique({ where: { id: w.userId } });
        if (!userObj) {
          userObj = await prisma.user.findFirst({ where: { email: w.userEmail.toLowerCase().trim() } });
        }

        const validUserId = userObj ? userObj.id : 'usr-admin';

        await prisma.workUpdate.create({
          data: {
            id: w.id,
            userId: validUserId,
            userName: w.userName,
            userRole: w.userRole,
            userEmail: w.userEmail,
            department: w.department,
            title: w.title,
            description: w.description,
            hoursSpent: Number(w.hoursSpent || 0),
            category: w.category,
            status: w.status || 'pending',
            reviewerId: w.reviewerId || null,
            reviewerName: w.reviewerName || null,
            reviewComment: w.reviewComment || null,
            reviewedAt: w.reviewedAt ? new Date(w.reviewedAt) : null,
            createdAt: w.createdAt ? new Date(w.createdAt) : new Date(),
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date(),
          },
        });
        migratedWorksCount++;

        // Migrate Attachments
        if (Array.isArray(w.attachments)) {
          for (const att of w.attachments) {
            const existingAtt = await prisma.workAttachment.findUnique({ where: { id: att.id } });
            if (!existingAtt) {
              await prisma.workAttachment.create({
                data: {
                  id: att.id,
                  workId: w.id,
                  fileName: att.fileName,
                  fileUrl: att.fileUrl,
                  fileSize: BigInt(att.fileSize || 0),
                  fileType: att.fileType,
                  uploadedAt: att.uploadedAt ? new Date(att.uploadedAt) : new Date(),
                },
              });
              migratedAttsCount++;
            }
          }
        }

        // Migrate Edit History
        if (Array.isArray(w.editHistory)) {
          for (const hist of w.editHistory) {
            const existingHist = await prisma.editHistory.findUnique({ where: { id: hist.id } });
            if (!existingHist) {
              let editorObj = await prisma.user.findUnique({ where: { id: hist.editedBy } });
              const validEditorId = editorObj ? editorObj.id : validUserId;

              await prisma.editHistory.create({
                data: {
                  id: hist.id,
                  workId: w.id,
                  editedBy: validEditorId,
                  editedByName: hist.editedByName || 'User',
                  changes: Array.isArray(hist.changes) ? hist.changes : [],
                  editedAt: hist.editedAt ? new Date(hist.editedAt) : new Date(),
                },
              });
              migratedEditsCount++;
            }
          }
        }
      }
    }

    const message = `Successfully migrated ${migratedUsersCount} users, ${migratedWorksCount} work updates, ${migratedAttsCount} attachments, and ${migratedEditsCount} edit histories to Prisma PostgreSQL.`;
    console.log(`[Migrate JSON] ${message}`);
    return { success: true, message, stats: { users: migratedUsersCount, works: migratedWorksCount, atts: migratedAttsCount, edits: migratedEditsCount } };
  } catch (err: any) {
    console.error('[Migrate JSON Error]:', err);
    return { success: false, error: err?.message || 'Migration failed' };
  }
}

// Allow direct execution via CLI
if (process.argv[1]?.endsWith('migrate-json.ts') || process.argv[1]?.endsWith('migrate-json.js')) {
  migrateJsonToPostgres()
    .then((res) => {
      console.log('Migration Result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
