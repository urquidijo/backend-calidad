import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { EstudianteAdminController } from "./estudiante-admin.controller";
import { EstudianteAdminService } from "./estudiante-admin.service";

@Module({
  controllers: [EstudianteAdminController],
  providers: [EstudianteAdminService, PrismaService],
  exports: [EstudianteAdminService],
})
export class EstudianteAdminModule {}
