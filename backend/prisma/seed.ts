import { PrismaClient, UserRole, AcademicYearStatus, StudentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createStudent(fullName: string, icNumber: string | null, classRoomId: string, academicYearId: string) {
  const seq = await prisma.studentSequence.update({
    where: { id: 1 },
    data: { lastAssigned: { increment: 1 } },
  });
  const studentCode = `ST${String(seq.lastAssigned).padStart(6, '0')}`;
  const student = await prisma.student.create({
    data: { studentCode, fullName, icNumber, status: StudentStatus.ACTIVE },
  });
  await prisma.studentEnrollment.create({
    data: { studentId: student.id, classRoomId, academicYearId },
  });
  return student;
}

async function main() {
  await prisma.studentSequence.upsert({ where: { id: 1 }, update: {}, create: { id: 1, lastAssigned: 0 } });

  const year = await prisma.academicYear.upsert({
    where: { name: '2026' },
    update: { status: AcademicYearStatus.ACTIVE },
    create: { name: '2026', status: AcademicYearStatus.ACTIVE },
  });
  await prisma.academicYear.updateMany({ where: { id: { not: year.id } }, data: { status: AcademicYearStatus.CLOSED } });

  const classData = [
    [1, 'Aranda'], [1, 'Bestari'], [1, 'Cempaka'],
    [2, 'Aranda'], [2, 'Bestari'],
    [3, 'Aranda'], [3, 'Bestari'],
    [4, 'Aranda'], [4, 'Bestari'],
    [5, 'Aranda'], [5, 'Bestari'],
  ] as const;

  const classes = new Map<string, string>();
  for (const [formLevel, name] of classData) {
    const cls = await prisma.classRoom.upsert({
      where: { formLevel_name: { formLevel, name } },
      update: { isActive: true },
      create: { formLevel, name },
    });
    classes.set(`${formLevel}-${name}`, cls.id);
  }

  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.local' },
    update: { passwordHash: adminPassword, role: UserRole.ADMIN, isActive: true },
    create: { name: 'School Admin', email: 'admin@school.local', passwordHash: adminPassword, role: UserRole.ADMIN },
  });
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.local' },
    update: { passwordHash: teacherPassword, role: UserRole.TEACHER, isActive: true },
    create: { name: 'Ms Lim', email: 'teacher@school.local', passwordHash: teacherPassword, role: UserRole.TEACHER },
  });

  const assigned = [classes.get('1-Aranda')!, classes.get('2-Bestari')!];
  for (const classRoomId of assigned) {
    await prisma.teacherClassAssignment.upsert({
      where: { teacherId_academicYearId_classRoomId: { teacherId: teacher.id, academicYearId: year.id, classRoomId } },
      update: {},
      create: { teacherId: teacher.id, academicYearId: year.id, classRoomId },
    });
  }

  const existingStudents = await prisma.student.count();
  if (existingStudents === 0) {
    const aranda = classes.get('1-Aranda')!;
    await createStudent('Ali Ahmad', '120101101234', aranda, year.id);
    await createStudent('Siti Aisyah', '120203105678', aranda, year.id);
    await createStudent('John Tan', '120304109876', aranda, year.id);
    await createStudent('Nur Iman', null, aranda, year.id);
  }

  console.log('Seed complete.');
  console.log('Admin: admin@school.local / admin123');
  console.log('Teacher: teacher@school.local / teacher123');
  void admin;
}

main().finally(() => prisma.$disconnect());
