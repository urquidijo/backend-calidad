// src/modules/colegio/colegio.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateColegioDto } from "./dto/create-colegio.dto";
import { QueryColegioDto } from "./dto/query-colegio.dto";
import { UpdateColegioDto } from "./dto/update-colegio.dto";

@Injectable()
export class ColegiosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateColegioDto) {
    return this.prisma.colegio.create({
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion ?? null,
        lat: dto.lat ?? null,
        lon: dto.lon ?? null,
        activo: dto.activo ?? true,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lon: true,
        activo: true,
        createdAt: true,
      },
    });
  }

  async list(q: QueryColegioDto) {
    const { activo } = q;

    return this.prisma.colegio.findMany({
      where: {
        activo: typeof activo === "boolean" ? activo : undefined,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lon: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: number) {
    const school = await this.prisma.colegio.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lon: true,
        activo: true,
        createdAt: true,
      },
    });

    if (!school) throw new NotFoundException("Colegio no encontrado");
    return school;
  }

  async update(id: number, dto: UpdateColegioDto) {
    // opcional: validar que exista antes
    await this.findOne(id);

    return this.prisma.colegio.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion,
        lat: dto.lat,
        lon: dto.lon,
        activo: dto.activo,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lon: true,
        activo: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    // puedes soft-delete (activo=false) o delete real; te dejo delete real:
    return this.prisma.colegio.delete({
      where: { id },
      select: { id: true, nombre: true },
    });
  }
}
