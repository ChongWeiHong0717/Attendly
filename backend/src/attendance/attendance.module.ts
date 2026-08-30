import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { ClassesModule } from '../classes/classes.module';
@Module({ imports: [AcademicYearsModule, ClassesModule], controllers: [AttendanceController], providers: [AttendanceService] })
export class AttendanceModule {}
