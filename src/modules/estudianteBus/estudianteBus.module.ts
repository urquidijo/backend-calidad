// src/modules/estudiante/estudiante.module.ts
import { Module } from "@nestjs/common";
import { EstudianteBusController } from "./estudianteBus.controller";
import { EstudianteBusService } from "./estudianteBus.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [EstudianteBusController],
  providers: [EstudianteBusService, PrismaService],
  exports: [EstudianteBusService],
})
export class EstudianteBusModule {}
