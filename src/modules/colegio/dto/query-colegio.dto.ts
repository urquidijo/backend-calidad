import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class QueryColegioDto {
  @IsOptional() @IsString()
  search?: string;  // nombre o dirección

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number = 0;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number = 20;
}
