import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearsService } from '../academic-years/academic-years.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService, private years: AcademicYearsService) {}

  listActive() {
    return this.prisma.classRoom.findMany({ where: { isActive: true }, orderBy: [{ formLevel: 'asc' }, { name: 'asc' }] });
  }

  async myClasses(userId: string, role: UserRole) {
    const year = await this.years.current();
    if (role === UserRole.ADMIN) {
      const classes = await this.listActive();
      return { academicYear: year, classes };
    }
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { teacherId: userId, academicYearId: year.id, classRoom: { isActive: true } },
      include: { classRoom: true },
      orderBy: [{ classRoom: { formLevel: 'asc' } }, { classRoom: { name: 'asc' } }],
    });
    return { academicYear: year, classes: assignments.map((a) => a.classRoom) };
  }

  async assertAccess(userId: string, role: UserRole, classRoomId: string) {
    const cls = await this.prisma.classRoom.findUnique({ where: { id: classRoomId } });
    if (!cls || !cls.isActive) throw new NotFoundException('Class not found');
    if (role === UserRole.ADMIN) return cls;
    const year = await this.years.current();
    const assignment = await this.prisma.teacherClassAssignment.findUnique({
      where: { teacherId_academicYearId_classRoomId: { teacherId: userId, academicYearId: year.id, classRoomId } },
    });
    if (!assignment) throw new ForbiddenException('You are not assigned to this class');
    return cls;
  }

  async create(formLevel: number, name: string) {
    const cleanName = name.trim();
    if (!cleanName) throw new BadRequestException('Class name is required');
    const existing = await this.prisma.classRoom.findUnique({ where: { formLevel_name: { formLevel, name: cleanName } } });
    if (existing) {
      if (!existing.isActive) return this.prisma.classRoom.update({ where: { id: existing.id }, data: { isActive: true } });
      throw new BadRequestException('That class already exists');
    }
    return this.prisma.classRoom.create({ data: { formLevel, name: cleanName } });
  }

  async archive(id: string) {
    const cls = await this.prisma.classRoom.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.classRoom.update({ where: { id }, data: { isActive: false } });
  }

  async restore(id: string) {
    const cls = await this.prisma.classRoom.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.classRoom.update({ where: { id }, data: { isActive: true } });
  }
}
