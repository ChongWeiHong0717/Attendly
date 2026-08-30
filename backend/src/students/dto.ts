import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsString() studentCode?: string;
  @IsOptional() @IsString() icNumber?: string;
}

export class EnrollStudentDto { @IsString() classRoomId!: string; }
