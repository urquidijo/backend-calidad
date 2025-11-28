// estudiante-admin.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateEstudianteDto } from "./dto/create-estudiante.dto";
import { UpdateEstudianteDto } from "./dto/update-estudiante.dto";

@Injectable()
export class EstudianteAdminService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateEstudianteDto) {
    return this.prisma.estudiante.create({
      data: dto,
      select: {
        id: true,
        colegioId: true,
        codigo: true,
        ci: true,
        nombre: true,
        curso: true,
        homeLat: true,
        homeLon: true,
        activo: true,
        createdAt: true,
      },
    });
  }

  findAll() {
    return this.prisma.estudiante.findMany({
      select: {
        id: true,
        colegioId: true,
        codigo: true,
        ci: true,
        nombre: true,
        curso: true,
        homeLat: true,
        homeLon: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  update(id: number, dto: UpdateEstudianteDto) {
    return this.prisma.estudiante.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        colegioId: true,
        codigo: true,
        ci: true,
        nombre: true,
        curso: true,
        homeLat: true,
        homeLon: true,
        activo: true,
        createdAt: true,
      },
    });
  }

  remove(id: number) {
    return this.prisma.estudiante.delete({
      where: { id },
      select: { id: true },
    });
  }
}
