import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
export class CreateClassDto {
  @IsInt() @Min(1) @Max(5) formLevel!: number;
  @IsString() @MinLength(1) name!: string;
}
