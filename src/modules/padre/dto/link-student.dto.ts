import { IsInt } from "class-validator";
import { Type } from "class-transformer";

export class LinkStudentDto {
  @Type(() => Number) @IsInt()
  schoolId!: number;

  @Type(() => Number) @IsInt()
  studentId!: number;
}
