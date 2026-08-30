import { Module } from '@nestjs/common';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { NfcController } from './nfc.controller';
import { NfcService } from './nfc.service';

@Module({
  imports: [AcademicYearsModule],
  controllers: [NfcController],
  providers: [NfcService],
  exports: [NfcService],
})
export class NfcModule {}
