import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateColegioDto {
  @IsString() @MaxLength(120) nombre!: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lon?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}