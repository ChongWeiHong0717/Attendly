import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class AssignNfcCardDto {
  @IsString()
  studentId!: string;

  @IsString()
  @Matches(/^[0-9A-Fa-f]{8,32}$/)
  uid!: string;

  @IsOptional()
  @IsBoolean()
  allowTransfer?: boolean;
}

export class NfcCheckInDto {
  @IsString()
  @Matches(/^[0-9A-Fa-f]{8,32}$/)
  uid!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
