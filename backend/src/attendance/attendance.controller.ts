import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ClassesService } from '../classes/classes.service';
import { AttendanceService } from './attendance.service';
import { SaveAttendanceDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService, private classes: ClassesService) {}

  @Get('class/:classRoomId')
  async snapshot(@Param('classRoomId') classRoomId: string, @Query('date') date: string, @CurrentUser() user: any) {
    await this.classes.assertAccess(user.id, user.role, classRoomId);
    return this.service.snapshot(classRoomId, date);
  }

  @Post('class/:classRoomId')
  async save(@Param('classRoomId') classRoomId: string, @Body() dto: SaveAttendanceDto, @CurrentUser() user: any) {
    await this.classes.assertAccess(user.id, user.role, classRoomId);
    return this.service.save(classRoomId, user.id, dto.date, dto.statuses);
  }
}
