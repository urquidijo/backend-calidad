// src/modules/colegio/dto/update-colegio.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateColegioDto } from "./create-colegio.dto";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateColegioDto extends PartialType(CreateColegioDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
