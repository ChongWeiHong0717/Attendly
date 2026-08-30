import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
@Module({ imports: [AcademicYearsModule], controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
