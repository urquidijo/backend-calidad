import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LinkStudentDto } from "./dto/link-student.dto";
import { Rol } from "@prisma/client";

@Injectable()
export class PadreService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista de hijos para el Home
  async listChildren(padreId: number) {
    const rels = await this.prisma.padreEstudiante.findMany({
      where: { padreId },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            curso: true,
            colegio: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = rels.map((r) => ({
      id: String(r.estudiante.id),
      nombre: r.estudiante.nombre,
      grado: r.estudiante.curso ?? null,
      colegio: r.estudiante.colegio.nombre,
    }));

    return { items, total: items.length };
  }

  // Vincular alumno ↔ padre autenticado
  async linkChild(padreId: number, dto: LinkStudentDto) {
    // 1) Validar usuario
    const padre = await this.prisma.usuario.findUnique({
      where: { id: padreId },
      select: { id: true, rol: true, activo: true },
    });
    if (!padre || !padre.activo) {
      throw new BadRequestException("Cuenta de usuario inválida");
    }
    if (padre.rol !== Rol.PADRE) {
      throw new BadRequestException("Solo usuarios PADRE pueden vincular alumnos");
    }

    // 2) Validar estudiante en ese colegio
    const estudiante = await this.prisma.estudiante.findFirst({
      where: { id: dto.studentId, colegioId: dto.schoolId, activo: true },
      select: { id: true, nombre: true, curso: true },
    });
    if (!estudiante) {
      throw new NotFoundException("Estudiante no encontrado en el colegio indicado");
    }

    // 3) Crear relación (PK compuesta evita duplicados)
    await this.prisma.padreEstudiante.create({
      data: { padreId, estudianteId: estudiante.id },
    });

    return {
      linked: true,
      student: {
        id: String(estudiante.id),
        nombre: estudiante.nombre,
        grado: estudiante.curso ?? null,
      },
    };
  }
}
