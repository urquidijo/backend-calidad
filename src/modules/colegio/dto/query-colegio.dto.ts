import { IsBooleanString, IsOptional, IsString } from "class-validator";

export class QueryColegioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  search?: string;

  // Boolean string: "true" | "false"
  @IsOptional()
  @IsBooleanString()
  activo?: string;
}
