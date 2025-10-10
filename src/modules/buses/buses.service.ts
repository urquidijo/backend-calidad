import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBusLocationDto } from './dto/update-location.dto';
import { UpdateBusStatusDto } from './dto/update-status.dto';

type LatLng = { lat: number; lon: number };

@Injectable()
export class BusesService {
  constructor(private readonly prisma: PrismaService) {}

  /* =================== Lecturas básicas =================== */

  async getRuta(busId: number) {
    await this.ensureBus(busId);
    return this.prisma.parada.findMany({
      where: { busId, activa: true },
      orderBy: { orden: 'asc' },
    });
  }

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
    return est.map((e) => e.estudiante);
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

  /* =================== Escrituras básicas =================== */

  async postLocation(busId: number, dto: UpdateBusLocationDto) {
    await this.ensureBus(busId);

    const up = await this.prisma.telemetriaBus.upsert({
      where: { busId },
      update: {
        lat: dto.lat,
        lon: dto.lon,
        heading: dto.heading,
        status: dto.status,
      },
      create: {
        busId,
        lat: dto.lat,
        lon: dto.lon,
        heading: dto.heading,
        status: dto.status ?? 'NO_INICIADA',
      },
    });

    // histórico (opcional)
    await this.prisma.telemetriaBusLog.create({
      data: { busId, lat: dto.lat, lon: dto.lon, heading: dto.heading },
    });

    // si usas sockets, emite aquí: io.to(`bus:${busId}`).emit('bus:location', {...})

    return { ok: true, location: up };
  }

  async postStatus(busId: number, dto: UpdateBusStatusDto) {
    await this.ensureBus(busId);
    const up = await this.prisma.telemetriaBus.upsert({
      where: { busId },
      update: { status: dto.status },
      create: { busId, lat: 0, lon: 0, status: dto.status },
    });
    return { ok: true, status: up.status };
  }

  /* ============ Generar ruta desde casas de alumnos ============ */
  /**
   * Construye paradas a partir de las casas (homeLat/homeLon) de estudiantes asignados.
   * direction:
   *  - 'IDA'    => casas -> colegio (última parada es el colegio)
   *  - 'VUELTA' => colegio -> casas (primera parada es el colegio)
   */
  async generarRutaDesdeCasas(busId: number, direction: 'IDA' | 'VUELTA' = 'IDA') {
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
    const asignaciones = await this.prisma.estudianteBus.findMany({
      where: { busId },
      include: {
        estudiante: {
          select: { id: true, nombre: true, homeLat: true, homeLon: true },
        },
      },
    });

    const casas = asignaciones
      .map((a) => ({
        id: a.estudiante.id,
        nombre: a.estudiante.nombre,
        lat: a.estudiante.homeLat,
        lon: a.estudiante.homeLon,
      }))
      .filter(
        (c) => typeof c.lat === 'number' && typeof c.lon === 'number',
      ) as Array<{ id: number; nombre: string; lat: number; lon: number }>;

    if (casas.length === 0) {
      throw new BadRequestException(
        'No hay estudiantes con domicilio (homeLat/homeLon) para generar ruta',
      );
    }

    // 3) Ordenar con heuristic nearest-neighbor
    // - Para IDA: no hay "start" (arranca en la primera casa elegida y encadena por cercanía),
    //             luego se agrega el colegio al final.
    // - Para VUELTA: "start" es el colegio (elige la casa más cercana al colegio primero),
    //                luego encadena por cercanía.
    const ordered =
      direction === 'VUELTA'
        ? nearestNeighborOrder(casas, school)
        : nearestNeighborOrder(casas, null);

    // 4) Componer lista final con colegio al comienzo o al final
    const paradas: Array<{ nombre: string; lat: number; lon: number }> =
      direction === 'IDA'
        ? [
            ...ordered.map((c) => ({ nombre: c.nombre, lat: c.lat, lon: c.lon })),
            { nombre: 'Colegio', ...school },
          ]
        : [{ nombre: 'Colegio', ...school }].concat(
            ordered.map((c) => ({ nombre: c.nombre, lat: c.lat, lon: c.lon })),
          );

    // 5) Persistir: desactivar paradas previas y crear nuevas con orden
    await this.prisma.parada.updateMany({ where: { busId }, data: { activa: false } });

    for (let i = 0; i < paradas.length; i++) {
      const p = paradas[i];
      await this.prisma.parada.create({
        data: {
          busId,
          nombre: p.nombre,
          orden: i + 1,
          lat: p.lat,
          lon: p.lon,
          activa: true,
        },
      });
    }

    // 6) (Opcional) Colocar la telemetría en la primera parada de la nueva ruta
    const first = paradas[0];
    await this.prisma.telemetriaBus.upsert({
      where: { busId },
      update: { lat: first.lat, lon: first.lon },
      create: { busId, lat: first.lat, lon: first.lon, status: 'NO_INICIADA' },
    });

    return { ok: true, totalParadas: paradas.length, direction };
  }

  /* =================== Helpers internos =================== */

  private async ensureBus(busId: number) {
    const exists = await this.prisma.bus.findUnique({ where: { id: busId } });
    if (!exists) throw new NotFoundException('Bus no encontrado');
  }
}

/* =================== Funciones utilitarias =================== */

// Distancia haversine (metros)
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
 * - Si `start` existe, el primer punto es la casa más cercana a `start`;
 * - si no, inicia con el primer elemento y encadena por cercanía.
 */
function nearestNeighborOrder(
  items: Array<{ id: number; nombre: string; lat: number; lon: number }>,
  start: LatLng | null,
) {
  const remaining = items.slice();
  const result: typeof items = [];

  let current: LatLng;
  if (start) {
    let idx = 0,
      best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(start, remaining[i]);
      if (d < best) {
        best = d;
        idx = i;
      }
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
    let idx = 0,
      best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    const next = remaining.splice(idx, 1)[0];
    result.push(next);
    current = { lat: next.lat, lon: next.lon };
  }

  return result;
}
