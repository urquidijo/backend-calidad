import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusDto } from './dto/create-bus.dto';

@Injectable()
export class BusesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: number, dto: CreateBusDto) {
    const colegio = await this.prisma.colegio.findUnique({
      where: { id: schoolId },
    });
    if (!colegio) throw new NotFoundException('Colegio no encontrado');

    const exists = await this.prisma.bus.findFirst({
      where: { colegioId: schoolId, codigo: dto.codigo },
    });
    if (exists)
      throw new ConflictException(
        'Ya existe un bus con ese código en el colegio',
      );

    if (dto.conductorId) {
      const conductor = await this.prisma.usuario.findUnique({
        where: { id: dto.conductorId },
      });
      if (!conductor) throw new NotFoundException('Conductor no encontrado');
    }

    return this.prisma.bus.create({
      data: {
        colegioId: schoolId,
        codigo: dto.codigo,
        nombre: dto.nombre,
        placa: dto.placa,
        conductorId: dto.conductorId,
        activo: dto.activo ?? true,
      },
    });
  }

  async findAll(schoolId: number, activo?: boolean) {
    const colegio = await this.prisma.colegio.findUnique({
      where: { id: schoolId },
    });
    if (!colegio) throw new NotFoundException('Colegio no encontrado');

    return this.prisma.bus.findMany({
      where: {
        colegioId: schoolId,
        ...(typeof activo === 'boolean' ? { activo } : {}),
      },
      orderBy: { codigo: 'asc' },
      include: {
        conductor: { select: { id: true, nombre: true, telefono: true } },
      },
    });
  }

  // bus.service.ts
  // bus.service.ts
  async getRutaBus(busId: number) {
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: {
        conductor: true,
        colegio: true,
        estudiantes: {
          include: { estudiante: true },
        },
      },
    });

    if (!bus) throw new NotFoundException('Bus no encontrado');

    // Simulación: tomamos las casas de los estudiantes como ruta
    const route_coords = bus.estudiantes
      .map((e) => ({
        lat: e.estudiante.lat,
        lng: e.estudiante.lon,
        nombre: e.estudiante.nombre,
      }))
      .filter((p) => p.lat && p.lng);

    return {
      id: bus.id,
      codigo: bus.codigo,
      nombre: bus.nombre,
      placa: bus.placa,
      driver_name: bus.conductor?.nombre,
      driver_phone: bus.conductor?.telefono,
      colegioId: bus.colegioId,
      last_location: route_coords.length > 0 ? route_coords[0] : null,
      route_coords,
    };
  }
}
