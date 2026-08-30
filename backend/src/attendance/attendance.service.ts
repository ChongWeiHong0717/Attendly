import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearsService } from '../academic-years/academic-years.service';

function asDbDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw new BadRequestException('Date must use YYYY-MM-DD format');
  }
  return new Date(`${date}T00:00:00.000Z`);
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private years: AcademicYearsService) {}

  async snapshot(classRoomId: string, date: string) {
    const year = await this.years.current();
    const students = await this.prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        enrollments: { some: { academicYearId: year.id, classRoomId } },
      },
      select: { id: true, studentCode: true, fullName: true },
      orderBy: [{ fullName: 'asc' }, { studentCode: 'asc' }],
    });
    const dbDate = asDbDate(date);
    const [session, nfcCheckIns] = await Promise.all([
      this.prisma.attendanceSession.findUnique({
        where: { academicYearId_classRoomId_date: { academicYearId: year.id, classRoomId, date: dbDate } },
        include: { absences: true },
      }),
      this.prisma.nfcCheckIn.findMany({
        where: {
          date: dbDate,
          studentId: { in: students.map((student) => student.id) },
        },
        select: { studentId: true },
      }),
    ]);

    const absentIds = new Set(session?.absences.map((a) => a.studentId) ?? []);
    const nfcPresentIds = new Set(nfcCheckIns.map((row) => row.studentId));

    return {
      academicYear: year,
      date,
      completed: !!session,
      completedAt: session?.completedAt ?? null,
      presentCount: session
        ? students.length - absentIds.size
        : nfcPresentIds.size,
      absentCount: session ? absentIds.size : null,
      nfcPresentCount: nfcPresentIds.size,
      students: students.map((student) => ({
        ...student,
        nfcCheckedIn: nfcPresentIds.has(student.id),
        status: session
          ? (absentIds.has(student.id) ? 'ABSENT' : 'PRESENT')
          : (nfcPresentIds.has(student.id) ? 'PRESENT' : 'UNMARKED'),
      })),
    };
  }

  async save(classRoomId: string, teacherId: string, date: string, statuses: { studentId: string; status: 'PRESENT' | 'ABSENT' }[]) {
    const year = await this.years.current();
    const enrolled = await this.prisma.student.findMany({
      where: { status: 'ACTIVE', enrollments: { some: { academicYearId: year.id, classRoomId } } },
      select: { id: true },
    });
    const enrolledIds = new Set(enrolled.map((s) => s.id));
    const suppliedIds = new Set(statuses.map((s) => s.studentId));
    if (statuses.length !== enrolledIds.size || suppliedIds.size !== enrolledIds.size || [...suppliedIds].some((id) => !enrolledIds.has(id))) {
      throw new BadRequestException('Every currently enrolled student must be marked Present or Absent before saving');
    }
    const absentIds = statuses.filter((s) => s.status === 'ABSENT').map((s) => s.studentId);
    const dbDate = asDbDate(date);
    const session = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.attendanceSession.upsert({
        where: { academicYearId_classRoomId_date: { academicYearId: year.id, classRoomId, date: dbDate } },
        update: { teacherId, completedAt: new Date() },
        create: { academicYearId: year.id, classRoomId, teacherId, date: dbDate },
      });
      await tx.absence.deleteMany({ where: { sessionId: saved.id } });
      if (absentIds.length) {
        await tx.absence.createMany({ data: absentIds.map((studentId) => ({ sessionId: saved.id, studentId })) });
      }
      return saved;
    });
    return { session, absentCount: absentIds.length, presentCount: enrolledIds.size - absentIds.length };
  }
}
