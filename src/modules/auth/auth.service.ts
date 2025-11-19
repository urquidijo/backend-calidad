// src/modules/auth/auth.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    // normaliza email (mismo criterio que register)
    const e = email.trim().toLowerCase();

    const user = await this.prisma.usuario.findUnique({
      where: { email: e },
      select: {
        id: true,
        email: true,
        rol: true,
        nombre: true,
        activo: true,
        hashPassword: true, // 👈 ¡explícito!
      },
    });

    if (!user || !user.activo) return null;

    // protege contra hash faltante
    if (!user.hashPassword) return null;

    const ok = await bcrypt.compare(password, user.hashPassword);
    if (!ok) return null;

    // devuelve sin el hash
    const { hashPassword, ...safe } = user;
    return safe; 
  }

  sign(user: { id: number; email: string; rol: Rol }) {
    const payload = { sub: user.id, email: user.email, rol: user.rol };
    return this.jwt.sign(payload);
  }

  async register(dto: { email: string; password: string; nombre: string; telefono?: string }) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.usuario.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        rol: Rol.PADRE,
        email,
        hashPassword: hash,
        nombre: dto.nombre,
        telefono: dto.telefono,
      },
      select: { id: true, email: true, rol: true, nombre: true },
    });

    const access_token = this.sign({ id: user.id, email: user.email, rol: user.rol });
    return { access_token, user };
  }
}
