import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
  // No permitimos actualizar password por este DTO
  password?: never;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Si quieres poder cambiar el colegio del usuario:
  @IsOptional()
  @IsInt()
  colegioId?: number;
}
