import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AssignNfcCardDto, NfcCheckInDto } from './dto';
import { NfcService } from './nfc.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nfc')
export class NfcController {
  constructor(private service: NfcService) {}

  @Post('check-in')
  checkIn(@Body() dto: NfcCheckInDto, @CurrentUser() user: any) {
    return this.service.checkIn(dto.uid, dto.date, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get('check-ins')
  checkIns(@Query('date') date: string) {
    return this.service.checkInSummary(date);
  }

  @Roles(UserRole.ADMIN)
  @Post('cards/assign')
  assign(@Body() dto: AssignNfcCardDto, @CurrentUser() user: any) {
    return this.service.assignCard(
      dto.studentId,
      dto.uid,
      user.id,
      dto.allowTransfer ?? false,
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('cards/student/:studentId')
  unassign(@Param('studentId') studentId: string) {
    return this.service.unassignStudent(studentId);
  }
}
