import { IsEmail, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
  @IsString() @MaxLength(120) nombre!: string;
  @IsOptional() @IsPhoneNumber('BO') telefono?: string;
}
