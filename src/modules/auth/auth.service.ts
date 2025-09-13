import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.activo) return null;
    const ok = await bcrypt.compare(password, user.hashPassword);
    if (!ok) return null;
    return { id: user.id, email: user.email, rol: user.rol as Rol, nombre: user.nombre };
  }

  sign(user: { id: number; email: string; rol: Rol }) {
    const payload = { sub: user.id, email: user.email, rol: user.rol };
    return this.jwt.sign(payload);
  }
}
