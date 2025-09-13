import { IsInt, IsOptional, IsString } from 'class-validator';
export class LookupEstudianteDto {
  @IsInt() colegioId!: number;
  @IsOptional() @IsString() codigo?: string;
  @IsOptional() @IsString() ci?: string;
}
