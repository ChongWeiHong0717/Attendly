import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
@Module({ imports: [AcademicYearsModule], controllers: [ClassesController], providers: [ClassesService], exports: [ClassesService] })
export class ClassesModule {}
