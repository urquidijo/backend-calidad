// src/modules/estudiante/estudiante.module.ts
import { Module } from "@nestjs/common";
import { EstudianteController } from "./estudiante.controller";
import { EstudianteService } from "./estudiante.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [EstudianteController],
  providers: [EstudianteService, PrismaService],
  exports: [EstudianteService],
})
export class EstudianteModule {}
