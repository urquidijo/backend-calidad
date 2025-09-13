import { IsInt } from 'class-validator';
export class AddHijoDto {
  @IsInt() estudianteId!: number;
}
