import { AcademicYearStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.studentSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastAssigned: 0 },
  });

  const yearName = (process.env.BOOTSTRAP_ACADEMIC_YEAR || String(new Date().getFullYear())).trim();
  const existingActive = await prisma.academicYear.findFirst({ where: { status: AcademicYearStatus.ACTIVE } });
  if (!existingActive) {
    await prisma.academicYear.upsert({
      where: { name: yearName },
      update: { status: AcademicYearStatus.ACTIVE },
      create: { name: yearName, status: AcademicYearStatus.ACTIVE },
    });
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'School Admin';

  if (!email || !password) {
    console.log('Bootstrap: database essentials ready. No admin credentials supplied; skipping admin creation.');
    return;
  }

  if (password.length < 10) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name, role: UserRole.ADMIN, isActive: true },
    create: { name, email, passwordHash, role: UserRole.ADMIN, isActive: true },
  });
  console.log(`Bootstrap: admin account ensured for ${email}. Existing password is not overwritten.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
