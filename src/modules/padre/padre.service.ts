import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PadreService {
  constructor(private prisma: PrismaService) {}

  async addHijo(padreId: number, estudianteId: number) {
    const [padre, estudiante] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { id: padreId }, select: { id: true, rol: true, activo: true } }),
      this.prisma.estudiante.findUnique({ where: { id: estudianteId }, select: { id: true, activo: true } }),
    ]);
    if (!padre || !padre.activo) throw new NotFoundException('Padre no encontrado/activo');
    if (padre.rol !== 'PADRE') throw new BadRequestException('El usuario autenticado no es un PADRE');
    if (!estudiante || !estudiante.activo) throw new NotFoundException('Estudiante no encontrado/activo');

    await this.prisma.padreEstudiante.upsert({
      where: { padreId_estudianteId: { padreId, estudianteId } },
      update: {},
      create: { padreId, estudianteId },
    });
    return { ok: true, message: 'Hijo vinculado correctamente' };
  }

  async listHijos(padreId: number) {
    const vinculaciones = await this.prisma.padreEstudiante.findMany({
      where: { padreId },
      select: {
        createdAt: true,
        estudiante: {
          select: {
            id: true, nombre: true, codigo: true, ci: true, curso: true, activo: true,
            colegio: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return vinculaciones.map(v => ({ vinculadoDesde: v.createdAt, estudiante: v.estudiante }));
  }
}
