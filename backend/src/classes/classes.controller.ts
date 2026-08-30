import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private service: ClassesService) {}
  @Roles(UserRole.ADMIN) @Get() list() { return this.service.listActive(); }
  @Get('mine') mine(@CurrentUser() user: any) { return this.service.myClasses(user.id, user.role); }
  @Post() @Roles(UserRole.ADMIN) create(@Body() dto: CreateClassDto) { return this.service.create(dto.formLevel, dto.name); }
  @Delete(':id') @Roles(UserRole.ADMIN) archive(@Param('id') id: string) { return this.service.archive(id); }
  @Patch(':id/restore') @Roles(UserRole.ADMIN) restore(@Param('id') id: string) { return this.service.restore(id); }
}
