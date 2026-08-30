import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearsService } from '../academic-years/academic-years.service';

function normalizeUid(uid: string) {
  return uid.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

function asDbDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

@Injectable()
export class NfcService {
  constructor(
    private prisma: PrismaService,
    private years: AcademicYearsService,
  ) {}

  async assignCard(
    studentId: string,
    uidInput: string,
    assignedById: string,
    allowTransfer = false,
  ) {
    const uid = normalizeUid(uidInput);
    if (!/^[0-9A-F]{8,32}$/.test(uid)) {
      throw new BadRequestException('Invalid NFC UID');
    }

    const target = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { nfcCard: true },
    });

    if (!target || target.status !== StudentStatus.ACTIVE) {
      throw new NotFoundException('Active student not found');
    }

    const existingCard = await this.prisma.nfcCard.findUnique({
      where: { uid },
      include: {
        student: {
          select: { id: true, studentCode: true, fullName: true },
        },
      },
    });

    if (existingCard?.studentId === studentId) {
      return {
        status: 'already-assigned',
        uid,
        student: {
          id: target.id,
          studentCode: target.studentCode,
          fullName: target.fullName,
        },
        transferredFrom: null,
        replacedUid: null,
      };
    }

    if (
      existingCard?.studentId &&
      existingCard.studentId !== studentId &&
      !allowTransfer
    ) {
      throw new ConflictException({
        code: 'NFC_TRANSFER_REQUIRED',
        message: `This NFC card is currently assigned to ${existingCard.student?.studentCode} — ${existingCard.student?.fullName}.`,
        uid,
        currentOwner: existingCard.student,
        target: {
          id: target.id,
          studentCode: target.studentCode,
          fullName: target.fullName,
        },
        targetCurrentUid: target.nfcCard?.uid ?? null,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const targetCurrentCard = await tx.nfcCard.findUnique({
        where: { studentId },
      });

      let transferredFrom:
        | { id: string; studentCode: string; fullName: string }
        | null = null;
      let replacedUid: string | null = null;

      // If the target student already owns a different card, detach it first.
      if (targetCurrentCard && targetCurrentCard.uid !== uid) {
        replacedUid = targetCurrentCard.uid;
        await tx.nfcCardAssignment.updateMany({
          where: {
            cardId: targetCurrentCard.id,
            studentId,
            unassignedAt: null,
          },
          data: { unassignedAt: new Date() },
        });
        await tx.nfcCard.update({
          where: { id: targetCurrentCard.id },
          data: { studentId: null },
        });
      }

      let card = await tx.nfcCard.findUnique({
        where: { uid },
        include: {
          student: {
            select: { id: true, studentCode: true, fullName: true },
          },
        },
      });

      // If this UID belongs to somebody else, close that ownership first.
      if (card?.studentId && card.studentId !== studentId) {
        transferredFrom = card.student
          ? {
              id: card.student.id,
              studentCode: card.student.studentCode,
              fullName: card.student.fullName,
            }
          : null;

        await tx.nfcCardAssignment.updateMany({
          where: {
            cardId: card.id,
            studentId: card.studentId,
            unassignedAt: null,
          },
          data: { unassignedAt: new Date() },
        });

        card = await tx.nfcCard.update({
          where: { id: card.id },
          data: { studentId: null },
          include: {
            student: {
              select: { id: true, studentCode: true, fullName: true },
            },
          },
        });
      }

      if (!card) {
        card = await tx.nfcCard.create({
          data: { uid, studentId },
          include: {
            student: {
              select: { id: true, studentCode: true, fullName: true },
            },
          },
        });
      } else {
        card = await tx.nfcCard.update({
          where: { id: card.id },
          data: { studentId },
          include: {
            student: {
              select: { id: true, studentCode: true, fullName: true },
            },
          },
        });
      }

      await tx.nfcCardAssignment.create({
        data: {
          cardId: card.id,
          studentId,
          assignedById,
        },
      });

      return { card, transferredFrom, replacedUid };
    });

    return {
      status: result.transferredFrom ? 'transferred' : 'assigned',
      uid,
      student: {
        id: target.id,
        studentCode: target.studentCode,
        fullName: target.fullName,
      },
      transferredFrom: result.transferredFrom,
      replacedUid: result.replacedUid,
    };
  }

  async unassignStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { nfcCard: true },
    });

    if (!student) throw new NotFoundException('Student not found');
    if (!student.nfcCard) {
      return {
        status: 'already-unassigned',
        studentId,
        uid: null,
      };
    }

    const uid = student.nfcCard.uid;

    await this.prisma.$transaction(async (tx) => {
      await tx.nfcCardAssignment.updateMany({
        where: {
          cardId: student.nfcCard!.id,
          studentId,
          unassignedAt: null,
        },
        data: { unassignedAt: new Date() },
      });

      await tx.nfcCard.update({
        where: { id: student.nfcCard!.id },
        data: { studentId: null },
      });
    });

    return {
      status: 'unassigned',
      studentId,
      uid,
    };
  }

  async checkIn(uidInput: string, date: string, scannedById: string) {
    const uid = normalizeUid(uidInput);
    const card = await this.prisma.nfcCard.findUnique({
      where: { uid },
      include: {
        student: true,
      },
    });

    if (!card || !card.student) {
      return {
        status: 'unknown',
        uid,
        message: 'This NFC card is not assigned to a student.',
        checkedInAt: new Date().toISOString(),
      };
    }

    const student = card.student;
    if (student.status !== StudentStatus.ACTIVE) {
      return {
        status: 'error',
        uid,
        studentName: student.fullName,
        studentId: student.studentCode,
        message: 'This student is not active.',
        checkedInAt: new Date().toISOString(),
      };
    }

    const year = await this.years.current();
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: year.id,
        },
      },
      include: { classRoom: true },
    });

    const dbDate = asDbDate(date);
    const existing = await this.prisma.nfcCheckIn.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: dbDate,
        },
      },
      include: { classRoom: true },
    });

    if (existing) {
      return {
        status: 'duplicate',
        uid,
        studentName: student.fullName,
        studentId: student.studentCode,
        className: existing.classRoom
          ? `${existing.classRoom.formLevel} ${existing.classRoom.name}`
          : 'Unassigned',
        message: 'Student has already checked in for this date.',
        checkedInAt: existing.checkedInAt.toISOString(),
      };
    }

    try {
      const saved = await this.prisma.nfcCheckIn.create({
        data: {
          studentId: student.id,
          scannedById,
          academicYearId: year.id,
          classRoomId: enrollment?.classRoomId ?? null,
          uid,
          date: dbDate,
        },
      });

      return {
        status: 'success',
        uid,
        studentName: student.fullName,
        studentId: student.studentCode,
        className: enrollment
          ? `${enrollment.classRoom.formLevel} ${enrollment.classRoom.name}`
          : 'Unassigned',
        message: 'Check-in recorded successfully.',
        checkedInAt: saved.checkedInAt.toISOString(),
      };
    } catch (error) {
      // The unique(studentId, date) constraint is the final duplicate guard.
      // If two terminals somehow submit the same student at almost the same
      // moment, return the existing check-in rather than surfacing a 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.nfcCheckIn.findUnique({
          where: {
            studentId_date: {
              studentId: student.id,
              date: dbDate,
            },
          },
          include: { classRoom: true },
        });

        if (duplicate) {
          return {
            status: 'duplicate',
            uid,
            studentName: student.fullName,
            studentId: student.studentCode,
            className: duplicate.classRoom
              ? `${duplicate.classRoom.formLevel} ${duplicate.classRoom.name}`
              : 'Unassigned',
            message: 'Student has already checked in for this date.',
            checkedInAt: duplicate.checkedInAt.toISOString(),
          };
        }
      }

      throw error;
    }
  }

  async checkInSummary(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('Date must use YYYY-MM-DD format');
    }
    const year = await this.years.current();
    const dbDate = asDbDate(date);

    const [records, activeStudents, assignedCards] = await Promise.all([
      this.prisma.nfcCheckIn.findMany({
        where: { date: dbDate },
        include: {
          student: true,
          classRoom: true,
          academicYear: true,
          scannedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { checkedInAt: 'desc' },
      }),
      this.prisma.student.count({
        where: { status: StudentStatus.ACTIVE },
      }),
      this.prisma.nfcCard.count({
        where: {
          studentId: { not: null },
          student: { is: { status: StudentStatus.ACTIVE } },
        },
      }),
    ]);

    return {
      date,
      totalActiveStudents: activeStudents,
      assignedCardCount: assignedCards,
      checkedInCount: records.length,
      notCheckedInCount: Math.max(0, activeStudents - records.length),
      records: records.map((record) => ({
        id: record.id,
        uid: record.uid,
        checkedInAt: record.checkedInAt,
        academicYear: record.academicYear,
        student: {
          id: record.student.id,
          studentCode: record.student.studentCode,
          fullName: record.student.fullName,
        },
        classRoom: record.classRoom,
        scannedBy: record.scannedBy,
      })),
    };
  }
}
