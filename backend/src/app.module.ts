import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { AttendanceModule } from './attendance/attendance.module';
import { UsersModule } from './users/users.module';
import { NfcModule } from './nfc/nfc.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AcademicYearsModule,
    ClassesModule,
    StudentsModule,
    AttendanceModule,
    UsersModule,
    NfcModule,
  ],
})
export class AppModule {}
