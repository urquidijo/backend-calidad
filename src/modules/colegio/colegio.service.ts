import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateColegioDto } from "./dto/create-colegio.dto";
import { QueryColegioDto } from "./dto/query-colegio.dto";
import { Prisma, Colegio } from "@prisma/client";

@Injectable()
export class ColegiosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateColegioDto): Promise<Colegio> {
    return this.prisma.colegio.create({
      data: {
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim(),
        lat: dto.lat ?? undefined,
        lon: dto.lon ?? undefined,
        activo: dto.activo ?? true,
      },
    });
  }

  async list(
    q: QueryColegioDto
  ): Promise<{ items: Colegio[]; total: number; skip: number; take: number }> {
    const where: Prisma.ColegioWhereInput = {
      activo: true,
      ...(q.search
        ? {
            OR: [
              { nombre: { contains: q.search, mode: "insensitive" } },
              { direccion: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = q.skip ?? 0;
    const take = q.take ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.colegio.findMany({
        where,
        orderBy: { nombre: "asc" },
        skip,
        take,
      }),
      this.prisma.colegio.count({ where }),
    ]);

    return { items, total, skip, take };
  }

   async findOne(schoolId: number) {
    const s = await this.prisma.colegio.findUnique({
      where: { id: schoolId },
      select: { id: true, nombre: true, direccion: true, lat: true, lon: true },
    });
    if (!s) throw new NotFoundException("Colegio no encontrado");
    return s;
  }
}
