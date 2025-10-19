import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class StartSimDto {
  /** m/s (por defecto ~ 8 m/s ≈ 28.8 km/h) */
  @IsOptional() @IsNumber() minSpeed?: number;
  @IsOptional() @IsNumber() maxSpeed?: number;

  /** m/s^2 */
  @IsOptional() @IsNumber() accel?: number;
  @IsOptional() @IsNumber() decel?: number;

  /** m de anticipación de frenado */
  @IsOptional() @IsNumber() brakeDist?: number;

  /** segundos de parada */
  @IsOptional() @IsNumber() dwellCasa?: number;
  @IsOptional() @IsNumber() dwellColegio?: number;

  /** ms entre ticks de simulación (50–100ms recomendado) */
  @IsOptional() @IsNumber() tickMs?: number;

  /** si true, reordena NN desde la primera casa más cercana al punto inicial */
  @IsOptional() @IsBoolean() recomputeOrder?: boolean;
}
