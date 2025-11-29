import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PadreEstudianteAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const rows = await this.prisma.padreEstudiante.findMany({
      select: {
        padreId: true,
        estudianteId: true,
        createdAt: true,
        padre: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
        estudiante: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            colegio: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Lo dejamos ya “plano” para el frontend
    return rows.map((r) => ({
      padreId: r.padreId,
      padreNombre: r.padre.nombre,
      padreEmail: r.padre.email,
      padreRol: r.padre.rol,
      estudianteId: r.estudianteId,
      estudianteNombre: r.estudiante.nombre,
      estudianteCodigo: r.estudiante.codigo,
      colegioId: r.estudiante.colegio?.id ?? null,
      colegioNombre: r.estudiante.colegio?.nombre ?? null,
      vinculacionDesde: r.createdAt,
    }));
  }

  async unlink(padreId: number, estudianteId: number) {
    // Opcional: confirmar que existe antes de borrar
    const exists = await this.prisma.padreEstudiante.findUnique({
      where: {
        padreId_estudianteId: { padreId, estudianteId },
      },
    });

    if (!exists) {
      throw new NotFoundException("Relación padre–estudiante no encontrada");
    }

    await this.prisma.padreEstudiante.delete({
      where: {
        padreId_estudianteId: { padreId, estudianteId },
      },
    });

    return { ok: true };
  }
}
