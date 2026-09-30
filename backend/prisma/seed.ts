import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma.js';

async function main() {
  console.log('[Prisma Seed] Starting database seeding...');

  const SEED_ADMIN_EMAIL = 'md@company.com';
  const SEED_ADMIN_PASSWORD = 'md@1230';

  // Seed default Managing Director (the internal permission role remains super_admin)
  let existingAdmin = await prisma.user.findFirst({
    where: { email: { equals: SEED_ADMIN_EMAIL, mode: 'insensitive' } },
  });

  if (!existingAdmin) {
    existingAdmin = await prisma.user.findFirst({
      where: { email: { equals: 'admin@company.com', mode: 'insensitive' } },
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, salt);

  if (!existingAdmin) {

    await prisma.user.create({
      data: {
        id: 'usr-admin',
        email: SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        fullName: 'Managing Director',
        role: 'super_admin',
        department: 'Executive',
        managerId: null,
        managerName: null,
        isActive: true,
      },
    });
    console.log('[Prisma Seed] Default Super Admin created.');
  } else {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: SEED_ADMIN_EMAIL,
        passwordHash,
        fullName: 'Managing Director',
        isActive: true,
      },
    });
    console.log('[Prisma Seed] Existing Super Admin credentials reset.');
  }

  console.log('[Prisma Seed] Seeding completed.');
}

main()
  .catch((e) => {
    console.error('[Prisma Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
