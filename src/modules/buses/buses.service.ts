import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBusDto } from "./dto/create-bus.dto";

@Injectable()
export class BusesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: number, dto: CreateBusDto) {
    const colegio = await this.prisma.colegio.findUnique({ where: { id: schoolId } });
    if (!colegio) throw new NotFoundException("Colegio no encontrado");

    const exists = await this.prisma.bus.findFirst({
      where: { colegioId: schoolId, codigo: dto.codigo },
    });
    if (exists) throw new ConflictException("Ya existe un bus con ese código en el colegio");

    if (dto.conductorId) {
      const conductor = await this.prisma.usuario.findUnique({ where: { id: dto.conductorId } });
      if (!conductor) throw new NotFoundException("Conductor no encontrado");
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
    const colegio = await this.prisma.colegio.findUnique({ where: { id: schoolId } });
    if (!colegio) throw new NotFoundException("Colegio no encontrado");

    return this.prisma.bus.findMany({
      where: {
        colegioId: schoolId,
        ...(typeof activo === "boolean" ? { activo } : {}),
      },
      orderBy: { codigo: "asc" },
      include: { conductor: { select: { id: true, nombre: true, telefono: true } } },
    });
  }
}
