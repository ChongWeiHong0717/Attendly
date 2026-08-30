import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsIn(['ADMIN', 'TEACHER']) role?: 'ADMIN' | 'TEACHER';
}
export class AssignClassesDto { @IsArray() @IsString({ each: true }) classRoomIds!: string[]; }
