// estudiante-admin.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { EstudianteAdminService } from "./estudiante-admin.service";
import { CreateEstudianteDto } from "./dto/create-estudiante.dto";
import { UpdateEstudianteDto } from "./dto/update-estudiante.dto";

@Controller("estudiantes")
export class EstudianteAdminController {
  constructor(private readonly svc: EstudianteAdminService) {}

  @Post()
  create(@Body() dto: CreateEstudianteDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEstudianteDto
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
