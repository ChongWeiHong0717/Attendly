import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearsService } from '../academic-years/academic-years.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private years: AcademicYearsService) {}
  list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }
  async create(name: string, email: string, password: string, role: UserRole) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email already exists');
    return this.prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  }
  async assignments(userId: string) {
    const year = await this.years.current();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { teacherId: userId, academicYearId: year.id },
      include: { classRoom: true },
      orderBy: [{ classRoom: { formLevel: 'asc' } }, { classRoom: { name: 'asc' } }],
    });
    return { academicYear: year, classes: assignments.map((a) => a.classRoom) };
  }
  async setAssignments(userId: string, classRoomIds: string[]) {
    const year = await this.years.current();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.TEACHER) throw new BadRequestException('Class assignments can only be set for teachers');
    const uniqueIds = [...new Set(classRoomIds)];
    const validCount = await this.prisma.classRoom.count({ where: { id: { in: uniqueIds }, isActive: true } });
    if (validCount !== uniqueIds.length) throw new BadRequestException('One or more classes are invalid');
    await this.prisma.$transaction(async (tx) => {
      await tx.teacherClassAssignment.deleteMany({ where: { teacherId: userId, academicYearId: year.id } });
      if (uniqueIds.length) await tx.teacherClassAssignment.createMany({ data: uniqueIds.map((classRoomId) => ({ teacherId: userId, academicYearId: year.id, classRoomId })) });
    });
    return this.assignments(userId);
  }
  async toggleActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  }
}
