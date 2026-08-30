import { IsString, Matches } from 'class-validator';
export class RolloverDto { @IsString() @Matches(/^\d{4}$/) name!: string; }
