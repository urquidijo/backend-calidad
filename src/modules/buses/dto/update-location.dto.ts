import { IsNumber, IsOptional } from "class-validator";

export class UpdateBusLocationDto {
  @IsNumber() lat: number;
  @IsNumber() lon: number;
  @IsOptional() @IsNumber() heading?: number;
}