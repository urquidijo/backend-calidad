import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { LookupEstudianteDto } from './dto/lookup-estudiante.dto';

@Injectable()
export class EstudianteService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateEstudianteDto) {
    try {
      return await this.prisma.estudiante.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new BadRequestException('Código ya existe en ese colegio');
      throw e;
    }
  }
  async lookup(dto: LookupEstudianteDto) {
    if (!dto.codigo && !dto.ci) throw new BadRequestException('Envíe "codigo" o "ci"');
    const est = await this.prisma.estudiante.findFirst({
      where: {
        colegioId: dto.colegioId,
        ...(dto.codigo ? { codigo: dto.codigo } : {}),
        ...(dto.ci ? { ci: dto.ci } : {}),
        activo: true,
      },
      select: { id: true, nombre: true, colegioId: true, codigo: true, ci: true, curso: true, activo: true },
    });
    if (!est) throw new NotFoundException('No se encontró el estudiante en ese colegio');
    return { ok: true, estudiante: est };
  }
}
