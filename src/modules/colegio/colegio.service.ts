import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateColegioDto } from './dto/create-colegio.dto';
import { UpdateColegioDto } from './dto/update-colegio.dto';

@Injectable()
export class ColegioService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateColegioDto) {
    return this.prisma.colegio.create({ data: dto });
  }
  findAll() {
    return this.prisma.colegio.findMany({ orderBy: { nombre: 'asc' } });
  }
  findOne(id: number) {
    return this.prisma.colegio.findUnique({ where: { id } });
  }
  update(id: number, dto: UpdateColegioDto) {
    return this.prisma.colegio.update({ where: { id }, data: dto });
  }
  remove(id: number) {
    return this.prisma.colegio.delete({ where: { id } });
  }
}
