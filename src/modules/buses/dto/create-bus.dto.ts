import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateBusDto {
  @IsString()
  codigo: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  conductorId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
