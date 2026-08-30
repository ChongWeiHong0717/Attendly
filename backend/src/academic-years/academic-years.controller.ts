import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AcademicYearsService } from './academic-years.service';
import { RolloverDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private service: AcademicYearsService) {}
  @Get('current') current() { return this.service.current(); }
  @Roles(UserRole.ADMIN) @Get() list() { return this.service.list(); }
  @Roles(UserRole.ADMIN) @Post('rollover') rollover(@Body() dto: RolloverDto) { return this.service.rollover(dto.name); }
}
