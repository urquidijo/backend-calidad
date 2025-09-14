// src/modules/estudiante/estudiante.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { VerifyStudentDto } from "./dto/verify-student.dto";
import { Estudiante, Prisma } from "@prisma/client";

type EstudianteVerificado = Pick<Estudiante, "id" | "nombre" | "curso" | "colegioId">;

@Injectable()
export class EstudianteService {
  constructor(private readonly prisma: PrismaService) {}

  async verificarEstudiante(
    colegioId: number,
    q: VerifyStudentDto
  ): Promise<EstudianteVerificado | null> {
    const where: Prisma.EstudianteWhereInput = {
      colegioId,
      activo: true,
      ...(q.ci
        ? { ci: q.ci.trim() }
        : q.codigo
        ? { codigo: q.codigo.trim() }
        : {}),
    };

    const select: Prisma.EstudianteSelect = {
      id: true,
      nombre: true,
      curso: true,
      colegioId: true,
    };

    return this.prisma.estudiante.findFirst({ where, select });
  }
}
