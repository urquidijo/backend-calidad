import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEstudianteDto {
  @IsInt() colegioId!: number;
  @IsString() @MaxLength(40) codigo!: string;
  @IsOptional() @IsString() @MaxLength(30) ci?: string;
  @IsString() @MaxLength(120) nombre!: string;
  @IsOptional() @IsString() @MaxLength(60) curso?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
