// src/modules/buses/bus-simulator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BusSimulatorService {
  private readonly logger = new Logger(BusSimulatorService.name);
  private intervals: Record<number, NodeJS.Timeout> = {};

  constructor(private readonly prisma: PrismaService) {}

  // Iniciar simulación de movimiento para un bus
  async start(busId: number) {
    if (this.intervals[busId]) {
      this.logger.warn(`Simulación ya está corriendo para bus ${busId}`);
      return;
    }

    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: {
        estudiantes: {
          include: { estudiante: true },
          orderBy: { createdAt: 'asc' },
        },
        colegio: true,
      },
    });

    if (!bus) throw new Error(`Bus ${busId} no encontrado`);
    if (!bus.estudiantes.length)
      throw new Error('El bus no tiene estudiantes asignados');
    if (!bus.colegio?.lat || !bus.colegio?.lon)
      throw new Error(`El colegio del bus ${busId} no tiene coordenadas`);

    // 🔹 Ruta = paradas + colegio
    const route = [
      ...bus.estudiantes
        .filter((eb) => eb.estudiante.lat != null && eb.estudiante.lon != null)
        .map((eb) => ({ lat: eb.estudiante.lat!, lon: eb.estudiante.lon! })),
      { lat: bus.colegio.lat, lon: bus.colegio.lon },
    ];

    if (route.length < 2) {
      throw new Error(`Ruta inválida para el bus ${busId}`);
    }

    // Estado inicial EN_RUTA
    await this.prisma.bus.update({
      where: { id: busId },
      data: { status: 'EN_RUTA' },
    });

    let currentIndex = 0;
    let t = 0;
    const step = 0.05;

    this.intervals[busId] = setInterval(async () => {
      const start = route[currentIndex];
      const end = route[currentIndex + 1];

      t += step;
      if (t >= 1) {
        currentIndex++;
        t = 0;

        if (currentIndex >= route.length - 1) {
          this.stop(busId);
          await this.prisma.bus.update({
            where: { id: busId },
            data: { status: 'EN_COLEGIO' },
          });
          this.logger.log(`Bus ${busId} llegó al colegio 🚍🏫`);
          return;
        }
      }

      const lat = start.lat + (end.lat - start.lat) * t;
      const lon = start.lon + (end.lon - start.lon) * t;

      await this.prisma.bus.update({
        where: { id: busId },
        data: {
          lastLat: lat,
          lastLon: lon,
          busLocations: { create: { lat, lon } },
        },
      });

      this.logger.debug(`Bus ${busId} moviéndose: ${lat}, ${lon}`);
    }, 3000);
  }

  async stop(
    busId: number,
    newStatus: 'FUERA_DE_SERVICIO' | 'EN_COLEGIO' = 'FUERA_DE_SERVICIO',
  ) {
    if (this.intervals[busId]) {
      clearInterval(this.intervals[busId]);
      delete this.intervals[busId];
      this.logger.log(`Simulación detenida para bus ${busId}`);

      await this.prisma.bus.update({
        where: { id: busId },
        data: { status: newStatus },
      });
    }
  }
}
