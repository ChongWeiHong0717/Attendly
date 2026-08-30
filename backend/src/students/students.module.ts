import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { ClassesModule } from '../classes/classes.module';
@Module({ imports: [AcademicYearsModule, ClassesModule], controllers: [StudentsController], providers: [StudentsService], exports: [StudentsService] })
export class StudentsModule {}
