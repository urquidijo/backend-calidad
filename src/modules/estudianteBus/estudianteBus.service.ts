// src/modules/estudianteBus/estudiante.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EstudianteBusService {
  constructor(private readonly prisma: PrismaService) {}

  async findBusByStudent(studentId: number) {
    // Verificar estudiante existe (opcional but safe)
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: studentId },
      select: { id: true, nombre: true, colegioId: true },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    // Buscar asignación en EstudianteBus (tomamos el primero si hay varios)
    const asign = await this.prisma.estudianteBus.findFirst({
      where: { estudianteId: studentId },
      include: {
        bus: {
          include: {
            conductor: { select: { id: true, nombre: true, telefono: true } },
            colegio: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // preferir la asignación más reciente
    });

    if (!asign) return null;

    const b = asign.bus;
    // Normalizar la respuesta para el frontend
    return {
      id: b.id,
      codigo: b.codigo,
      nombre: b.nombre,
      placa: b.placa,
      // campos opcionales para compatibilidad con TrackChildScreen
      route_name: b.nombre ?? null,
      driver_name: b.conductor?.nombre ?? null,
      driver_phone: b.conductor?.telefono ?? null,
      status: null, // si tienes tabla de estado, puedes mapear aquí
      last_location: null, // si tienes tabla de locations -> incluir aquí
      colegioId: b.colegioId ?? b.colegio?.id ?? null,
    };
  }
}
