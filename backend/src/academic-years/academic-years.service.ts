import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}
  async current() {
    const year = await this.prisma.academicYear.findFirst({ where: { status: AcademicYearStatus.ACTIVE } });
    if (!year) throw new NotFoundException('No active academic year');
    return year;
  }
  list() { return this.prisma.academicYear.findMany({ orderBy: { name: 'desc' } }); }
  async rollover(name: string) {
    const current = await this.current();
    if (Number(name) <= Number(current.name)) throw new BadRequestException('New academic year must be later than the current year');
    const exists = await this.prisma.academicYear.findUnique({ where: { name } });
    if (exists) throw new BadRequestException('Academic year already exists');
    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.update({ where: { id: current.id }, data: { status: AcademicYearStatus.CLOSED } });
      return tx.academicYear.create({ data: { name, status: AcademicYearStatus.ACTIVE } });
    });
  }
}
