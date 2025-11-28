import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsuarios,
      totalColegios,
      totalEstudiantes,
      totalBuses,
    ] = await this.prisma.$transaction([
      this.prisma.usuario.count(),                          // todos los usuarios
      this.prisma.colegio.count({ where: { activo: true } }),
      this.prisma.estudiante.count({ where: { activo: true } }),
      this.prisma.bus.count({ where: { activo: true } }),
    ]);

    return {
      totalUsuarios,
      totalColegios,
      totalEstudiantes,
      totalBuses,
    };
  }
}
