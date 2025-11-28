// dto/create-estudiante.dto.ts
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEstudianteDto {
  @IsInt()
  colegioId: number;

  @IsString()
  @MaxLength(100)
  codigo: string;

  @IsOptional()
  @IsString()
  ci?: string;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  curso?: string;

  @IsOptional()
  @IsNumber()
  homeLat?: number;

  @IsOptional()
  @IsNumber()
  homeLon?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
