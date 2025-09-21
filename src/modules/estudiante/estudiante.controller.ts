// src/modules/estudiante/estudiante.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { EstudianteService } from './estudiante.service';
import { VerifyStudentDto } from "./dto/verify-student.dto";


@Controller("colegios/:colegioId/estudiantes")
export class EstudianteController {
  constructor(private readonly svc: EstudianteService) {}

  @Get("verificar")
  async verificar(
    @Param("colegioId", ParseIntPipe) colegioId: number,
    @Query() q: VerifyStudentDto
  ) {
    if (!q.ci && !q.codigo) {
      throw new BadRequestException("Debes enviar ci o codigo");
    }
    const estudiante = await this.svc.verificarEstudiante(colegioId, q);
    return { estudiante }; // { estudiante: null } si no existe
  }

  @Get(":studentId/bus")
  async getBusForStudent(@Param("studentId", ParseIntPipe) studentId: number) {
    const bus = await this.svc.findBusByStudent(studentId);
    // devolvemos { bus } o { item }? La pantalla acepta varias formas — devolvemos { bus }
    return { bus };
  }
}
