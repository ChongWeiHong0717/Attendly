import { IsArray, IsIn, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StudentAttendanceDto {
  @IsString() studentId!: string;
  @IsIn(['PRESENT', 'ABSENT']) status!: 'PRESENT' | 'ABSENT';
}

export class SaveAttendanceDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => StudentAttendanceDto)
  statuses!: StudentAttendanceDto[];
}
