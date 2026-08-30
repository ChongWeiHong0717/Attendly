import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ClassesService } from '../classes/classes.service';
import { StudentsService } from './students.service';
import { CreateStudentDto, EnrollStudentDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private service: StudentsService, private classes: ClassesService) {}

  @Get()
  async list(@Query('classRoomId') classRoomId: string | undefined, @Query('search') search: string | undefined, @CurrentUser() user: any) {
    if (classRoomId) await this.classes.assertAccess(user.id, user.role, classRoomId);
    if (!classRoomId && user.role !== UserRole.ADMIN) return [];
    return this.service.list({ classRoomId, search });
  }

  @Post('class/:classRoomId')
  async createInClass(@Param('classRoomId') classRoomId: string, @Body() dto: CreateStudentDto, @CurrentUser() user: any) {
    await this.classes.assertAccess(user.id, user.role, classRoomId);
    return this.service.createInClass(classRoomId, dto.fullName, dto.studentCode, dto.icNumber);
  }

  @Roles(UserRole.ADMIN) @Post(':studentId/enroll')
  enroll(@Param('studentId') studentId: string, @Body() dto: EnrollStudentDto) { return this.service.enrollExisting(studentId, dto.classRoomId); }

  @Roles(UserRole.ADMIN) @Delete(':studentId')
  archive(@Param('studentId') studentId: string) { return this.service.archive(studentId); }

  @Roles(UserRole.ADMIN) @Patch(':studentId/restore')
  restore(@Param('studentId') studentId: string) { return this.service.restore(studentId); }

  @Get(':studentId/absences')
  async absences(@Param('studentId') studentId: string, @Query('academicYearId') academicYearId: string | undefined, @CurrentUser() user: any) {
    // Teachers may view absence history only for students in one of their currently assigned classes.
    if (user.role === UserRole.TEACHER) {
      const enrollment = await this.service.currentEnrollment(studentId);
      if (!enrollment) throw new ForbiddenException('Student is not in one of your current classes');
      await this.classes.assertAccess(user.id, user.role, enrollment.classRoomId);
    }
    return this.service.absenceHistory(studentId, academicYearId);
  }
}
