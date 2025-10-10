import { IsNumber, IsOptional, IsEnum } from 'class-validator';
import { BusStatus } from '@prisma/client';

export class UpdateBusLocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lon!: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsEnum(BusStatus)
  status?: BusStatus; // EN_RUTA | EN_COLEGIO | NO_INICIADA
}
