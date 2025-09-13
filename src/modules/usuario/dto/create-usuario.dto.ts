import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';

export class CreateUsuarioDto {
  @IsEnum(Rol) rol!: Rol;
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
  @IsString() @MaxLength(120) nombre!: string;
  @IsOptional() @IsPhoneNumber('BO') telefono?: string;
}
