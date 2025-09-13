import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    const exists = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('El email ya está registrado');
    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.usuario.create({
      data: { rol: dto.rol, email: dto.email, hashPassword: hash, nombre: dto.nombre, telefono: dto.telefono },
      select: { id: true, rol: true, email: true, nombre: true, telefono: true, activo: true, createdAt: true },
    });
  }

  findAll() {
    return this.prisma.usuario.findMany({
      select: { id: true, rol: true, email: true, nombre: true, telefono: true, activo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, rol: true, email: true, nombre: true, telefono: true, activo: true, createdAt: true },
    });
  }

  update(id: number, dto: UpdateUsuarioDto) {
    const { ...data } = dto;
    return this.prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, rol: true, email: true, nombre: true, telefono: true, activo: true, createdAt: true },
    });
  }

  remove(id: number) {
    return this.prisma.usuario.delete({ where: { id } });
  }
}
