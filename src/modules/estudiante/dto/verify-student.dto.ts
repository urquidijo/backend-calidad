// src/modules/estudiantes/dto/verify-student.dto.ts
import { IsOptional, IsString, MaxLength } from "class-validator";

export class VerifyStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ci?: string;          // CI del alumno

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo?: string;      // código interno del colegio (p.ej. CSM-001)
}
