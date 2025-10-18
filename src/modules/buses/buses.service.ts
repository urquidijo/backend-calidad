import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBusLocationDto } from './dto/update-location.dto';
import { UpdateBusStatusDto } from './dto/update-status.dto';
import { BusStatus } from '@prisma/client';

type LatLng = { lat: number; lon: number };

@Injectable()
export class BusesService {
  constructor(private readonly prisma: PrismaService) {}

  /* =================== Lecturas =================== */

  async getEstudiantes(busId: number) {
    await this.ensureBus(busId);
    const est = await this.prisma.estudianteBus.findMany({
      where: { busId },
      include: {
        estudiante: {
          select: { id: true, nombre: true, homeLat: true, homeLon: true },
        },
      },
    });
    // Solo devolver estudiantes con lat/lon válidos
    return est
      .map((e) => e.estudiante)
      .filter((s) => typeof s.homeLat === 'number' && typeof s.homeLon === 'number');
  }

  /**
   * Devuelve una "ruta" ordenada que pasa por los hogares de los estudiantes.
   * - direction: 'IDA' => casas -> colegio (colegio al final)
   *              'VUELTA' => colegio -> casas (colegio al inicio)
   * - includeSchool: si incluir nodo "Colegio" al inicio/fin (default true)
   */
  async getRutaFromHomes(
    busId: number,
    direction: 'IDA' | 'VUELTA' = 'IDA',
    includeSchool = true,
  ) {
    // 1) Bus + colegio
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: { colegio: true },
    });
    if (!bus) throw new NotFoundException('Bus no encontrado');

    const schoolLat = bus.colegio?.lat;
    const schoolLon = bus.colegio?.lon;
    if (typeof schoolLat !== 'number' || typeof schoolLon !== 'number') {
      throw new BadRequestException('El colegio no tiene coordenadas registradas');
    }
    const school: LatLng = { lat: schoolLat, lon: schoolLon };

    // 2) Casas de estudiantes asignados
    const estudiantes = await this.getEstudiantes(busId); // ya valida lat/lon
    if (estudiantes.length === 0) {
      throw new BadRequestException('No hay estudiantes con domicilio (homeLat/homeLon)');
    }

    const casas = estudiantes.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      lat: s.homeLat as number,
      lon: s.homeLon as number,
    }));

    // 3) Ordenar con nearest-neighbor
    const ordered =
      direction === 'VUELTA'
        ? nearestNeighborOrder(casas, school) // arranca cerca del colegio
        : nearestNeighborOrder(casas, null);  // arranca en la 1ra casa y encadena

    // 4) Componer salida
    type Waypoint = { tipo: 'CASA' | 'COLEGIO'; id?: number; nombre: string; lat: number; lon: number };
    let waypoints: Waypoint[];

    if (direction === 'IDA') {
      waypoints = ordered.map((c) => ({ tipo: 'CASA', id: c.id, nombre: c.nombre, lat: c.lat, lon: c.lon }));
      if (includeSchool) waypoints.push({ tipo: 'COLEGIO', nombre: 'Colegio', lat: school.lat, lon: school.lon });
    } else {
      waypoints = includeSchool
        ? [{ tipo: 'COLEGIO', nombre: 'Colegio', lat: school.lat, lon: school.lon }]
        : [];
      waypoints = waypoints.concat(
        ordered.map((c) => ({ tipo: 'CASA', id: c.id, nombre: c.nombre, lat: c.lat, lon: c.lon })),
      );
    }

    return {
      ok: true,
      direction,
      includeSchool,
      totalPuntos: waypoints.length,
      waypoints,
    };
  }

  async getLocation(busId: number) {
    await this.ensureBus(busId);
    const t = await this.prisma.telemetriaBus.findUnique({ where: { busId } });
    if (!t) return { location: null };
    return {
      location: {
        lat: t.lat,
        lon: t.lon,
        heading: t.heading,
        status: t.status,
        updatedAt: t.updatedAt,
      },
    };
  }

  /* =================== Escrituras =================== */

  async postLocation(busId: number, dto: UpdateBusLocationDto) {
    await this.ensureBus(busId);

    const up = await this.prisma.telemetriaBus.upsert({
      where: { busId },
      update: {
        lat: dto.lat,
        lon: dto.lon,
        heading: dto.heading,
        status: dto.status ?? undefined,
      },
      create: {
        busId,
        lat: dto.lat,
        lon: dto.lon,
        heading: dto.heading,
        status: dto.status ?? 'NO_INICIADA',
      },
    });

    await this.prisma.telemetriaBusLog.create({
      data: { busId, lat: dto.lat, lon: dto.lon, heading: dto.heading },
    });

    // Si usas sockets: io.to(`bus:${busId}`).emit('bus:location', {...})

    return { ok: true, location: up };
  }

  async postStatus(busId: number, dto: UpdateBusStatusDto) {
    await this.ensureBus(busId);

    // Buscar ubicación existente; si no hay, trata de setear algo razonable
    const current = await this.prisma.telemetriaBus.findUnique({ where: { busId } });

    let lat = current?.lat ?? 0;
    let lon = current?.lon ?? 0;

    if (!current) {
      // preferimos colegio
      const bus = await this.prisma.bus.findUnique({ where: { id: busId }, include: { colegio: true } });
      if (bus?.colegio?.lat != null && bus?.colegio?.lon != null) {
        lat = bus.colegio.lat;
        lon = bus.colegio.lon;
      } else {
        // o primera casa disponible
        const estudiantes = await this.getEstudiantes(busId);
        if (estudiantes.length) {
          lat = estudiantes[0].homeLat as number;
          lon = estudiantes[0].homeLon as number;
        }
      }
    }

    const up = await this.prisma.telemetriaBus.upsert({
      where: { busId },
      update: { status: dto.status },
      create: { busId, lat, lon, status: dto.status },
    });

    return { ok: true, status: up.status };
  }

  /* =================== Helpers internos =================== */

  private async ensureBus(busId: number) {
    const exists = await this.prisma.bus.findUnique({ where: { id: busId } });
    if (!exists) throw new NotFoundException('Bus no encontrado');
  }
}

/* =================== Utilidades =================== */

// Distancia haversine (m)
function haversine(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Heurística Nearest-Neighbor:
 * - Si `start` existe, el primer punto es el más cercano a `start`
 * - Luego encadena siempre con el más cercano al último elegido
 */
function nearestNeighborOrder(
  items: Array<{ id: number; nombre: string; lat: number; lon: number }>,
  start: LatLng | null,
) {
  const remaining = items.slice();
  const result: typeof items = [];

  let current: LatLng;
  if (start) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(start, remaining[i]);
      if (d < best) { best = d; idx = i; }
    }
    const first = remaining.splice(idx, 1)[0];
    result.push(first);
    current = { lat: first.lat, lon: first.lon };
  } else {
    const first = remaining.shift()!;
    result.push(first);
    current = { lat: first.lat, lon: first.lon };
  }

  while (remaining.length) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < best) { best = d; idx = i; }
    }
    const next = remaining.splice(idx, 1)[0];
    result.push(next);
    current = { lat: next.lat, lon: next.lon };
  }

  return result;
}
