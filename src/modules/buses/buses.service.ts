import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // ajusta la ruta si tu PrismaService está en otro lugar
import { UpdateBusLocationDto } from './dto/update-location.dto';
import { UpdateBusStatusDto } from './dto/update-status.dto';

@Injectable()
export class BusesService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async ensureBus(busId: number) {
    const exists = await this.prisma.bus.findUnique({ where: { id: busId } });
    if (!exists) throw new NotFoundException('Bus no encontrado');
  }
}
