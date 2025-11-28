import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PadreEstudianteAdminService } from "./padre-estudiante-admin.service";
import { PadreEstudianteAdminController } from "./padre-estudiante-admin.controller";

@Module({
  controllers: [PadreEstudianteAdminController],
  providers: [PadreEstudianteAdminService, PrismaService],
})
export class PadreEstudianteAdminModule {}
