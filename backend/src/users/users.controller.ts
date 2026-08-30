import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UsersService } from './users.service';
import { AssignClassesDto, CreateUserDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto.name, dto.email, dto.password, dto.role === 'ADMIN' ? UserRole.ADMIN : UserRole.TEACHER); }
  @Get(':id/assignments') assignments(@Param('id') id: string) { return this.service.assignments(id); }
  @Put(':id/assignments') assign(@Param('id') id: string, @Body() dto: AssignClassesDto) { return this.service.setAssignments(id, dto.classRoomIds); }
  @Patch(':id/toggle-active') toggle(@Param('id') id: string) { return this.service.toggleActive(id); }
}
