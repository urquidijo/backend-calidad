// src/modules/estudiante/estudianteBus.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type Coord = { lat: number; lon: number };

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class EstudianteBusService {
  constructor(private readonly prisma: PrismaService) {}

  // 🔹 Inicia la ruta desde la primera parada
  async startRoute(busId: number) {
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: {
        estudiantes: {
          include: { estudiante: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!bus) throw new NotFoundException('Bus no encontrado');
    if (!bus.estudiantes.length) throw new NotFoundException('No hay estudiantes asignados');

    const firstStop = bus.estudiantes[0].estudiante;

    return this.prisma.bus.update({
      where: { id: busId },
      data: {
        status: 'EN_RUTA',
        lastLat: firstStop.lat,
        lastLon: firstStop.lon,
      },
    });
  }

  // 🔹 Finaliza ruta → llegó al colegio
  async endRoute(busId: number) {
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: { colegio: true },
    });
    if (!bus) throw new NotFoundException('Bus no encontrado');
    if (!bus.colegio?.lat || !bus.colegio?.lon) {
      throw new NotFoundException('Coordenadas de colegio no registradas');
    }

    return this.prisma.bus.update({
      where: { id: busId },
      data: {
        status: 'EN_COLEGIO',
        lastLat: bus.colegio.lat,
        lastLon: bus.colegio.lon,
      },
    });
  }

  // 🔹 Reinicia ruta (espera)
  async resetRoute(busId: number) {
    return this.prisma.bus.update({
      where: { id: busId },
      data: { status: 'FUERA_DE_SERVICIO', lastLat: null, lastLon: null },
    });
  }

  // 🔹 Update GPS (ejemplo si viene de móvil del conductor)
  async updateBusLocation(busId: number, dto: { lat: number; lon: number }) {
    return this.prisma.bus.update({
      where: { id: busId },
      data: {
        lastLat: dto.lat,
        lastLon: dto.lon,
        updatedAt: new Date(),
        busLocations: { create: { lat: dto.lat, lon: dto.lon } },
      },
    });
  }

  // 🔹 Obtener solo ubicación
  async getBusLocation(busId: number) {
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      select: { lastLat: true, lastLon: true, updatedAt: true, status: true },
    });
    if (!bus || !bus.lastLat || !bus.lastLon) return null;
    return { lat: bus.lastLat, lon: bus.lastLon, timestamp: bus.updatedAt, status: bus.status };
  }

  // 🔹 Obtener info bus asignado a estudiante (vista padre)
  async findBusByStudent(studentId: number) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: studentId },
      select: { id: true, nombre: true, colegioId: true },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    const asign = await this.prisma.estudianteBus.findFirst({
      where: { estudianteId: studentId },
      include: {
        bus: {
          include: {
            conductor: { select: { nombre: true, telefono: true } },
            colegio: true,
            estudiantes: { include: { estudiante: true } },
          },
        },
      },
    });
    if (!asign) return null;

    const b = asign.bus;

    const route_coords = b.estudiantes.map((eb) => ({
      id: eb.estudiante.id,
      nombre: eb.estudiante.nombre,
      lat: eb.estudiante.lat,
      lng: eb.estudiante.lon,
    }));

    const last_location = b.lastLat && b.lastLon ? { lat: b.lastLat, lng: b.lastLon } : null;

    // ETA
    let etaMinutes: number | null = null;
    const childStop = route_coords.find((r) => r.id === studentId);
    if (childStop && last_location) {
      const distance = haversineDistance(
        last_location.lat,
        last_location.lng,
        childStop.lat ?? 0,
        childStop.lng ?? 0,
      );
      const speed = 15000 / 3600; // 15 km/h
      etaMinutes = Math.max(1, Math.round(distance / speed / 60));
    }

    return {
      id: b.id,
      nombre: b.nombre,
      placa: b.placa,
      driver_name: b.conductor?.nombre ?? null,
      driver_phone: b.conductor?.telefono ?? null,
      status: b.status,
      last_location,
      route_coords,
      child_stop: childStop ?? null,
      etaMinutes,
      school_stop: b.colegio?.lat && b.colegio?.lon ? { lat: b.colegio.lat, lon: b.colegio.lon } : null,
    };
  }
}
