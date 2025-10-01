// src/modules/estudiante/estudiante.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class EstudianteBusService {
  constructor(private readonly prisma: PrismaService) {}

  async findBusByStudent(studentId: number) {
    // Verificar estudiante existe
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: studentId },
      select: { id: true, nombre: true, colegioId: true },
    });
    if (!estudiante) throw new NotFoundException("Estudiante no encontrado");

    // Buscar asignación en EstudianteBus
    const asign = await this.prisma.estudianteBus.findFirst({
      where: { estudianteId: studentId },
      include: {
        bus: {
          include: {
            conductor: { select: { id: true, nombre: true, telefono: true } },
            colegio: { select: { id: true } },
            estudiantes: {
              include: { estudiante: { select: { id: true, nombre: true, lat: true, lon: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!asign) return null;

    const b = asign.bus;

    // Construir las paradas a partir de los estudiantes del bus
    const route_coords = b.estudiantes
      .map((eb) => ({
        lat: eb.estudiante.lat,
        lng: eb.estudiante.lon,
        nombre: eb.estudiante.nombre,
      }))
      .filter((p) => p.lat && p.lng);

    // Tomar la primera como "última ubicación" (simulación)
    const last_location = route_coords.length > 0 ? {
      lat: route_coords[0].lat,
      lng: route_coords[0].lng,
      timestamp: new Date().toISOString(),
    } : null;

    return {
      id: b.id,
      codigo: b.codigo,
      nombre: b.nombre,
      placa: b.placa,
      route_name: b.nombre ?? null,
      driver_name: b.conductor?.nombre ?? null,
      driver_phone: b.conductor?.telefono ?? null,
      status: null, // puedes extenderlo si tienes estado en DB
      last_location,
      colegioId: b.colegioId ?? (b.colegio?.id ?? null),
      route_coords,
    };
  }
}
