// src/modules/estudiante/estudianteBus.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// Helper simple para calcular distancia (Haversine formula)
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3; // radio tierra en metros
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // en metros
}

type Coord = { id: number; nombre: string; lat: number; lng: number };

@Injectable()
export class EstudianteBusService {
  constructor(private readonly prisma: PrismaService) {}

  async updateBusLocation(
    busId: number,
    dto: { lat: number; lon: number; speedKph?: number; heading?: number },
  ) {
    const bus = await this.prisma.bus.update({
      where: { id: busId },
      data: {
        lastLat: dto.lat,
        lastLon: dto.lon,
        updatedAt: new Date(),
        status: 'EN_RUTA',
        busLocations: {
          create: {
            lat: dto.lat,
            lon: dto.lon,
            speedKph: dto.speedKph,
            heading: dto.heading,
          },
        },
      },
    });

    return bus;
  }

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
            conductor: { select: { id: true, nombre: true, telefono: true } },
            colegio: {
              select: { id: true, nombre: true, lat: true, lon: true },
            },
            estudiantes: {
              include: {
                estudiante: {
                  select: { id: true, nombre: true, lat: true, lon: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!asign) return null;

    const b = asign.bus;

    const route_coords: Coord[] = b.estudiantes
      .map((eb) => ({
        id: eb.estudiante.id,
        nombre: eb.estudiante.nombre,
        lat: eb.estudiante.lat,
        lng: eb.estudiante.lon,
      }))
      .filter(
        (p): p is Coord =>
          typeof p.lat === 'number' && typeof p.lng === 'number',
      );

    const last_location =
      b.lastLat && b.lastLon
        ? {
            lat: b.lastLat,
            lng: b.lastLon,
            timestamp: b.updatedAt.toISOString(),
          }
        : null;

    let etaMinutes: number | null = null;
    const childStop = route_coords.find((r) => r.id === studentId);
    if (childStop && last_location) {
      const distanceMeters = haversineDistance(
        last_location.lat,
        last_location.lng,
        childStop.lat,
        childStop.lng,
      );
      const avgSpeed = 15000 / 3600;
      const seconds = distanceMeters / avgSpeed;
      etaMinutes = Math.max(1, Math.round(seconds / 60));
    }

    return {
      id: b.id,
      codigo: b.codigo,
      nombre: b.nombre,
      placa: b.placa,
      route_name: b.nombre ?? null,
      driver_name: b.conductor?.nombre ?? null,
      driver_phone: b.conductor?.telefono ?? null,
      colegioId: b.colegioId ?? b.colegio?.id ?? null,
      status: b.status ?? 'EN_RUTA',
      last_location,
      route_coords,
      child_stop: childStop ?? null,
      school_stop:
        b.colegio?.lat && b.colegio?.lon
          ? {
              id: b.colegio.id,
              nombre: b.colegio.nombre,
              lat: b.colegio.lat,
              lng: b.colegio.lon,
            }
          : null,
      etaMinutes,
    };
  }

  async getBusLocation(busId: number) {
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      select: {
        id: true,
        lastLat: true,
        lastLon: true,
        updatedAt: true,
      },
    });

    if (!bus || !bus.lastLat || !bus.lastLon) {
      return null;
    }

    return {
      lat: bus.lastLat,
      lon: bus.lastLon,
      timestamp: bus.updatedAt.toISOString(),
    };
  }
}
