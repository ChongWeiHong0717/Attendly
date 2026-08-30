import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearsService } from '../academic-years/academic-years.service';

function normalizeIc(value?: string) {
  if (!value) return null;
  const normalized = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return normalized || null;
}
function maskIc(value: string | null) {
  if (!value) return null;
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private years: AcademicYearsService) {}

  async list(params: { classRoomId?: string; search?: string; includeArchived?: boolean }) {
    const year = await this.years.current();
    const students = await this.prisma.student.findMany({
      where: {
        ...(params.includeArchived ? {} : { status: { not: StudentStatus.ARCHIVED } }),
        ...(params.search ? { OR: [
          { fullName: { contains: params.search } },
          { studentCode: { contains: params.search } },
        ] } : {}),
        ...(params.classRoomId ? { enrollments: { some: { academicYearId: year.id, classRoomId: params.classRoomId } } } : {}),
      },
      include: {
        enrollments: { where: { academicYearId: year.id }, include: { classRoom: true } },
        nfcCard: true,
      },
      orderBy: [{ fullName: 'asc' }, { studentCode: 'asc' }],
    });
    return students.map((s) => ({
      id: s.id, studentCode: s.studentCode, fullName: s.fullName, icMasked: maskIc(s.icNumber), status: s.status,
      classRoom: s.enrollments[0]?.classRoom ?? null,
      nfcUid: s.nfcCard?.uid ?? null,
    }));
  }

  async createInClass(classRoomId: string, fullName: string, studentCodeInput?: string, icInput?: string) {
    const year = await this.years.current();
    const cls = await this.prisma.classRoom.findFirst({ where: { id: classRoomId, isActive: true } });
    if (!cls) throw new NotFoundException('Class not found');

    const requestedCode = studentCodeInput?.trim() || null;
    if (requestedCode) {
      const duplicateCode = await this.prisma.student.findUnique({ where: { studentCode: requestedCode } });
      if (duplicateCode) throw new ConflictException(`Student ID ${requestedCode} is already in use`);
    }

    const icNumber = normalizeIc(icInput);
    if (icNumber) {
      const duplicate = await this.prisma.student.findUnique({ where: { icNumber } });
      if (duplicate) throw new ConflictException(`This IC/MyKid is already linked to ${duplicate.studentCode}`);
    }
    const cleanName = fullName.trim();
    if (!cleanName) throw new BadRequestException('Student name is required');

    return this.prisma.$transaction(async (tx) => {
      let studentCode = requestedCode;
      if (!studentCode) {
        // Manual IDs may use the same STxxxxxx shape as generated IDs. Keep
        // advancing the sequence until an unused generated ID is found.
        while (!studentCode) {
          const seq = await tx.studentSequence.upsert({
            where: { id: 1 },
            update: { lastAssigned: { increment: 1 } },
            create: { id: 1, lastAssigned: 1 },
          });
          const candidate = `ST${String(seq.lastAssigned).padStart(6, '0')}`;
          const existing = await tx.student.findUnique({ where: { studentCode: candidate } });
          if (!existing) studentCode = candidate;
        }
      }

      const student = await tx.student.create({ data: { studentCode, fullName: cleanName, icNumber } });
      await tx.studentEnrollment.create({ data: { studentId: student.id, academicYearId: year.id, classRoomId } });
      return { id: student.id, studentCode, fullName: student.fullName, icMasked: maskIc(student.icNumber), status: student.status, classRoom: cls };
    });
  }

  async enrollExisting(studentId: string, classRoomId: string) {
    const year = await this.years.current();
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.status !== StudentStatus.ACTIVE) throw new NotFoundException('Active student not found');
    const cls = await this.prisma.classRoom.findFirst({ where: { id: classRoomId, isActive: true } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId, academicYearId: year.id } },
      update: { classRoomId },
      create: { studentId, academicYearId: year.id, classRoomId },
    });
  }

  async archive(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    // Soft-delete only: keep the enrollment and history so Undo/restore is lossless.
    return this.prisma.student.update({ where: { id: studentId }, data: { status: StudentStatus.ARCHIVED } });
  }

  async restore(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    return this.prisma.student.update({ where: { id: studentId }, data: { status: StudentStatus.ACTIVE } });
  }

  async currentEnrollment(studentId: string) {
    const year = await this.years.current();
    return this.prisma.studentEnrollment.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId: year.id } },
    });
  }

  async absenceHistory(studentId: string, academicYearId?: string) {
    const year = academicYearId ? await this.prisma.academicYear.findUnique({ where: { id: academicYearId } }) : await this.years.current();
    if (!year) throw new NotFoundException('Academic year not found');
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    const absences = await this.prisma.absence.findMany({
      where: { studentId, session: { academicYearId: year.id } },
      include: { session: { include: { classRoom: true } } },
    });
    absences.sort((a, b) => a.session.date.getTime() - b.session.date.getTime());
    return {
      student: { id: student.id, studentCode: student.studentCode, fullName: student.fullName },
      academicYear: year,
      totalAbsent: absences.length,
      dates: absences.map((a) => ({ date: a.session.date, classRoom: a.session.classRoom })),
    };
  }
}
